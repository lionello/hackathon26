const STORES = [
  "Loblaws",
  "No Frills",
  "Metro",
  "Sobeys",
  "Walmart",
  "Whole Foods",
  "Sungiven",
];

const FEATURES = [
  {
    title: "Seven stores, one inbox",
    body: "We watch every major Vancouver grocer at once so you never tab between flyers again.",
  },
  {
    title: "Net-new matches only",
    body: "The worker warms its cache, scans every flyer, and only sends items that are new to your watchlist.",
  },
  {
    title: "No noisy discount math",
    body: "Flyer comparison prices are unreliable, so alerts focus on the sale price printed in the flyer.",
  },
  {
    title: "Delivered by email",
    body: "Clean SMTP alerts land the moment a match appears — no app to babysit.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Pick your stores & postal code",
    body: "Set defaults once. We map you to the right Whole Foods and Sungiven locations.",
  },
  {
    step: "02",
    title: "Add items to watch",
    body: "Milk, tofu, chicken — whatever you buy. Add the item once and we check each flyer sweep.",
  },
  {
    step: "03",
    title: "Get the alert",
    body: "When the cache warms and a net-new matching sale appears, the email is already on its way.",
  },
];

export function Landing() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <div className="brand">
          <span className="brand-dot" aria-hidden="true" />
          Flyer Watch
        </div>
        <a className="button" href="/auth/login">
          Sign in
        </a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Vancouver grocery price alerts</span>
          <h1 className="hero-title text-balance">
            Stop hunting flyers. Let the deals come to you.
          </h1>
          <p className="hero-sub text-pretty">
            Flyer Watch tracks Loblaws, No Frills, Metro, Sobeys, Walmart, Whole
            Foods, and Sungiven. The moment a net-new watched item appears on
            sale, an email hits your inbox.
          </p>
          <div className="hero-cta">
            <a className="button button-lg" href="/auth/login">
              Start watching — it&apos;s free
            </a>
            <a className="button button-ghost button-lg" href="#how">
              See how it works
            </a>
          </div>
          <div className="hero-trust">
            <span className="live-dot" aria-hidden="true" />
            Worker is warming caches and diffing flyers right now
          </div>
        </div>

        <div className="hero-card" aria-hidden="true">
          <div className="hero-card-head">
            <span className="hero-card-tag">New deal</span>
            <span className="muted">just now</span>
          </div>
          <div className="deal-row">
            <div>
              <div className="deal-store">No Frills</div>
              <div className="deal-item">Organic Tofu, 350g</div>
            </div>
            <div className="deal-price">
              $1.99
              <span className="deal-off">This week</span>
            </div>
          </div>
          <div className="deal-row">
            <div>
              <div className="deal-store">Whole Foods</div>
              <div className="deal-item">Wild Salmon Fillet</div>
            </div>
            <div className="deal-price">
              $9.49
              <span className="deal-off">This week</span>
            </div>
          </div>
          <div className="deal-row">
            <div>
              <div className="deal-store">Sungiven</div>
              <div className="deal-item">Fresh Whole Milk, 2L</div>
            </div>
            <div className="deal-price">
              $2.79
              <span className="deal-off">This week</span>
            </div>
          </div>
        </div>
      </section>

      <section className="store-strip">
        <span className="store-strip-label">Watching</span>
        <div className="store-chips">
          {STORES.map((store) => (
            <span className="store-chip" key={store}>
              {store}
            </span>
          ))}
        </div>
      </section>

      <section className="features">
        {FEATURES.map((feature) => (
          <div className="feature-card" key={feature.title}>
            <h3>{feature.title}</h3>
            <p className="muted">{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="how" id="how">
        <h2 className="section-title text-balance">From flyer chaos to a single email</h2>
        <div className="steps">
          {STEPS.map((step) => (
            <div className="step-card" key={step.step}>
              <span className="step-num">{step.step}</span>
              <h3>{step.title}</h3>
              <p className="muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2 className="text-balance">Your next grocery run could cost a lot less.</h2>
        <p className="text-pretty">
          Set your watchlist in under a minute. We&apos;ll handle the rest.
        </p>
        <a className="button button-lg" href="/auth/login">
          Sign in to get started
        </a>
      </section>

      <footer className="landing-footer">
        <span className="brand">Flyer Watch</span>
        <span className="muted">Vancouver supermarket sale alerts, delivered by SMTP.</span>
      </footer>
    </main>
  );
}
