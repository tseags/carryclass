export function HomeNewsletter() {
  return (
    <section
      id="subscribe"
      className="home-newsletter"
      aria-labelledby="home-newsletter-heading"
    >
      <div className="container-default w-container">
        <div className="home-newsletter__inner">
          <div className="home-newsletter__eyebrow">Stay informed</div>
          <h2
            id="home-newsletter-heading"
            className="home-newsletter__heading"
          >
            Subscribe for CCW updates
          </h2>
          <p className="home-newsletter__copy">
            New course listings, county updates, and permit info in your inbox.
            Unsubscribe anytime.
          </p>
          <form
            className="home-newsletter__form"
            action="#"
            method="get"
            aria-label="Subscribe to the CCW newsletter"
          >
            <div className="home-newsletter__input-wrap">
              <svg
                className="home-newsletter__input-icon"
                viewBox="0 0 20 20"
                width="16"
                height="16"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="none"
                  stroke="#87867f"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 5h14v10H3zM3 5l7 5 7-5"
                />
              </svg>
              <input
                type="email"
                name="Email"
                required
                maxLength={256}
                placeholder="Enter your email"
                className="home-newsletter__input"
                aria-label="Email address"
              />
            </div>
            <button type="submit" className="btn-primary w-button home-newsletter__submit">
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
