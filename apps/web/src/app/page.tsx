import { findMatches, getPool, getUserJobStatus, type SearchContext, type WatchItem } from "@flyer-watch/core";
import { addWatchItem, removeWatchItem, updateWatchItem } from "./actions";
import { getSession } from "./session";
import { Landing } from "./components/landing";
import { SubmitOnEnterInput } from "./components/submit-on-enter-input";
import { ValidRange } from "./components/valid-range";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    return <Landing />;
  }

  const user = await loadUser(session.userId);
  const watchItems = await loadWatchItems(session.userId);
  const ctx = await loadSearchContext(session.userId, user?.postal_code ?? "V6B 1A1");
  const matches = await findMatches(watchItems, ctx, { cacheOnly: true });
  const matchesByWatchItem = groupMatchesByWatchItem(matches);
  const jobStatus = await getUserJobStatus(session.userId);

  const availableDeals = matches.filter(({ item }) => item.price !== null);
  const storeCount = new Set(matches.map(({ item }) => item.store)).size;
  const queriesWithDeals = watchItems.filter((watchItem) =>
    (matchesByWatchItem.get(watchItem.id) ?? []).some(({ item }) => item.price !== null)
  ).length;

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <div className="brand">Flyer Ping</div>
          <div className="muted">Signed in as {user?.email ?? session.consentkeysSub}</div>
        </div>
        <div className="topbar-actions">
          <a className="button button-ghost" href="/settings">Settings</a>
          <a className="button secondary" href="/auth/logout">Sign out</a>
        </div>
      </div>

      <EventRefresher />

      {jobStatus.lastError ? (
        <div className="error-banner" role="alert">
          <div className="error-banner-title">
            Last flyer fetch failed · {jobStatus.lastError.at.toLocaleString()}
          </div>
          <div>
            {jobStatus.pending
              ? "A new fetch is queued — results will refresh automatically when it succeeds."
              : "The next sweep will retry. You can also save another query to re-queue."}
          </div>
          <pre>{jobStatus.lastError.message}</pre>
        </div>
      ) : null}

      <section className="stat-row">
        <div className="stat-card">
          <span className="stat-value">{watchItems.length}</span>
          <span className="stat-label">Watched items</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{availableDeals.length}</span>
          <span className="stat-label">Live deals cached</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{storeCount}</span>
          <span className="stat-label">Stores with matches</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{queriesWithDeals}</span>
          <span className="stat-label">Queries with deals</span>
        </div>
      </section>

      <div className="grid">
        <aside className="stack">
          <section className="panel">
            <h2>Add Watch</h2>
            <form className="stack" action={addWatchItem}>
              <label>Item <SubmitOnEnterInput name="query" placeholder="milk, tofu, chicken" /></label>
              <button className="button" type="submit">Watch item</button>
            </form>
          </section>

          <section className="panel panel-soft">
            <h2>Store defaults</h2>
            <p className="muted">
              Postal code <strong>{user?.postal_code ?? "V6B 1A1"}</strong> · Whole Foods{" "}
              <strong>{ctx.storeIds.wholefoods?.[0] ?? "10244"}</strong>
            </p>
            <a className="button button-ghost" href="/settings">Edit in settings</a>
          </section>
        </aside>

        <section className="panel">
          <h2>Watched Queries</h2>
          <div className="watch-list">
            {watchItems.length === 0 ? <p className="muted">No watched items yet.</p> : null}
            {watchItems.map((watchItem) => {
              const queryMatches = matchesByWatchItem.get(watchItem.id) ?? [];
              return (
                <article className="watch-card" key={watchItem.id}>
                  <div className="watch-head">
                    <form className="query-form" action={updateWatchItem}>
                      <input type="hidden" name="id" value={watchItem.id} />
                      <label>
                        Query
                        <SubmitOnEnterInput name="query" defaultValue={watchItem.query} />
                      </label>
                      <button className="button secondary" type="submit">Save</button>
                    </form>
                    <form action={removeWatchItem}>
                      <input type="hidden" name="id" value={watchItem.id} />
                      <button className="icon-button danger" type="submit" aria-label={`Remove ${watchItem.query}`}>
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M6 6l1 18h10l1-18" />
                          <path d="M10 11v8" />
                          <path d="M14 11v8" />
                        </svg>
                      </button>
                    </form>
                  </div>

                  <div className="query-results">
                    <div className="result-count">
                      {queryMatches.length} cached result{queryMatches.length === 1 ? "" : "s"}
                      {jobStatus.pending ? <span className="status-pill warming">Fetching…</span> : null}
                      {!jobStatus.pending && jobStatus.lastError ? <span className="status-pill error">Last fetch failed</span> : null}
                    </div>
                    {queryMatches.length === 0 ? (
                      <p className="muted">{emptyStateCopy(jobStatus)}</p>
                    ) : (
                      <table className="compact-table">
                        <thead>
                          <tr><th>Store</th><th>Item</th><th>Price</th><th>Valid</th></tr>
                        </thead>
                        <tbody>
                          {queryMatches.map(({ item }) => (
                            <tr key={`${watchItem.id}:${item.source}:${item.source_item_id}`}>
                              <td>{item.store}</td>
                              <td>{item.url ? <a href={item.url}>{item.name}</a> : item.name}</td>
                              <td className="price">{item.price === null ? "Unavailable" : `$${item.price.toFixed(2)}`}</td>
                              <td><ValidRange from={item.valid_from} to={item.valid_to} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

async function loadUser(userId: string): Promise<{ email: string | null; postal_code: string } | null> {
  const result = await getPool().query<{ email: string | null; postal_code: string }>("select email, postal_code from users where id = $1", [userId]);
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

function groupMatchesByWatchItem(matches: Awaited<ReturnType<typeof findMatches>>) {
  const grouped = new Map<string, typeof matches>();
  for (const match of matches) {
    const group = grouped.get(match.watchItem.id) ?? [];
    group.push(match);
    grouped.set(match.watchItem.id, group);
  }
  return grouped;
}

function emptyStateCopy(jobStatus: Awaited<ReturnType<typeof getUserJobStatus>>): string {
  if (jobStatus.pending) return "Fetching flyers… results will appear automatically.";
  if (jobStatus.lastError) return "Last fetch failed — see the banner above for details. A retry is scheduled.";
  return "No cached matches yet.";
}

function EventRefresher() {
  return <script dangerouslySetInnerHTML={{ __html: "new EventSource('/api/events').onmessage=function(){location.reload()}" }} />;
}
