import { getPool, type SearchContext } from "@flyer-watch/core";
import { saveOnboarding, sendTestEmailForCurrentUser } from "../actions";
import { requireSession } from "../session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession();
  const user = await loadUser(session.userId);
  const ctx = await loadSearchContext(session.userId, user?.postal_code ?? "V6B 1A1");

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <div className="brand">Flyer Ping</div>
          <div className="muted">Store &amp; location settings</div>
        </div>
        <a className="button secondary" href="/">Back to dashboard</a>
      </div>

      <div className="settings-layout">
        <section className="panel">
          <h2>Location &amp; Stores</h2>
          <p className="muted settings-intro">
            These defaults tell the worker which postal code and store branches to warm.
            Update them whenever you move or shop a different location.
          </p>
          <form className="stack" action={saveOnboarding}>
            <label>
              Postal code
              <input name="postalCode" defaultValue={user?.postal_code ?? "V6B 1A1"} />
            </label>
            <label>
              Whole Foods store id
              <input name="wholeFoodsStore" defaultValue={ctx.storeIds.wholefoods?.[0] ?? "10244"} />
            </label>
            <label>
              Sungiven store
              <input name="sungivenStore" defaultValue={ctx.storeIds.sungiven?.[0] ?? "vancouver"} />
            </label>
            <button className="button" type="submit">Save settings</button>
          </form>
        </section>

        <aside className="panel settings-aside stack">
          <h2>Account</h2>
          <dl className="settings-meta">
            <div>
              <dt className="muted">Email</dt>
              <dd>{user?.email ?? session.consentkeysSub}</dd>
            </div>
            <div>
              <dt className="muted">Postal code</dt>
              <dd>{user?.postal_code ?? "V6B 1A1"}</dd>
            </div>
          </dl>
          <form action={sendTestEmailForCurrentUser}>
            <button className="button" type="submit">Send test email</button>
          </form>
          <a className="button button-ghost" href="/auth/logout">Sign out</a>
        </aside>
      </div>
    </main>
  );
}

async function loadUser(userId: string): Promise<{ email: string | null; postal_code: string } | null> {
  const result = await getPool().query<{ email: string | null; postal_code: string }>(
    "select email, postal_code from users where id = $1",
    [userId]
  );
  return result.rows[0] ?? null;
}

async function loadSearchContext(userId: string, postalCode: string): Promise<SearchContext> {
  const result = await getPool().query<{ source: string; store_id: string }>(
    "select source, store_id from user_stores where user_id = $1",
    [userId]
  );
  return {
    postalCode,
    storeIds: result.rows.reduce<SearchContext["storeIds"]>((acc, row) => {
      const source = row.source as keyof SearchContext["storeIds"];
      acc[source] = [...(acc[source] ?? []), row.store_id];
      return acc;
    }, {})
  };
}
