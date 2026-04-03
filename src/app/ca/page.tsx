import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCountyDisplayName } from "@/data/counties";
import { getCountyImageUrl } from "@/data/county-images";
import { GearCtaSection } from "@/components/GearCtaSection";
import { CALIFORNIA_COUNTIES } from "@/data/counties";

export const metadata = {
  title: "Find California CCW Training by County | CCW Courses CA",
  description:
    "Browse all California counties to find approved CCW instructors and firearm training vendors. View sheriff-approved providers and renewal course details.",
};

export default async function CaliforniaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolved = await searchParams;
  const qRaw = resolved?.q;
  const qStr = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  const query = (typeof qStr === "string" ? qStr : "").trim().toLowerCase();

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
        <div className="container-default w-container">
          <nav className="vendors-hero-breadcrumb text-sm">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>Counties</span>
          </nav>
          <div className="text-center mg-bottom-32px pricing-page">
            <div className="inner-container _550px center">
              <h1 className="mg-bottom-6px">Find CCW Training by County in California</h1>
              <p className="mg-bottom-0 main-description">
                Browse all California counties to find approved CCW instructors
                and training vendors near you. Each county below links to its own
                sheriff-approved vendor list and renewal information.
              </p>
            </div>
          </div>
          <div className="inner-container _1040px center">
            <div className="card pd-44px---32px county-search counties-hero-search">
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
                <div role="list" className="grid-2-columns w-dyn-items county-collection-grid">
                  {counties.map((slug) => {
                    const name = getCountyDisplayName(slug);
                    const imageUrl = getCountyImageUrl(slug);
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
                                  sizes="(max-width: 767px) 100vw, 50vw"
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
                              Find approved CCW training and renewal courses in{" "}
                              <strong>{name}</strong> County.
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
