import {
  findMatches,
  getPool,
  notifyUser,
  purgeExpiredCache,
  sendDealDigest,
  type DealMatch,
  type SearchContext,
  type UserRow,
  type WatchItem
} from "@flyer-watch/core";
import type { PoolClient } from "pg";

const workerId = `worker-${process.pid}`;
const sweepHours = Number(process.env.WORKER_SWEEP_HOURS ?? "6");

function log(level: "info" | "warn" | "error", msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, worker: workerId, msg, ...fields });
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

async function main(): Promise<void> {
  const listener = await getPool().connect();
  await listener.query("listen worker_jobs");
  listener.on("notification", (notification) => {
    log("info", "notify_received", { channel: notification.channel, payload: notification.payload });
    void drainJobs().catch((error) => log("error", "drain_failed", { error: errorMessage(error) }));
  });

  log("info", "worker_starting", { sweepHours });
  await drainJobs();
  setInterval(() => {
    void sweep().catch((error) => log("error", "sweep_failed", { error: errorMessage(error) }));
  }, sweepHours * 60 * 60 * 1000).unref();

  log("info", "worker_ready");
}

async function sweep(): Promise<void> {
  const started = Date.now();
  const result = await getPool().query(
    `insert into worker_jobs(kind, user_id, payload)
     select 'warm-user', u.id, '{}'::jsonb
     from users u
     where exists (select 1 from watch_items w where w.user_id = u.id)`
  );
  log("info", "sweep_enqueued", { jobs: result.rowCount ?? 0, durationMs: Date.now() - started });
  await drainJobs();
}

async function drainJobs(): Promise<void> {
  let processed = 0;
  while (true) {
    const job = await getPool().query<{ id: string; kind: string; user_id: string | null; attempts: number }>(
      `update worker_jobs
       set status = 'running', locked_at = now(), locked_by = $1, attempts = attempts + 1, updated_at = now()
       where id = (
         select id from worker_jobs
         where status = 'pending' and run_after <= now()
         order by created_at
         for update skip locked
         limit 1
       )
       returning id, kind, user_id, attempts`,
      [workerId]
    );
    const row = job.rows[0];
    if (!row) {
      if (processed > 0) log("info", "drain_done", { processed });
      return;
    }
    const jobStarted = Date.now();
    log("info", "job_claim", { jobId: row.id, kind: row.kind, userId: row.user_id, attempt: row.attempts });
    try {
      if (row.kind === "warm-user" && row.user_id) {
        await warmUser(row.user_id);
      } else {
        log("warn", "job_unknown_kind", { jobId: row.id, kind: row.kind });
      }
      await getPool().query("update worker_jobs set status = 'done', last_error = null, finished_at = now(), updated_at = now() where id = $1", [row.id]);
      log("info", "job_done", { jobId: row.id, kind: row.kind, userId: row.user_id, durationMs: Date.now() - jobStarted });
    } catch (error) {
      const message = errorMessage(error);
      const willRetry = row.attempts < 5;
      log("error", "job_failed", {
        jobId: row.id,
        kind: row.kind,
        userId: row.user_id,
        attempt: row.attempts,
        willRetry,
        durationMs: Date.now() - jobStarted,
        error: message
      });
      await getPool().query(
        `update worker_jobs
         set status = case when attempts >= 5 then 'failed' else 'pending' end,
             run_after = now() + interval '5 minutes',
             last_error = $2,
             updated_at = now()
         where id = $1`,
        [row.id, message]
      );
      if (row.user_id) await notifyUser(row.user_id);
    }
    processed += 1;
  }
}

async function warmUser(userId: string): Promise<void> {
  const cacheStart = Date.now();
  await getPool().connect().then(async (client) => {
    try {
      await purgeExpiredCache(client);
    } finally {
      client.release();
    }
  });
  log("info", "warm_cache_purged", { userId, durationMs: Date.now() - cacheStart });

  const user = await loadUser(userId);
  if (!user) {
    log("warn", "warm_user_missing", { userId });
    return;
  }

  const watchItems = await loadWatchItems(userId);
  const ctx = await loadSearchContext(userId, user.postal_code);
  log("info", "warm_user_loaded", {
    userId,
    watchItems: watchItems.length,
    postalCode: user.postal_code,
    storeSources: Object.keys(ctx.storeIds)
  });

  if (watchItems.length === 0) {
    log("info", "warm_user_skipped_no_items", { userId });
    await notifyUser(userId);
    return;
  }

  const matchesStart = Date.now();
  const matches = await findMatches(watchItems, ctx, { cacheOnly: false });
  log("info", "warm_matches_found", { userId, matches: matches.length, durationMs: Date.now() - matchesStart });

  const netNew = await markUnsent(userId, matches);
  log("info", "warm_net_new", { userId, netNew: netNew.length });

  if (netNew.length > 0) {
    const digestStart = Date.now();
    await sendDealDigest(user, netNew);
    log("info", "warm_digest_sent", { userId, items: netNew.length, durationMs: Date.now() - digestStart });
  }

  await notifyUser(userId);
}

async function loadUser(userId: string): Promise<UserRow | null> {
  const result = await getPool().query<UserRow>("select * from users where id = $1", [userId]);
  return result.rows[0] ?? null;
}

async function loadWatchItems(userId: string): Promise<WatchItem[]> {
  const result = await getPool().query<WatchItem>("select * from watch_items where user_id = $1 order by created_at", [userId]);
  return result.rows;
}

async function loadSearchContext(userId: string, postalCode: string): Promise<SearchContext> {
  const result = await getPool().query<{ source: string; store_id: string }>("select source, store_id from user_stores where user_id = $1", [userId]);
  return {
    postalCode,
    storeIds: result.rows.reduce<SearchContext["storeIds"]>((acc, row) => {
      const source = row.source as keyof SearchContext["storeIds"];
      acc[source] = [...(acc[source] ?? []), row.store_id];
      return acc;
    }, {})
  };
}

async function markUnsent(userId: string, matches: DealMatch[]): Promise<DealMatch[]> {
  const client = await getPool().connect();
  try {
    const netNew: DealMatch[] = [];
    await client.query("begin");
    for (const match of matches) {
      const inserted = await insertNotification(client, userId, match);
      if (inserted) netNew.push(match);
    }
    await client.query("commit");
    return netNew;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function insertNotification(client: PoolClient, userId: string, match: DealMatch): Promise<boolean> {
  const result = await client.query(
    `insert into notifications_sent(user_id, watch_item_id, source, source_item_id)
     values ($1, $2, $3, $4)
     on conflict do nothing`,
    [userId, match.watchItem.id, match.item.source, match.item.source_item_id]
  );
  return (result.rowCount ?? 0) > 0;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return String(error).slice(0, 500);
}

process.on("SIGTERM", () => {
  log("info", "worker_sigterm");
  void getPool().end().finally(() => process.exit(0));
});

await main();
