type Testimonial = {
  quote: string;
  author: string;
  role: string;
  location: string;
  initial: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Found my renewal class in 10 minutes. Easy to filter by county and price.",
    author: "M. Chen",
    role: "CCW holder",
    location: "Sacramento, CA",
    initial: "M",
  },
  {
    quote:
      "Clear pricing and no hidden fees. Compared three instructors and chose the right one for my schedule.",
    author: "R. Patel",
    role: "First-time applicant",
    location: "Orange County, CA",
    initial: "R",
  },
  {
    quote:
      "We list our courses here and consistently get serious, prepared students.",
    author: "J. Torres",
    role: "Instructor",
    location: "San Diego, CA",
    initial: "J",
  },
];

function Stars() {
  return (
    <div className="home-testimonials__stars" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          width="14"
          height="14"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="#c96442"
            d="M10 1.5l2.6 5.3 5.9.9-4.3 4.2 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.7l5.9-.9L10 1.5z"
          />
        </svg>
      ))}
    </div>
  );
}

export function HomeTestimonials() {
  return (
    <section
      className="home-testimonials"
      aria-labelledby="home-testimonials-heading"
    >
      <div className="container-default w-container">
        <div className="home-testimonials__header">
          <h2 id="home-testimonials-heading" className="home-testimonials__heading">
            Trusted by students who do their research.
          </h2>
        </div>
        <div className="home-testimonials__grid">
          {TESTIMONIALS.map((t) => (
            <article key={t.author} className="home-testimonials__card">
              <Stars />
              <p className="home-testimonials__quote">&ldquo;{t.quote}&rdquo;</p>
              <div className="home-testimonials__attribution">
                <div className="home-testimonials__avatar" aria-hidden="true">
                  {t.initial}
                </div>
                <div className="home-testimonials__author">
                  <div className="home-testimonials__name">{t.author}</div>
                  <div className="home-testimonials__meta">
                    {t.role} · {t.location}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
