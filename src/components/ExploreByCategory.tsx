import Image from "next/image";
import Link from "next/link";

const CATEGORIES = [
  {
    label: "16-Hour Initial",
    description: "Required for first-time CCW applicants",
    href: "/vendors?category=initial",
    icon: "/icons/target.png",
  },
  {
    label: "8-Hour Renewal",
    description: "For existing permit holders",
    href: "/vendors?category=renewal",
    icon: "/icons/renewal.png",
  },
  {
    label: "Add a Gun",
    description: "Add a new firearm to your permit",
    href: "/vendors?category=add-gun",
    icon: "/icons/add.png",
  },
  {
    label: "Virtual Courses",
    description: "Complete your renewal from home",
    href: "/vendors?category=online",
    icon: "/icons/virtual.png",
  },
] as const;

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
                <Image
                  src={cat.icon}
                  alt=""
                  width={22}
                  height={22}
                  className="explore-by-category-card__icon"
                />
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
