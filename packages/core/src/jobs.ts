import { getPool } from "./db.js";

export async function enqueueWarmUserJob(userId: string): Promise<void> {
  await getPool().query(
    "insert into worker_jobs(kind, user_id, payload) values ('warm-user', $1, '{}'::jsonb)",
    [userId]
  );
  await getPool().query("select pg_notify('worker_jobs', $1)", [userId]);
}

export interface UserJobStatus {
  pending: boolean;
  lastError: { message: string; at: Date } | null;
}

export async function getUserJobStatus(userId: string): Promise<UserJobStatus> {
  const result = await getPool().query<{ status: string; last_error: string | null; updated_at: Date }>(
    `select status, last_error, updated_at
     from worker_jobs
     where user_id = $1 and kind = 'warm-user'
     order by updated_at desc
     limit 10`,
    [userId]
  );
  const pending = result.rows.some((row) => row.status === "pending" || row.status === "running");
  const lastFailure = result.rows.find((row) => row.status === "failed" && row.last_error);
  return {
    pending,
    lastError: lastFailure ? { message: lastFailure.last_error!, at: lastFailure.updated_at } : null
  };
}
