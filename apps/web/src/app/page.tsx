import { findMatches, getPool, type SearchContext, type WatchItem } from "@flyer-watch/core";
import { addWatchItem, removeWatchItem } from "./actions";
import { getSession } from "./session";
import { Landing } from "./components/landing";

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

  const availableDeals = matches.filter(({ item }) => item.price !== null);
  const cheapest = availableDeals.reduce<number | null>((min, { item }) => {
    if (item.price === null) return min;
    return min === null ? item.price : Math.min(min, item.price);
  }, null);
  const storeCount = new Set(matches.map(({ item }) => item.store)).size;

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
          <span className="stat-value">{cheapest === null ? "—" : `$${cheapest.toFixed(2)}`}</span>
          <span className="stat-label">Lowest price found</span>
        </div>
      </section>

      <div className="grid">
        <aside className="stack">
          <section className="panel">
            <h2>Add Watch</h2>
            <form className="stack" action={addWatchItem}>
              <label>Item <input name="query" placeholder="milk, tofu, chicken" /></label>
              <button className="button" type="submit">Watch item</button>
            </form>
          </section>

          <section className="panel">
            <h2>Watched Items</h2>
            <div className="stack">
              {watchItems.length === 0 ? <p className="muted">No watched items yet.</p> : null}
              {watchItems.map((item) => (
                <div className="watch-row" key={item.id}>
                  <span className="watch-query">{item.query}</span>
                  <form action={removeWatchItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="button button-ghost watch-remove" type="submit" aria-label={`Remove ${item.query}`}>
                      Remove
                    </button>
                  </form>
                </div>
              ))}
            </div>
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
          <div className="panel-head">
            <h2>Cached Deals</h2>
            <span className="muted">{availableDeals.length} live</span>
          </div>
          <table>
            <thead>
              <tr><th>Store</th><th>Item</th><th>Price</th><th>Valid</th></tr>
            </thead>
            <tbody>
              {matches.map(({ item }) => (
                <tr key={`${item.source}:${item.source_item_id}`}>
                  <td>{item.store}</td>
                  <td>{item.url ? <a href={item.url}>{item.name}</a> : item.name}</td>
                  <td className="price">{item.price === null ? "Unavailable" : `$${item.price.toFixed(2)}`}</td>
                  <td>{[item.valid_from, item.valid_to].filter(Boolean).join(" to ") || "Current flyer"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {matches.length === 0 ? <p className="muted">No cached matches yet. Add an item or update store defaults in settings to enqueue a worker warm-up.</p> : null}
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

function EventRefresher() {
  return <script dangerouslySetInnerHTML={{ __html: "new EventSource('/api/events').onmessage=function(){location.reload()}" }} />;
}
