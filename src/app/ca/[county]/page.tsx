import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SmoothScrollTo } from "@/components/SmoothScrollTo";
import { PopularVendorCard } from "@/components/PopularVendorCard";
import { VendorsCountyCityDropdowns } from "@/components/VendorsCountyCityDropdowns";
import { VendorsSidebarPriceSelect } from "@/components/VendorsSidebarPriceSelect";
import { VendorsMapDynamic } from "@/components/VendorsMapDynamic";
import {
  getCountyDisplayName,
  isValidCountySlug,
  CALIFORNIA_COUNTIES,
} from "@/data/counties";
import {
  getCitiesForCountyFilter,
  getVendorsByCounty,
  queryVendorsForListing,
} from "@/lib/vendors-db";
import { getCountyImageUrl } from "@/data/county-images";
import { GearCtaSection } from "@/components/GearCtaSection";
import { CountyStatsSection } from "@/components/CountyStatsSection";
import { CcwTimelineSection } from "@/components/CcwTimelineSection";
import { countyHasTimelineData, getCcwTimelineForCounty } from "@/lib/ccw-timeline-db";
import { getCurrentUserSavedVendorIds } from "@/lib/saved-vendors";
import { SHOW_GEAR_SECTIONS } from "@/lib/feature-flags";
import { getApprovedReviewStatsByVendorIds } from "@/lib/vendor-reviews";
import { sortCountyListingVendors } from "@/lib/county-listing-sort";
import { geocodeWithNominatim } from "@/lib/nominatim-geocode";
import { resolveVendorMapPins } from "@/lib/vendor-map-pins";
import type { Metadata } from "next";
import { canonicalForFilteredListing, pageMetadata } from "@/lib/seo";
import { countyBreadcrumbJsonLd } from "@/lib/json-ld";
import { JsonLd } from "@/components/JsonLd";

