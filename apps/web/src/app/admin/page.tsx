import { getPool, getUserJobStatus } from "@flyer-watch/core";
import { triggerFetchForCurrentUser } from "../actions";
import { requireSession } from "../session";

export const dynamic = "force-dynamic";

type JobRow = {
  id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  run_after: Date;
  updated_at: Date;
  created_at: Date;
};

export default async function AdminPage() {
  const session = await requireSession();
  const jobStatus = await getUserJobStatus(session.userId);
  const jobs = await loadRecentJobs(session.userId);

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <div className="brand">Flyer Ping</div>
          <div className="muted">Admin debugging</div>
        </div>
        <div className="topbar-actions">
          <a className="button button-ghost" href="/">Dashboard</a>
          <a className="button secondary" href="/settings">Settings</a>
        </div>
      </div>

      <div className="grid">
        <section className="panel stack">
          <h2>Queue Nudge</h2>
          <p className="muted settings-intro">
            Enqueue a warm-up fetch for your account. The worker will pick it up through the existing job queue.
          </p>
          <form action={triggerFetchForCurrentUser}>
            <button className="button" type="submit">Trigger fetch</button>
          </form>
        </section>

        <aside className="panel settings-aside">
          <h2>Status</h2>
          <dl className="settings-meta">
            <div>
              <dt className="muted">Pending or running</dt>
              <dd>{jobStatus.pending ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="muted">Last error</dt>
              <dd>{jobStatus.lastError ? jobStatus.lastError.message : "None"}</dd>
            </div>
            {jobStatus.lastError ? (
              <div>
                <dt className="muted">Error time</dt>
                <dd>{jobStatus.lastError.at.toLocaleString()}</dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </div>

      <section className="panel stack admin-jobs">
        <h2>Recent Warm-Up Jobs</h2>
        {jobs.length === 0 ? (
          <p className="muted">No jobs found for this account.</p>
        ) : (
          <table className="compact-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Attempts</th>
                <th>Run after</th>
                <th>Updated</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.status}</td>
                  <td>{job.attempts}</td>
                  <td>{job.run_after.toLocaleString()}</td>
                  <td>{job.updated_at.toLocaleString()}</td>
                  <td>{job.last_error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

async function loadRecentJobs(userId: string): Promise<JobRow[]> {
  const result = await getPool().query<JobRow>(
    `select id, status, attempts, last_error, run_after, updated_at, created_at
     from worker_jobs
     where user_id = $1 and kind = 'warm-user'
     order by updated_at desc
     limit 10`,
    [userId]
  );
  return result.rows;
}
