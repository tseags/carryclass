import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCountyDisplayName } from "@/data/counties";
import { getCountyImageUrl } from "@/data/county-images";
import { CALIFORNIA_COUNTIES } from "@/data/counties";
import { getVendorCountsByCounty } from "@/lib/vendors-db";
import type { Metadata } from "next";
import { canonicalForFilteredListing, pageMetadata } from "@/lib/seo";

export const revalidate = 86400;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}): Promise<Metadata> {
  const resolved = await searchParams;
  const title = "California CCW Classes by County";
  const description =
    "Browse California counties with listed CCW instructors. Find sheriff-approved providers and renewal class details near you.";

  return pageMetadata({
    title,
    description,
    path: "/ca",
    canonical: canonicalForFilteredListing("/ca", resolved),
  });
}

export default async function CaliforniaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const resolved = await searchParams;
  const qRaw = resolved?.q;
  const sortRaw = resolved?.sort;
  const qStr = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  const sortStr = Array.isArray(sortRaw) ? sortRaw[0] : sortRaw;
  const query = (typeof qStr === "string" ? qStr : "").trim().toLowerCase();
  const sort = typeof sortStr === "string" ? sortStr : "name";

  const vendorCountsByCounty = await getVendorCountsByCounty();

  const nameFiltered = query
    ? CALIFORNIA_COUNTIES.filter((slug) =>
        getCountyDisplayName(slug).toLowerCase().includes(query)
      )
    : CALIFORNIA_COUNTIES.slice();

  const filteredCounties = nameFiltered.filter(
    (slug) => (vendorCountsByCounty[slug] ?? 0) > 0
  );

  const counties = filteredCounties.slice().sort((a, b) => {
    const nameA = getCountyDisplayName(a);
    const nameB = getCountyDisplayName(b);
    if (sort === "name-desc") return nameB.localeCompare(nameA);
    if (sort === "count-high") return (vendorCountsByCounty[b] ?? 0) - (vendorCountsByCounty[a] ?? 0);
    if (sort === "count-low") return (vendorCountsByCounty[a] ?? 0) - (vendorCountsByCounty[b] ?? 0);
    return nameA.localeCompare(nameB);
  });

  return (
    <>
      <Header />
      <section className="section-3 vendors-hero">
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
              <span className="vendors-hero-title-line">Find CCW Training by County</span>
              <br aria-hidden="true" />
              <span className="vendors-hero-title-line">in California</span>
            </h1>
            <p className="paragraph-5 vendors-hero-description vendors-hero-description--two-lines">
              <span className="vendors-hero-description-line">
                Browse California counties that currently have listed CCW instructors near you.
              </span>
              <br aria-hidden="true" />
              <span className="vendors-hero-description-line">
                Each county below links to its sheriff-approved instructor list and renewal information.
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="vendors-results-shell" aria-label="County list and filters">
        <div className="vendors-results-layout">
          <aside className="vendors-filters-sidebar">
            <div className="vendors-filters-card">
              <div className="vendors-filters-head">
                <h2>Filters</h2>
                <Link href="/ca">Clear all</Link>
              </div>
              <form action="/ca" method="get" className="vendors-filters-form">
                <label className="vendors-filter-group">
                  <span>Search</span>
                  <input
                    type="search"
                    name="q"
                    defaultValue={qStr ?? ""}
                    placeholder="Find your county"
                  />
                </label>
                <label className="vendors-filter-group">
                  <span>Sort</span>
                  <select name="sort" defaultValue={sort}>
                    <option value="name">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                  <option value="count-high">Most classes</option>
                  <option value="count-low">Fewest classes</option>
                </select>
              </label>
              <button type="submit" className="btn-primary w-button vendors-filters-submit">
                Apply filters
              </button>
            </form>
            </div>
          </aside>

          <div className="vendors-results-main">
            <div className="vendors-results-header">
              <h2>{counties.length} counties</h2>
              <form action="/ca" method="get" className="vendors-sort-group">
                {qStr && <input type="hidden" name="q" value={qStr} />}
                <span>Sort</span>
                <select name="sort" defaultValue={sort} className="vendors-sort-select">
                  <option value="name">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                  <option value="count-high">Most classes</option>
                  <option value="count-low">Fewest classes</option>
                </select>
                <button type="submit" className="vendors-sort-apply">
                  Apply
                </button>
              </form>
            </div>

            {counties.length > 0 ? (
              <div role="list" className="popular-vendors-redesign__grid vendors-results-grid">
                {counties.map((slug) => {
                  const name = getCountyDisplayName(slug);
                  const imageUrl = getCountyImageUrl(slug);
                  const vendorCount = vendorCountsByCounty[slug] ?? 0;
                  return (
                    <Link
                      key={slug}
                      href={`/ca/${slug}`}
                      role="listitem"
                      className="popular-vendors-redesign__card county-result-card"
                    >
                      <div className="county-result-card__media">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={`${name} County`}
                            fill
                            className="county-result-card__image"
                            sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="county-result-card__placeholder" aria-hidden="true">
                            {name}
                          </div>
                        )}
                      </div>
                      <div className="popular-vendors-redesign__featured">County</div>
                      <div className="popular-vendors-redesign__title-row">
                        <h3 className="popular-vendors-redesign__title">{name} County</h3>
                      </div>
                      <div className="popular-vendors-redesign__prices">
                        <div>
                          <div className="popular-vendors-redesign__price">{vendorCount}</div>
                          <div className="popular-vendors-redesign__price-label">CCW instructors</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state w-dyn-empty">
                <div>
                  {query && nameFiltered.length > 0 ? (
                    <>
                      No counties matching &quot;{query}&quot; currently have listed CCW classes.{" "}
                      <Link href="/ca" className="font-medium underline">
                        Clear search
                      </Link>
                      .
                    </>
                  ) : query ? (
                    <>
                      No counties match &quot;{query}&quot;. Try adjusting your filters or{" "}
                      <Link href="/ca" className="font-medium underline">
                        view all counties
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      There are no counties with listed CCW classes yet.{" "}
                      <Link href="/" className="font-medium underline">
                        Back to home
                      </Link>
                      .
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
