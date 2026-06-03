import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroImages } from "@/components/HeroImages";
import { CountyScrollSection } from "@/components/CountyScrollSection";
import { ExploreByCategory } from "@/components/ExploreByCategory";
import { GearCtaSection } from "@/components/GearCtaSection";
import { HomeTestimonials } from "@/components/HomeTestimonials";
import { HomeNewsletter } from "@/components/HomeNewsletter";
import { ByTheNumbersStats } from "@/components/ByTheNumbersStats";
import { PopularVendorCard } from "@/components/PopularVendorCard";
import { getAllVendors } from "@/lib/vendors-db";
import { getCurrentUserSavedVendorIds } from "@/lib/saved-vendors";
import { getApprovedReviewStatsByVendorIds } from "@/lib/vendor-reviews";
import { getCountyDisplayName } from "@/data/counties";
import { SHOW_GEAR_SECTIONS, SHOW_SUBSCRIBE_SECTIONS } from "@/lib/feature-flags";
import { HeroSearchBar } from "@/components/HeroSearchBar";
import { pageMetadata } from "@/lib/seo";
import { pickHomePopularVendors } from "@/lib/home-featured-vendors";
import { getCountyStats } from "@/lib/county-stats";

export const metadata = pageMetadata({
  title: "Find CCW Classes Near Me",
  description:
    "Find concealed carry classes near you. Browse sheriff-approved CCW instructors across California, compare prices and reviews, and book your class.",
  path: "/",
});


export default async function HomePage() {
  const vendors = await getAllVendors();
  const popularPicks = pickHomePopularVendors(vendors);
  const featuredVendors =
    popularPicks.length >= 3
      ? popularPicks
      : [...vendors]
          .filter((v) => v.featured)
          .concat(vendors.filter((v) => !v.featured))
          .slice(0, 3);
  const featuredListingReviewStats = await getApprovedReviewStatsByVendorIds(
    featuredVendors.map((v) => v.id)
  );
  const savedIds = new Set(
    await getCurrentUserSavedVendorIds(featuredVendors.map((vendor) => vendor.id))
  );
  const { vendorCount, avgInitial, avgRenewal } = getCountyStats(vendors);

  return (
    <>
      <Header />
      <main className="home-page-sections">
      {/* Hero - section-2 */}
      <div className="section-2">
        <div className="container-default home w-container">
          <div className="top-section-card home">
            <div>
              <div className="inner-container _408px _100-tablet">
                <h1 className="mg-bottom-10px home-hero-title">
                  <span className="home-hero-title__lead">Find CCW</span> Classes Near You in
                  California
                </h1>
              </div>
              <div className="inner-container _414px _100-tablet">
                <p className="mg-bottom-24px">
                  Browse sheriff-approved concealed carry instructors across California. Compare
                  CCW class options, prices, reviews, and availability — all in one place.
                </p>
              </div>
              <HeroSearchBar />
            </div>
            <HeroImages />
          </div>
        </div>
      </div>

      {/* CCW Classes by County - horizontal scroll, 5 visible */}
      <CountyScrollSection />

      <ExploreByCategory />

      {/* Popular CCW Vendors - redesigned to mirror design reference */}
      <div id="experiences" className="section home-page popular popular-vendors-redesign">
        <div className="container-default w-container">
          <div className="popular-vendors-redesign__header">
            <div>
              <div className="popular-vendors-redesign__eyebrow">Featured instructors</div>
              <h2 className="mg-bottom-0">
                <span className="popular-vendors-redesign__heading-phrase">Popular CCW</span>{" "}
                classes
              </h2>
            </div>
            <div className="popular-vendors-redesign__header-btn">
              <Link href="/instructors" className="btn-secondary w-button popular-vendors-redesign__view-all">
                View All Instructors
              </Link>
            </div>
          </div>
          <div className="popular-vendors-redesign__grid">
            {featuredVendors.map((vendor) => {
              const servedCounty = vendor.countiesServed[0]
                ? getCountyDisplayName(vendor.countiesServed[0])
                : getCountyDisplayName(vendor.county);

              return (
                <PopularVendorCard
                  key={vendor.id}
                  vendor={vendor}
                  listingReviews={featuredListingReviewStats.get(vendor.id) ?? null}
                  servedCounty={servedCounty}
                  showFeaturedBadge={
                    popularPicks.length >= 3 ? true : Boolean(vendor.featured)
                  }
                  initialSaved={savedIds.has(vendor.id)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* By the Numbers - directory scope at a glance */}
      <section className="by-the-numbers">
        <div className="container-default w-container">
          <div className="by-the-numbers__inner">
            <div className="by-the-numbers__copy">
              <div className="by-the-numbers__eyebrow">By the numbers</div>
              <h2 className="by-the-numbers__heading">
                California&apos;s CCW classes,
                <br />
                all in one place.
              </h2>
              <p className="by-the-numbers__body">
                Find CCW classes near you, compare pricing and reviews, and book
                directly.
              </p>
              <ul className="by-the-numbers__bullets">
                <li>
                  <span className="by-the-numbers__bullet-dot" aria-hidden="true" />
                  Statewide county coverage
                </li>
                <li>
                  <span className="by-the-numbers__bullet-dot" aria-hidden="true" />
                  Only county-approved CCW instructors
                </li>
                <li>
                  <span className="by-the-numbers__bullet-dot" aria-hidden="true" />
                  Compare pricing before you book
                </li>
              </ul>
            </div>
            <ByTheNumbersStats
              instructorCount={vendorCount}
              avgInitialPrice={avgInitial}
              avgRenewalPrice={avgRenewal}
            />
          </div>
        </div>
      </section>

      <HomeTestimonials />

      {SHOW_GEAR_SECTIONS ? <GearCtaSection /> : null}

      {SHOW_SUBSCRIBE_SECTIONS ? <HomeNewsletter /> : null}

      </main>

      <Footer />
    </>
  );
}
