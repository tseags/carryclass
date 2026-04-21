import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroImages } from "@/components/HeroImages";
import { CountyScrollSection } from "@/components/CountyScrollSection";
import { ExploreByCategory } from "@/components/ExploreByCategory";
import { GearCtaSection } from "@/components/GearCtaSection";
import { getAllVendors } from "@/lib/vendors-db";
import { getCountyDisplayName } from "@/data/counties";

export const metadata = {
  title: "CCW Training Directory | Find CCW Classes & Instructors Near You",
  description:
    "Find CCW (Concealed Carry Weapon) training classes and certified instructors in California. Browse by county, compare prices, and get your permit.",
};


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

export default async function HomePage() {
  const vendors = await getAllVendors();
  const featuredVendors = [...vendors]
    .filter((v) => v.featured)
    .concat(vendors.filter((v) => !v.featured))
    .slice(0, 3);
  const popularVendorReviewStats = [
    { rating: "4.9", reviews: "87 reviews" },
    { rating: "4.8", reviews: "124 reviews" },
    { rating: "4.9", reviews: "47 reviews" },
  ];

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
                  Browse approved CCW instructors across California. Compare class options, prices,
                  reviews, and availability — all in one place, no account required.
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

      <ExploreByCategory />

      {/* Popular CCW Vendors - redesigned to mirror design reference */}
      <div id="experiences" className="section bg-neutral-200 home-page popular popular-vendors-redesign">
        <div className="container-default w-container">
          <div className="popular-vendors-redesign__header">
            <div>
              <div className="popular-vendors-redesign__eyebrow">Featured instructors</div>
              <h2 className="mg-bottom-0">Popular CCW vendors</h2>
            </div>
            <div className="popular-vendors-redesign__header-btn">
              <Link href="/vendors" className="btn-secondary w-button popular-vendors-redesign__view-all">
                View All Vendors
              </Link>
            </div>
          </div>
          <div className="popular-vendors-redesign__grid">
            {featuredVendors.map((vendor, index) => {
              const reviewMeta =
                popularVendorReviewStats[index] ??
                popularVendorReviewStats[popularVendorReviewStats.length - 1];
              const servedCounty = vendor.countiesServed[0]
                ? getCountyDisplayName(vendor.countiesServed[0])
                : getCountyDisplayName(vendor.county);
              const cardDescription =
                vendor.description ?? "Sheriff-approved CCW instruction and renewal classes.";

              return (
                <Link
                  key={vendor.id}
                  href={`/vendors/${vendor.slug}`}
                  className="popular-vendors-redesign__card"
                >
                  <div className="popular-vendors-redesign__featured">Featured</div>
                  <div className="popular-vendors-redesign__title-row">
                    <h3 className="popular-vendors-redesign__title">{vendor.name}</h3>
                    <div className="popular-vendors-redesign__format-pill">In person</div>
                  </div>

                  <div className="popular-vendors-redesign__rating-row">
                    <span className="popular-vendors-redesign__stars">★★★★★</span>
                    <span className="popular-vendors-redesign__rating-copy">
                      {reviewMeta.rating} · {reviewMeta.reviews}
                    </span>
                  </div>

                  <div className="popular-vendors-redesign__location-row">
                    <img
                      src="/images/location-icon-color-neutral-400-directory-webflow-ecommerce-template.svg"
                      loading="lazy"
                      width={14}
                      height={14}
                      alt=""
                    />
                    <span>
                      {vendor.city}, {servedCounty} County
                    </span>
                  </div>

                  <p className="popular-vendors-redesign__description">{cardDescription}</p>

                  <div className="popular-vendors-redesign__prices">
                    <div>
                      <div className="popular-vendors-redesign__price">
                        {vendor.priceInitial != null ? `$${vendor.priceInitial}` : "Contact"}
                      </div>
                      <div className="popular-vendors-redesign__price-label">16-hr initial</div>
                    </div>
                    <div>
                      <div className="popular-vendors-redesign__price">
                        {vendor.priceRenewal != null ? `$${vendor.priceRenewal}` : "Contact"}
                      </div>
                      <div className="popular-vendors-redesign__price-label">8-hr renewal</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <GearCtaSection />

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
          <div className="grid-3-columns _1-col-tablet article-cards-grid" style={{ gap: "24px" }}>
            {PLACEHOLDER_ARTICLES.map((article) => (
              <Link
                key={article.slug}
                href={`/blog#${article.slug}`}
                className="article-card card-link-image-top---main-container w-inline-block"
                style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", height: "100%" }}
              >
                <div className="link-item---image-wrapper article-card-image" style={{ aspectRatio: "16/10", overflow: "hidden", marginBottom: 0, flexShrink: 0 }}>
                  <img
                    src={article.image}
                    loading="lazy"
                    alt=""
                    className="link-item---image"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div className="card-link-image-top---text-container pd-26px---34px---52px article-card-text">
                  <h3 className="link-item-text---hover-secondary-2 heading-h4-size mg-bottom-12px">
                    {article.title}
                  </h3>
                  <p className="color-neutral-600 article-card-description mg-bottom-16px" style={{ textAlign: "left" }}>
                    {article.description}
                  </p>
                  <span className="article-card-read-now">Read now</span>
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
