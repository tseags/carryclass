import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroImages } from "@/components/HeroImages";
import { CountyScrollSection } from "@/components/CountyScrollSection";
import { VENDORS } from "@/data/vendors";
import { getCountyDisplayName } from "@/data/counties";

export const metadata = {
  title: "CCW Training Directory | Find CCW Classes & Instructors Near You",
  description:
    "Find CCW (Concealed Carry Weapon) training classes and certified instructors in California. Browse by county, compare prices, and get your permit.",
};

// Featured vendors (featured first, then first 6)
const featuredVendors = [...VENDORS]
  .filter((v) => v.featured)
  .concat(VENDORS.filter((v) => !v.featured))
  .slice(0, 6);

// Placeholder blog articles
const PLACEHOLDER_ARTICLES = [
  {
    slug: "how-to-apply-ccw-california",
    title: "How to Apply for Your CCW Permit in California",
    description: "Step-by-step guide to the application process, required documents, and what to expect at your interview.",
    image: "/images/jeferson-santu-2AZz7FXD3qI-unsplash-p-500.jpg",
  },
  {
    slug: "initial-vs-renewal-classes",
    title: "Initial vs. Renewal CCW Classes: What’s the Difference?",
    description: "Understand the 16-hour initial requirement and 8-hour renewal course options across California counties.",
    image: "/images/artem-zhukov-08M4vqU_Q-k-unsplash-p-500.jpg",
  },
  {
    slug: "best-ccw-gear-beginners",
    title: "Best CCW Gear for Beginners",
    description: "Holsters, belts, and everyday carry essentials recommended by instructors and experienced permit holders.",
    image: "/images/joel-moysuh-wJMzCNY7ZkM-unsplash-p-500.jpg",
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      {/* Hero - section-2 */}
      <div className="section-2">
        <div className="container-default home w-container">
          <div className="top-section-card home">
            <div>
              <div className="inner-container _408px _100-tablet">
                <h1 className="mg-bottom-10px">
                  Find California CCW Training &amp; Renewal Courses
                </h1>
              </div>
              <div className="inner-container _414px _100-tablet">
                <p className="mg-bottom-24px">
                  Browse approved CCW instructors across California. Compare
                  class options, prices, reviews, and availability — all in one
                  place.
                </p>
              </div>
              <div className="buttons-row">
                <Link href="/vendors" className="btn-primary button-row w-button">
                  Find CCW Courses
                </Link>
                <Link href="/ca" className="btn-secondary w-button">
                  View Counties
                </Link>
              </div>
            </div>
            <HeroImages />
          </div>
        </div>
      </div>

      {/* View CCW Courses by County - horizontal scroll, 5 visible */}
      <CountyScrollSection />

      {/* Explore by category - tight 6 grid, icon left + text right, all clickable */}
      <div className="section bg-neutral-200 home-page">
        <div className="container-default w-container">
          <h2 className="mg-bottom-0 home-page">Explore by category</h2>
          <div className="category-grid-6">
            <Link href="/vendors?type=initial" className="category-grid-item">
              <img src="/icons/target.png" loading="lazy" alt="" className="category-card-icon" />
              <h4 className="link-item-text---hover-secondary-2 mg-bottom-0">16-Hour Initial Courses</h4>
            </Link>
            <Link href="/vendors?type=renewal" className="category-grid-item">
              <img src="/icons/renewal.png" loading="lazy" alt="" className="category-card-icon" />
              <h4 className="link-item-text---hover-secondary-2 mg-bottom-0">8-Hour Renewal Courses</h4>
            </Link>
            <Link href="/vendors" className="category-grid-item">
              <img src="/icons/add.png" loading="lazy" alt="" className="category-card-icon" />
              <h4 className="link-item-text---hover-secondary-2 mg-bottom-0">Add a gun to CCW</h4>
            </Link>
            <Link href="/vendors?format=in-person" className="category-grid-item">
              <img src="/icons/In-person.png" loading="lazy" alt="" className="category-card-icon" />
              <h4 className="link-item-text---hover-secondary-2 mg-bottom-0">In-Person Courses</h4>
            </Link>
            <Link href="/vendors?format=online" className="category-grid-item">
              <img src="/icons/virtual.png" loading="lazy" alt="" className="category-card-icon" />
              <h4 className="link-item-text---hover-secondary-2 mg-bottom-0">Virtual Courses</h4>
            </Link>
            <Link href="/gear" className="category-grid-item">
              <img src="/icons/gear.png" loading="lazy" alt="" className="category-card-icon" />
              <h4 className="link-item-text---hover-secondary-2 mg-bottom-0">CCW Gear</h4>
            </Link>
          </div>
        </div>
      </div>

      {/* Popular CCW Vendors - equal size cards, hover, always show Initial + Renewal */}
      <div id="experiences" className="section bg-neutral-200 home-page popular">
        <div className="container-default w-container">
          <div className="grid-2-columns title-and-btn-grid mg-bottom-24px">
            <h2 className="mg-bottom-0">Popular CCW Vendors</h2>
            <div>
              <Link href="/vendors" className="btn-secondary w-button">
                View All Vendors
              </Link>
            </div>
          </div>
          <div className="grid-2-columns _1-col-tablet" style={{ gap: "24px", alignItems: "stretch" }}>
            {featuredVendors.map((vendor) => (
              <Link key={vendor.id} href={`/vendors/${vendor.slug}`} className="w-inline-block" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="vendor-card-hover card-link-image-top---text-container pd-36px---24px outline popular home" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <h3 className="link-item-text---hover-secondary-2 heading-h4-size vendor-name">
                    {vendor.name}
                  </h3>
                  <div className="grid-1-column gap-row-10px mg-bottom-24px">
                    <div className="flex align-start gap-column-8px">
                      <div className="paragraph-small color-neutral-600 bold">
                        {vendor.type === "company" ? "Company" : "Instructor"} · {vendor.city}, CA
                      </div>
                    </div>
                    <div className="flex align-start gap-column-8px">
                      <img
                        src="/images/location-icon-color-neutral-400-directory-webflow-ecommerce-template.svg"
                        loading="lazy"
                        width={14}
                        alt=""
                        className="mg-top-4px"
                      />
                      <div className="paragraph-small color-neutral-600">
                        {vendor.countiesServed.map((c) => getCountyDisplayName(c)).join(", ")}
                      </div>
                    </div>
                    <div className="flex align-start gap-column-8px">
                      <div className="paragraph-small color-neutral-600">
                        <strong className="bold-text-2">$</strong>
                      </div>
                      <div className="paragraph-small color-neutral-600">
                        16-Hour Initial: <strong>{vendor.priceInitial != null ? `$${vendor.priceInitial}` : "Contact"}</strong>
                      </div>
                    </div>
                    <div className="flex align-start gap-column-8px">
                      <div className="paragraph-small color-neutral-600">
                        <strong className="bold-text-2">$</strong>
                      </div>
                      <div className="paragraph-small color-neutral-600">
                        8-Hour Renewal: <strong>{vendor.priceRenewal != null ? `$${vendor.priceRenewal}` : "Contact"}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="flex-align-left flex-align-stretch-mbp mg-top-auto">
                    <div className="btn-primary vendor-card">View Now</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Gear CTA - dark section */}
      <div className="cta-section old">
        <div className="container-default position-relative---z-index-1 w-container">
          <div className="grid-3-columns top-section---grid-right">
            <div className="top-section-grid-right---column first">
              <div className="grid-1-column gap-row-20px gap-row-12px-mbl">
                <img src="/images/jeferson-santu-2AZz7FXD3qI-unsplash.jpg" loading="lazy" alt="" className="border-radius-8px" />
                <img src="/images/artem-zhukov-08M4vqU_Q-k-unsplash.jpg" loading="lazy" alt="" className="border-radius-8px" />
              </div>
            </div>
            <div className="top-section-grid-right---column second">
              <div className="grid-1-column gap-row-20px gap-row-12px-mbl">
                <img src="/images/Screen-Shot-2025-10-29-at-8.45.33-AM.png" loading="lazy" alt="" className="border-radius-8px" />
                <img src="/images/jeferson-santu-HmK7MVxlo9M-unsplash.jpg" loading="lazy" alt="" className="border-radius-8px" />
                <img src="/images/joel-moysuh-wJMzCNY7ZkM-unsplash.jpg" loading="lazy" alt="" className="border-radius-8px" />
              </div>
            </div>
            <div className="top-section-grid-right---column third">
              <div className="grid-1-column gap-row-20px gap-row-12px-mbl">
                <img src="/images/jay-rembert-LcAaVZXDTkI-unsplash.jpg" loading="lazy" alt="" className="border-radius-8px" />
                <img src="/images/Screen-Shot-2025-10-29-at-8.44.49-AM.png" loading="lazy" alt="" className="border-radius-8px" />
              </div>
            </div>
          </div>
          <div className="inner-container _470px _100-tablet">
            <h2 className="display-2 color-neutral-100 mg-bottom-12px">
              Find the Best Gear for CCW Training &amp; Everyday Carry
            </h2>
            <p className="paragraph-small color-neutral-300 mg-bottom-24px">
              View the best holsters, belts, PPE, safes, and more — trusted by
              CCW holders across California.
            </p>
            <Link href="/gear" className="btn-primary button-row gear-button w-button">
              View Gear
            </Link>
          </div>
        </div>
      </div>

      {/* Newsletter CTA */}
      <div id="subscribe" className="overflow-hidden newsletter-cta">
        <div className="container-default w-container">
          <div className="cta-card">
            <div>
              <h2 className="display-2 color-neutral-100 mg-bottom-12px">
                Subscribe to our newsletter for CCW updates
              </h2>
              <div className="inner-container _470px _100-tablet">
                <p className="paragraph-small color-neutral-300 mg-bottom-24px">
                  Get new course listings, county updates, and permit info in your inbox.
                </p>
                <div className="mg-bottom-0 w-form">
                  <form className="input-and-btn-container" action="#" method="get">
                    <div className="position-relative---z-index-1 flex-horizontal width-100">
                      <img
                        alt=""
                        loading="eager"
                        src="/images/email-icon-inside-input-directory-webflow-ecommerce-template.svg"
                        className="icon-inside-input"
                      />
                      <input
                        className="input small icon-left-inside w-input"
                        maxLength={256}
                        name="Email"
                        placeholder="Enter your email"
                        type="email"
                        required
                      />
                    </div>
                    <input
                      type="submit"
                      className="btn-primary bg-secondary-2 hover-white w-button"
                      value="Subscribe"
                    />
                  </form>
                </div>
              </div>
            </div>
            <img
              className="cta-card---image-right"
              src="/images/newsletter-section-image-right-directory-webflow-ecommerce-template.png"
              alt=""
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="section bg-neutral-200 old-reviews">
        <div className="container-default old-reviews w-container">
          <div className="text-center mg-bottom-32px">
            <div className="inner-container _432px center">
              <h2 className="mg-bottom-12px">What our users say</h2>
              <p className="mg-bottom-0">
                CCW students and instructors use our directory to find and list
                approved training across California.
              </p>
            </div>
          </div>
          <div className="grid-3-columns _1-col-tablet mg-bottom-32px">
            <div className="card testimonial-card---content-center">
              <div className="mg-bottom-24px">
                <img
                  src="/images/john-carter-testimonial-avatar-directory-webflow-ecommerce-template.jpg"
                  loading="lazy"
                  alt=""
                  className="avatar-circle _04"
                />
              </div>
              <img
                src="/images/five-stars-testimonial-directory-webflow-ecommerce-template.svg"
                loading="lazy"
                alt=""
                className="mg-bottom-24px"
              />
              <div className="heading-h4-size mg-bottom-12px">
                &ldquo;Found my renewal class in 10 minutes.&rdquo;
              </div>
              <p className="mg-bottom-32px mg-top-auto">
                Easy to filter by county and price. Booked same week.
              </p>
              <div className="flex-horizontal">
                <div className="text-200 bold color-neutral-800">CCW Holder</div>
                <div className="divider-details small" />
                <div className="text-200">Sacramento, CA</div>
              </div>
            </div>
            <div className="card testimonial-card---content-center">
              <div className="mg-bottom-24px">
                <img
                  src="/images/sophie-moore-testimonial-avatar-directory-webflow-ecommerce-template.jpg"
                  loading="lazy"
                  alt=""
                  className="avatar-circle _04"
                />
              </div>
              <img
                src="/images/five-stars-testimonial-directory-webflow-ecommerce-template.svg"
                loading="lazy"
                alt=""
                className="mg-bottom-24px"
              />
              <div className="heading-h4-size mg-bottom-12px">
                &ldquo;Clear pricing and locations.&rdquo;
              </div>
              <p className="mg-bottom-32px mg-top-auto">
                Compared a few instructors and chose one that fit my schedule.
              </p>
              <div className="flex-horizontal">
                <div className="text-200 bold color-neutral-800">First-time applicant</div>
                <div className="divider-details small" />
                <div className="text-200">Orange County, CA</div>
              </div>
            </div>
            <div className="card testimonial-card---content-center">
              <div className="mg-bottom-24px">
                <img
                  src="/images/andy-smith-testimonial-avatar-directory-webflow-ecommerce-template.jpg"
                  loading="lazy"
                  alt=""
                  className="avatar-circle _04"
                />
              </div>
              <img
                src="/images/five-stars-testimonial-directory-webflow-ecommerce-template.svg"
                loading="lazy"
                alt=""
                className="mg-bottom-24px"
              />
              <div className="heading-h4-size mg-bottom-12px">
                &ldquo;Good for listing our classes.&rdquo;
              </div>
              <p className="mg-bottom-32px mg-top-auto">
                We list our CCW courses here and get serious students.
              </p>
              <div className="flex-horizontal">
                <div className="text-200 bold color-neutral-800">Instructor</div>
                <div className="divider-details small" />
                <div className="text-200">San Diego, CA</div>
              </div>
            </div>
          </div>
          <div className="flex-horizontal">
            <Link href="#subscribe" className="btn-primary w-button">
              Subscribe
            </Link>
          </div>
        </div>
      </div>

      {/* Browse CCW Articles & Guides - 3 placeholder cards */}
      <div className="section blogs">
        <div className="container-default w-container">
          <div className="grid-2-columns title-and-btn-grid mg-bottom-32px">
            <h2 className="mg-bottom-0">Browse CCW Articles &amp; Guides</h2>
            <div>
              <Link href="/blog" className="btn-secondary w-button">
                Browse all articles
              </Link>
            </div>
          </div>
          <div className="grid-3-columns _1-col-tablet" style={{ gap: "24px" }}>
            {PLACEHOLDER_ARTICLES.map((article) => (
              <Link
                key={article.slug}
                href={`/blog#${article.slug}`}
                className="article-card card-link-image-top---main-container w-inline-block"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div className="link-item---image-wrapper border-radius-12px" style={{ aspectRatio: "16/10", overflow: "hidden", marginBottom: "16px" }}>
                  <img
                    src={article.image}
                    loading="lazy"
                    alt=""
                    className="link-item---image"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div className="card-link-image-top---text-container pd-26px---34px---52px" style={{ paddingTop: 0 }}>
                  <h3 className="link-item-text---hover-secondary-2 heading-h4-size mg-bottom-12px">
                    {article.title}
                  </h3>
                  <p className="color-neutral-600 line-clamp-2 mg-bottom-0">
                    {article.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
