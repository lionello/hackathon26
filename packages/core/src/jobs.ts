import { getPool } from "./db.js";

export async function enqueueWarmUserJob(userId: string): Promise<void> {
  await getPool().query(
    "insert into worker_jobs(kind, user_id, payload) values ('warm-user', $1, '{}'::jsonb)",
    [userId]
  );
  await getPool().query("select pg_notify('worker_jobs', $1)", [userId]);
}
