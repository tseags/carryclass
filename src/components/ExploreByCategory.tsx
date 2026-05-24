import Link from "next/link";

const CATEGORIES = [
  {
    label: "16-Hour Initial",
    description: "Required for first-time CCW applicants",
    href: "/instructors?category=initial",
    icon: "target",
  },
  {
    label: "8-Hour Renewal",
    description: "For existing permit holders",
    href: "/instructors?category=renewal",
    icon: "renewal",
  },
  {
    label: "Add a Gun",
    description: "Add a new firearm to your permit",
    href: "/instructors?category=add-gun",
    icon: "add",
  },
  {
    label: "Virtual Classes",
    description: "Complete your renewal from home",
    href: "/instructors?category=online",
    icon: "virtual",
  },
] as const;

function CategoryIcon({ type }: { type: (typeof CATEGORIES)[number]["icon"] }) {
  const strokeProps = {
    stroke: "#c96442",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  if (type === "target") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="explore-by-category-card__icon"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7.5" {...strokeProps} />
        <circle cx="11" cy="11" r="4.5" {...strokeProps} />
        <circle cx="11" cy="11" r="1.25" fill="#c96442" />
      </svg>
    );
  }

  if (type === "renewal") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="explore-by-category-card__icon"
        aria-hidden
      >
        <path d="M15.5 5.5H18V8" {...strokeProps} />
        <path d="M18 5.5L15 8.5" {...strokeProps} />
        <path d="M6.5 16.5H4V14" {...strokeProps} />
        <path d="M4 16.5L7 13.5" {...strokeProps} />
        <path d="M5.5 9.5C6.1 7.2 8.2 5.5 10.8 5.5C12.7 5.5 14.4 6.4 15.5 7.9" {...strokeProps} />
        <path d="M16.5 12.5C15.9 14.8 13.8 16.5 11.2 16.5C9.3 16.5 7.6 15.6 6.5 14.1" {...strokeProps} />
      </svg>
    );
  }

  if (type === "add") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="explore-by-category-card__icon"
        aria-hidden
      >
        <path d="M11 6.5V15.5" {...strokeProps} />
        <path d="M6.5 11H15.5" {...strokeProps} />
      </svg>
    );
  }

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="explore-by-category-card__icon"
      aria-hidden
    >
      <rect x="3.5" y="6.5" width="10.5" height="9" rx="2" {...strokeProps} />
      <path d="M14 9L18 7.5V14.5L14 13V9Z" {...strokeProps} />
    </svg>
  );
}

export function ExploreByCategory() {
  return (
    <section className="section explore-by-category-section home-page">
      <div className="container-default w-container">
        <h2 className="mg-bottom-0 home-page explore-by-category-heading">Explore by category</h2>
        <div className="explore-by-category-grid">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="explore-by-category-card"
            >
              <div className="explore-by-category-card__icon-wrap" aria-hidden>
                <CategoryIcon type={cat.icon} />
              </div>
              <h4 className="link-item-text---hover-secondary-2 mg-bottom-0 explore-by-category-card__title">
                {cat.label}
              </h4>
              <p className="explore-by-category-card__desc">{cat.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
