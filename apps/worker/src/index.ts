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

async function main(): Promise<void> {
  const listener = await getPool().connect();
  await listener.query("listen worker_jobs");
  listener.on("notification", () => {
    void drainJobs().catch((error) => console.error("job drain failed", error));
  });

  await drainJobs();
  setInterval(() => {
    void sweep().catch((error) => console.error("sweep failed", error));
  }, sweepHours * 60 * 60 * 1000).unref();

  console.log(`Flyer worker listening as ${workerId}`);
}

async function sweep(): Promise<void> {
  await getPool().query(
    `insert into worker_jobs(kind, user_id, payload)
     select 'warm-user', u.id, '{}'::jsonb
     from users u
     where exists (select 1 from watch_items w where w.user_id = u.id)`
  );
  await drainJobs();
}

async function drainJobs(): Promise<void> {
  while (true) {
    const job = await getPool().query<{ id: string; kind: string; user_id: string | null }>(
      `update worker_jobs
       set status = 'running', locked_at = now(), locked_by = $1, attempts = attempts + 1, updated_at = now()
       where id = (
         select id from worker_jobs
         where status = 'pending' and run_after <= now()
         order by created_at
         for update skip locked
         limit 1
       )
       returning id, kind, user_id`,
      [workerId]
    );
    const row = job.rows[0];
    if (!row) return;
    try {
      if (row.kind === "warm-user" && row.user_id) {
        await warmUser(row.user_id);
      }
      await getPool().query("update worker_jobs set status = 'done', last_error = null, finished_at = now(), updated_at = now() where id = $1", [row.id]);
    } catch (error) {
      console.error("job failed", row.id, error);
      await getPool().query(
        `update worker_jobs
         set status = case when attempts >= 5 then 'failed' else 'pending' end,
             run_after = now() + interval '5 minutes',
             last_error = $2,
             updated_at = now()
         where id = $1`,
        [row.id, errorMessage(error)]
      );
      if (row.user_id) await notifyUser(row.user_id);
    }
  }
}

async function warmUser(userId: string): Promise<void> {
  await getPool().connect().then(async (client) => {
    try {
      await purgeExpiredCache(client);
    } finally {
      client.release();
    }
  });
  const user = await loadUser(userId);
  if (!user) return;
  const watchItems = await loadWatchItems(userId);
  const ctx = await loadSearchContext(userId, user.postal_code);
  const matches = await findMatches(watchItems, ctx, { cacheOnly: false });
  const netNew = await markUnsent(userId, matches);
  await sendDealDigest(user, netNew);
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
  void getPool().end().finally(() => process.exit(0));
});

await main();
