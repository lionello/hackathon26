type Props = {
  searchParams: Promise<{
    message?: string;
    details?: string;
  }>;
};

export default async function AuthErrorPage({ searchParams }: Props) {
  const params = await searchParams;
  const message = params.message ?? "Sign-in failed";
  const details = params.details ?? "No additional details were provided.";

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">Flyer Watch</div>
        <a className="button secondary" href="/">Back</a>
      </div>

      <section className="panel stack">
        <h1>{message}</h1>
        <p className="muted">
          The authentication provider could not complete the redirect. Check the configured callback URL and try signing in again.
        </p>
        <details>
          <summary>Error details</summary>
          <pre>{details}</pre>
        </details>
        <a className="button" href="/auth/login">Try again</a>
      </section>
    </main>
  );
}
