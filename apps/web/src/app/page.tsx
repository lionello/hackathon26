import { findMatches, getPool, type SearchContext, type WatchItem } from "@flyer-watch/core";
import { addWatchItem, removeWatchItem, saveOnboarding } from "./actions";
import { getSession } from "./session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    return (
      <main className="shell">
        <div className="topbar">
          <div className="brand">Flyer Watch</div>
          <a className="button" href="/auth/login">Sign in</a>
        </div>
        <section className="panel">
          <h1>Vancouver flyer sale alerts</h1>
          <p className="muted">Watch Loblaws, No Frills, Metro, Sobeys, Walmart, Whole Foods, and Sungiven. Emails are sent through SES after the worker warms cache and finds net-new deals.</p>
        </section>
      </main>
    );
  }

  const user = await loadUser(session.userId);
  const watchItems = await loadWatchItems(session.userId);
  const ctx = await loadSearchContext(session.userId, user?.postal_code ?? "V6B 1A1");
  const matches = await findMatches(watchItems, ctx, { cacheOnly: true });

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <div className="brand">Flyer Watch</div>
          <div className="muted">Signed in as {user?.email ?? session.consentkeysSub}</div>
        </div>
        <a className="button secondary" href="/auth/logout">Sign out</a>
      </div>

      <EventRefresher />

      <div className="grid">
        <aside className="stack">
          <section className="panel">
            <h2>Store Defaults</h2>
            <form className="stack" action={saveOnboarding}>
              <label>Postal code <input name="postalCode" defaultValue={user?.postal_code ?? "V6B 1A1"} /></label>
              <label>Whole Foods store id <input name="wholeFoodsStore" defaultValue={ctx.storeIds.wholefoods?.[0] ?? "10244"} /></label>
              <label>Sungiven store <input name="sungivenStore" defaultValue={ctx.storeIds.sungiven?.[0] ?? "vancouver"} /></label>
              <button className="button" type="submit">Save</button>
            </form>
          </section>

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
                <form key={item.id} action={removeWatchItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <button className="button secondary" type="submit">Remove {item.query}</button>
                </form>
              ))}
            </div>
          </section>
        </aside>

        <section className="panel">
          <h2>Cached Deals</h2>
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
          {matches.length === 0 ? <p className="muted">No cached matches yet. Add an item or save store defaults to enqueue a worker warm-up.</p> : null}
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