interface PageProps {
  params: Promise<{ county: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { county } = await params;
  if (!isValidCountySlug(county)) return {};
  const resolved = await searchParams;
  const displayName = getCountyDisplayName(county);
  const path = `/ca/${county}`;
  const title = `${displayName} County CCW Classes`;
  const description = `Find sheriff-approved CCW classes in ${displayName} County, CA. Compare pricing, schedules, and formats for initial and renewal training.`;

  return pageMetadata({
    title,
    description,
    path,
    canonical: canonicalForFilteredListing(path, resolved),
  });
}

export async function generateStaticParams() {
  return CALIFORNIA_COUNTIES.map((county) => ({ county }));
}

export default async function CountyPage({ params, searchParams }: PageProps) {
  const { county } = await params;
  const resolved = await searchParams;

  if (!isValidCountySlug(county)) {
    notFound();
  }

  const displayName = getCountyDisplayName(county);
  const allVendors = await getVendorsByCounty(county);

  const priceListedOnly = resolved.priceListed === "1";
  let priceMax: number | undefined;
  if (!priceListedOnly && resolved.priceMax) {
    const n = Number(resolved.priceMax);
    priceMax = Number.isFinite(n) ? n : undefined;
  }

  const filters = {
    county,
    city: resolved.city as string | undefined,
    classType: resolved.classType as "initial" | "renewal" | "both" | undefined,
    format: resolved.format as "in-person" | "online" | "hybrid" | undefined,
    priceMax,
    priceListedOnly,
    search: resolved.search as string | undefined,
  };

  const sort = resolved.sort as string | undefined;
  const view: "list" | "map" = resolved.view === "map" ? "map" : "list";

  const allSavedIds = new Set(await getCurrentUserSavedVendorIds());

  const cityOptions = await getCitiesForCountyFilter(county);

  const vendorsFromQuery = await queryVendorsForListing(filters, sort);

  const listingReviewStats = await getApprovedReviewStatsByVendorIds(
    vendorsFromQuery.map((v) => v.id)
  );
  const vendors = sortCountyListingVendors(vendorsFromQuery, listingReviewStats, sort);

  const savedIds = new Set(
    [...allSavedIds].filter((id) => vendors.some((vendor) => vendor.id === id))
  );

  const countyImage = getCountyImageUrl(county);
  const timelineData = await getCcwTimelineForCounty(county);
  const hasTimelineData = countyHasTimelineData(timelineData);

  const hasActiveFilters = Boolean(
    filters.city ||
      filters.classType ||
      filters.format ||
      filters.priceMax != null ||
      filters.priceListedOnly ||
      (filters.search && filters.search.trim().length > 0)
  );

  const mapPins =
    view === "map" && vendors.length > 0
      ? await resolveVendorMapPins(vendors, { geocode: geocodeWithNominatim })
      : [];

  const countyPath = `/ca/${county}`;
  const buildViewHref = (nextView: "list" | "map") => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.city) params.set("city", filters.city);
    if (filters.classType) params.set("classType", filters.classType);
    if (filters.format) params.set("format", filters.format);
    if (filters.priceMax != null) params.set("priceMax", String(filters.priceMax));
    if (filters.priceListedOnly) params.set("priceListed", "1");
    if (sort) params.set("sort", sort);
    params.set("view", nextView);
    const qs = params.toString();
    return qs ? `${countyPath}?${qs}` : countyPath;
  };

  return (
    <>
      <JsonLd data={countyBreadcrumbJsonLd(county, displayName)} />
      <Header />
      <div className="top-section county-page">
        <div className="container-default w-container">
          <nav className="vendors-hero-breadcrumb mg-bottom-12px text-sm">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/ca" className="hover:underline">
              Counties
            </Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-900">{displayName} County</span>
          </nav>
          <div className="county-hero-row">
            <div className="county-hero-content">
              <h1 className="county-h1">{displayName} County CCW Classes</h1>
              <p className="county-sub-heading">
                Find <strong>sheriff-approved CCW instructors</strong> and{" "}
                <strong>approved concealed carry training classes</strong> in {displayName} County. All
                instructors listed below are approved by the{" "}
                <strong>County Sheriff&apos;s Office</strong> to provide valid training
                certificates for new applicants and renewals. Compare pricing, locations, and
                class options.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <SmoothScrollTo
                  targetId="county-vendors"
                  className="btn-primary bg-secondary-2 small w-button"
                >
                  View Classes
                </SmoothScrollTo>
                <SmoothScrollTo
                  targetId="ccw-timeline"
                  className="btn-secondary small w-button county-hero-timeline-btn"
                >
                  {hasTimelineData ? "View CCW Timelines" : "Submit Wait Times"}
                </SmoothScrollTo>
              </div>
            </div>
            <div className="county-hero-image">
              {countyImage ? (
                <div className="county-hero-image-inner">
                  <Image
                    src={countyImage}
                    alt={`${displayName} County`}
                    fill
                    className="image-4 county-hero-image-fill"
                    sizes="(max-width: 767px) 100vw, min(620px, 48vw)"
                  />
                </div>
              ) : (
                <div
                  className="image-4 county-hero-image-inner county-hero-image-placeholder"
                  aria-hidden
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <CountyStatsSection vendors={allVendors} countyDisplayName={displayName} />

      <section
        id="county-vendors"
        className="vendors-results-shell"
        aria-label={`CCW instructors in ${displayName} County`}
      >
        <div className="vendors-results-layout">
          <aside className="vendors-filters-sidebar">
            <div className="vendors-filters-card">
              <div className="vendors-filters-head">
                <h2>Filters</h2>
                <Link href={countyPath}>Clear all</Link>
              </div>
              <form action={countyPath} method="get" className="vendors-filters-form">
                <label className="vendors-filter-group">
                  <span>Search</span>
                  <input
                    type="search"
                    name="search"
                    defaultValue={filters.search ?? ""}
                    placeholder="Name or keyword"
                  />
                </label>

                <VendorsCountyCityDropdowns
                  initialCity={filters.city}
                  counties={[]}
                  cities={cityOptions}
                  omitCounty
                />

                <div className="vendors-filter-group">
                  <span id={`county-price-heading-${county}`}>Price</span>
                  <VendorsSidebarPriceSelect
                    selectId={`county-price-select-${county}`}
                    ariaLabelledBy={`county-price-heading-${county}`}
                    priceListedOnly={filters.priceListedOnly}
                    priceMax={filters.priceMax}
                  />
                </div>

                <label className="vendors-filter-group">
                  <span>Class type</span>
                  <select name="classType" defaultValue={filters.classType ?? ""}>
                    <option value="">All types</option>
                    <option value="initial">16-hr initial</option>
                    <option value="renewal">8-hr renewal</option>
                    <option value="both">Initial + renewal</option>
                  </select>
                </label>

                <label className="vendors-filter-group">
                  <span>Format</span>
                  <select name="format" defaultValue={filters.format ?? ""}>
                    <option value="">Any format</option>
                    <option value="in-person">In person</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </label>

                <input type="hidden" name="view" value={view} />
                {sort ? <input type="hidden" name="sort" value={sort} /> : null}
                <button type="submit" className="btn-primary w-button vendors-filters-submit">
                  Apply filters
                </button>
              </form>
              <p className="vendors-filter-all-ca-link">
                <Link href={`/instructors?county=${county}`} className="font-medium underline">
                  Search all of California
                </Link>
              </p>
            </div>
          </aside>

          <div className="vendors-results-main">
            <div className="vendors-results-header">
              <div className="vendors-results-header-controls">
                <div
                  className="vendors-view-toggle"
                  role="group"
                  aria-label="Choose how to view results"
                >
                  <Link
                    href={buildViewHref("list")}
                    className="vendors-view-toggle__btn"
                    aria-pressed={view === "list"}
                    aria-label="View results as a list"
                    scroll={false}
                  >
                    <svg
                      className="vendors-view-toggle__icon"
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 3.5h12M2 8h12M2 12.5h12"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>List</span>
                  </Link>
                  <Link
                    href={buildViewHref("map")}
                    className="vendors-view-toggle__btn"
                    aria-pressed={view === "map"}
                    aria-label="View results on a map"
                    scroll={false}
                  >
                    <svg
                      className="vendors-view-toggle__icon"
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 1 0-9 0C3.5 9.8 8 14 8 14Z"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                      <circle cx="8" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                    <span>Map</span>
                  </Link>
                </div>
                <form action={countyPath} method="get" className="vendors-sort-group">
                  {filters.search ? <input type="hidden" name="search" value={filters.search} /> : null}
                  {filters.city ? <input type="hidden" name="city" value={filters.city} /> : null}
                  {filters.classType ? (
                    <input type="hidden" name="classType" value={filters.classType} />
                  ) : null}
                  {filters.format ? <input type="hidden" name="format" value={filters.format} /> : null}
                  {filters.priceMax != null ? (
                    <input type="hidden" name="priceMax" value={String(filters.priceMax)} />
                  ) : null}
                  {filters.priceListedOnly ? (
                    <input type="hidden" name="priceListed" value="1" />
                  ) : null}
                  <input type="hidden" name="view" value={view} />
                  <span>Sort</span>
                  <select name="sort" defaultValue={sort ?? "featured"} className="vendors-sort-select">
                    <option value="featured">Featured first</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                    <option value="name">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                  </select>
                  <button type="submit" className="vendors-sort-apply">
                    Apply
                  </button>
                </form>
              </div>
            </div>

            {view === "list" ? (
              vendors.length > 0 ? (
                <div className="popular-vendors-redesign__grid vendors-results-grid">
                  {vendors.map((vendor) => (
                    <PopularVendorCard
                      key={vendor.id}
                      vendor={vendor}
                      listingReviews={listingReviewStats.get(vendor.id) ?? null}
                      servedCounty={displayName}
                      showFeaturedBadge={Boolean(vendor.featured)}
                      initialSaved={savedIds.has(vendor.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state w-dyn-empty">
                  <div>
                    {allVendors.length === 0 ? (
                      <>No instructors found in this county yet.</>
                    ) : hasActiveFilters ? (
                      <>
                        No instructors match your filters. Try adjusting your criteria or{" "}
                        <Link href={countyPath} className="font-medium underline">
                          clear filters
                        </Link>
                        .
                      </>
                    ) : (
                      <>No instructors match your search.</>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="vendors-results-map" aria-label="Instructor map">
                {vendors.length > 0 ? (
                  <VendorsMapDynamic pins={mapPins} hasFilter={hasActiveFilters} />
                ) : (
                  <div className="vendors-map-empty" role="status">
                    <strong>No matching instructors to map</strong>
                    <p>Try clearing filters or switching back to list view.</p>
                    <Link href={buildViewHref("list")} className="vendors-map-empty__link">
                      Back to list
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <CcwTimelineSection data={timelineData} />

      {SHOW_GEAR_SECTIONS ? <GearCtaSection /> : null}
      <Footer />
    </>
  );
}
