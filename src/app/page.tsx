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
import { SupabaseDebugProbe } from "@/components/SupabaseDebugProbe";
import { HeroSearchBar } from "@/components/HeroSearchBar";
import { pickHomePopularVendors } from "@/lib/home-featured-vendors";

export const metadata = {
  title: "CCW Training Directory | Find CCW Classes & Instructors Near You",
  description:
    "Find CCW (Concealed Carry Weapon) training classes and certified instructors in California. Browse by county, compare prices, and get your permit.",
};


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

  return (
    <>
      <SupabaseDebugProbe />
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
              <HeroSearchBar />
            </div>
            <HeroImages />
          </div>
        </div>
      </div>

      {/* View CCW Courses by County - horizontal scroll, 5 visible */}
      <CountyScrollSection />

      <ExploreByCategory />

      {/* Popular CCW Vendors - redesigned to mirror design reference */}
      <div id="experiences" className="section home-page popular popular-vendors-redesign">
        <div className="container-default w-container">
          <div className="popular-vendors-redesign__header">
            <div>
              <div className="popular-vendors-redesign__eyebrow">Featured instructors</div>
              <h2 className="mg-bottom-0">Popular CCW courses</h2>
            </div>
            <div className="popular-vendors-redesign__header-btn">
              <Link href="/vendors" className="btn-secondary w-button popular-vendors-redesign__view-all">
                View All Vendors
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
                California&apos;s CCW courses,
                <br />
                all in one place.
              </h2>
              <p className="by-the-numbers__body">
                Browse CCW training options from every county in one directory —
                compare course types, pricing, and schedules before you reach out.
              </p>
              <ul className="by-the-numbers__bullets">
                <li>
                  <span className="by-the-numbers__bullet-dot" aria-hidden="true" />
                  Statewide county coverage
                </li>
                <li>
                  <span className="by-the-numbers__bullet-dot" aria-hidden="true" />
                  Side-by-side pricing &amp; schedules
                </li>
                <li>
                  <span className="by-the-numbers__bullet-dot" aria-hidden="true" />
                  Reviews and ratings in one place
                </li>
              </ul>
            </div>
            <ByTheNumbersStats />
          </div>
        </div>
      </section>

      <HomeTestimonials />

      {SHOW_GEAR_SECTIONS ? <GearCtaSection /> : null}

      {SHOW_SUBSCRIBE_SECTIONS ? <HomeNewsletter /> : null}

      <Footer />
    </>
  );
}
