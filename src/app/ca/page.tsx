import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCountyDisplayName } from "@/data/counties";
import { getCountyImageUrl } from "@/data/county-images";
import { GearCtaSection } from "@/components/GearCtaSection";
import { CALIFORNIA_COUNTIES } from "@/data/counties";
import { getVendorCountsByCounty } from "@/lib/vendors-db";

export const metadata = {
  title: "Find California CCW Training by County | CCW Courses CA",
  description:
    "Browse all California counties to find approved CCW instructors and firearm training vendors. View sheriff-approved providers and renewal course details.",
};

/** One-line blurb under each county name — count is rendered bold by the caller. */
function countyCardBlurb(displayName: string, count: number): React.ReactNode {
  return (
    <>
      View <strong>{count}</strong> CCW courses in {displayName} County
    </>
  );
}

export default async function CaliforniaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolved = await searchParams;
  const qRaw = resolved?.q;
  const qStr = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  const query = (typeof qStr === "string" ? qStr : "").trim().toLowerCase();

  const vendorCountsByCounty = await getVendorCountsByCounty();

  const allCounties = CALIFORNIA_COUNTIES.slice();
  const counties = query
    ? allCounties.filter((slug) =>
        getCountyDisplayName(slug).toLowerCase().includes(query)
      )
    : allCounties;

  return (
    <>
      <Header />
      <section className="section-3 counties-hero">
        <div className="w-layout-blockcontainer container-2 w-container">
          <div className="div-block-10 vendors-hero-content">
            <div className="vendors-hero-breadcrumb-row vendors-hero-breadcrumb-row--above-title">
              <nav className="vendors-hero-breadcrumb text-sm" aria-label="Breadcrumb">
                <Link href="/" className="hover:underline">
                  Home
                </Link>
                <span className="mx-2" aria-hidden="true">
                  /
                </span>
                <span className="vendors-hero-breadcrumb-current" aria-current="page">
                  Counties
                </span>
              </nav>
            </div>
            <h1 className="mg-bottom-12px vendors-hero-title">
              Find CCW Training by County in California
            </h1>
            <p className="paragraph-5 vendors-hero-description vendors-hero-description--two-lines">
              <span className="vendors-hero-description-line">
                Browse all California counties to find approved CCW instructors and training vendors near you.
              </span>
              <br aria-hidden="true" />
              <span className="vendors-hero-description-line">
                Each county below links to its own sheriff-approved vendor list and renewal information.
              </span>
            </p>
          </div>

          <div className="mg-top-40px">
            <div className="card pd-44px---32px filter-bar county-search counties-hero-search vendors-filter-bar-shell">
              <div className="grid-3-columns filters-grid county-page">
                <form
                  action="/ca"
                  method="get"
                  className="position-relative---z-index-1 mg-bottom-0 mg-bottom-8px-mbp w-form"
                >
                  <div className="position-relative---z-index-1 flex-horizontal">
                    <img
                      src="/images/search-input-icon-directory-webflow-ecommerce-template.svg"
                      loading="eager"
                      alt=""
                      className="icon-inside-input"
                    />
                    <input
                      className="input icon-left-inside search-btn-inside county-search w-input"
                      maxLength={256}
                      name="q"
                      placeholder="Find Your County"
                      type="search"
                      defaultValue={qStr ?? ""}
                    />
                  </div>
                  <div className="btn-inside-input-wrapper">
                    <button
                      type="submit"
                      className="btn-primary bg-secondary-2 w-button"
                    >
                      Search
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="counties-page-content">
        <div className="container-default w-container">
          <div className="inner-container _1120px center">
            <div className="w-dyn-list">
              {counties.length > 0 ? (
                <div role="list" className="county-cards-grid-polished w-dyn-items county-collection-grid">
                  {counties.map((slug) => {
                    const name = getCountyDisplayName(slug);
                    const imageUrl = getCountyImageUrl(slug);
                    const vendorCount = vendorCountsByCounty[slug] ?? 0;
                    return (
                      <div
                        key={slug}
                        role="listitem"
                        className="county-card w-dyn-item"
                      >
                        <Link
                          href={`/ca/${slug}`}
                          className="card-link-image-top---main-container w-inline-block"
                        >
                          <div className="div-block-7">
                            {imageUrl ? (
                              <div className="county-card-image-wrap">
                                <Image
                                  src={imageUrl}
                                  alt={name}
                                  fill
                                  className="image-3"
                                  sizes="(max-width: 576px) 100vw, (max-width: 991px) 50vw, 33vw"
                                />
                              </div>
                            ) : (
                              <div className="county-card-image-wrap county-card-placeholder">
                                <span className="county-card-placeholder-text">{name}</span>
                              </div>
                            )}
                            <div className="flex align-center mg-bottom-12px">
                              <h2 className="link-item-text---hover-secondary-2 heading-h3-size mg-bottom-0">
                                {name} County
                              </h2>
                            </div>
                            <p className="color-neutral-600 mg-bottom-0">
                              {countyCardBlurb(name, vendorCount)}
                            </p>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state w-dyn-empty">
                  <div>
                    No counties match &quot;{query}&quot;. Try a different search
                    or{" "}
                    <Link href="/ca" className="font-medium underline">
                      view all counties
                    </Link>
                    .
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <GearCtaSection />

      <Footer />
    </>
  );
}
