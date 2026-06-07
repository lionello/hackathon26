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

interface JobStatusRow {
  status: string;
  last_error: string | null;
  updated_at: Date;
}

export async function getUserJobStatus(userId: string): Promise<UserJobStatus> {
  const result = await getPool().query<JobStatusRow>(
    `select status, last_error, updated_at
     from worker_jobs
     where user_id = $1 and kind = 'warm-user'
     order by updated_at desc
     limit 10`,
    [userId]
  );
  return summarizeUserJobStatus(result.rows);
}

export function summarizeUserJobStatus(rows: JobStatusRow[]): UserJobStatus {
  const pending = rows.some((row) => row.status === "pending" || row.status === "running");
  const lastFailure = rows.find((row) => row.status === "failed" && row.last_error);
  const newerSuccess = lastFailure
    ? rows.some((row) => row.status === "done" && row.updated_at > lastFailure.updated_at)
    : false;
  return {
    pending,
    lastError: lastFailure && !newerSuccess ? { message: lastFailure.last_error!, at: lastFailure.updated_at } : null
  };
}
