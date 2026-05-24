import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PopularVendorCard } from "@/components/PopularVendorCard";
import { VendorsMapDynamic } from "@/components/VendorsMapDynamic";
import { VendorsCountyCityDropdowns } from "@/components/VendorsCountyCityDropdowns";
import { VendorsSidebarPriceSelect } from "@/components/VendorsSidebarPriceSelect";
import { CALIFORNIA_COUNTIES, getCountyDisplayName } from "@/data/counties";
import { geocodeWithNominatim } from "@/lib/nominatim-geocode";
import { sortCountyListingVendors } from "@/lib/county-listing-sort";
import { resolveVendorMapPins } from "@/lib/vendor-map-pins";
import { getCitiesForCountyFilter, queryVendorsForListing } from "@/lib/vendors-db";
import { getCurrentUserSavedVendorIds } from "@/lib/saved-vendors";
import { getApprovedReviewStatsByVendorIds } from "@/lib/vendor-reviews";
import type { CourseCategory } from "@/types";

const CATEGORY_FILTER_OPTIONS: { value: "" | CourseCategory; label: string }[] = [
  { value: "", label: "All categories" },
  { value: "initial", label: "16-Hour Initial" },
  { value: "renewal", label: "8-Hour Renewal" },
  { value: "add-gun", label: "Add a Gun" },
  { value: "online", label: "Virtual Classes" },
];

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CCW Classes Near Me | California CCW Instructors",
  description:
    "Browse all sheriff-approved CCW instructors in California. Filter by county, class type, price, or format to find CCW classes near you.",
};

export default async function VendorsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;

  const priceListedOnly = resolved.priceListed === "1";
  let priceMax: number | undefined;
  if (!priceListedOnly && resolved.priceMax) {
    const n = Number(resolved.priceMax);
    priceMax = Number.isFinite(n) ? n : undefined;
  }

  const filters = {
    county: resolved.county as string | undefined,
    city: resolved.city as string | undefined,
    classType: resolved.classType as "initial" | "renewal" | "both" | undefined,
    format: resolved.format as "in-person" | "online" | "hybrid" | undefined,
    category: resolved.category as "initial" | "renewal" | "add-gun" | "online" | undefined,
    priceMax,
    priceListedOnly,
    search: resolved.search as string | undefined,
  };

  const sort = resolved.sort as string | undefined;
  const allSavedIds = new Set(await getCurrentUserSavedVendorIds());
  const cityOptions = await getCitiesForCountyFilter(filters.county);
  const vendorsFromQuery = await queryVendorsForListing(filters, sort);

  const listingReviewStats = await getApprovedReviewStatsByVendorIds(
    vendorsFromQuery.map((v) => v.id)
  );
  const vendors = sortCountyListingVendors(vendorsFromQuery, listingReviewStats, sort);

  const view: "list" | "map" = resolved.view === "map" ? "map" : "list";
  const savedIds = new Set(
    [...allSavedIds].filter((id) =>
      vendors.some((vendor) => vendor.id === id)
    )
  );

  const hasFilter = Boolean(
    filters.county ||
      filters.city ||
      filters.classType ||
      filters.format ||
      filters.category ||
      filters.priceMax != null ||
      filters.priceListedOnly ||
      (filters.search && filters.search.trim().length > 0)
  );

  const mapPins =
    view === "map" && vendors.length > 0
      ? await resolveVendorMapPins(vendors, { geocode: geocodeWithNominatim })
      : [];

  const buildViewHref = (nextView: "list" | "map") => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.county) params.set("county", filters.county);
    if (filters.city) params.set("city", filters.city);
    if (filters.classType) params.set("classType", filters.classType);
    if (filters.format) params.set("format", filters.format);
    if (filters.category) params.set("category", filters.category);
    if (filters.priceMax != null) params.set("priceMax", String(filters.priceMax));
    if (filters.priceListedOnly) params.set("priceListed", "1");
    if (sort) params.set("sort", sort);
    params.set("view", nextView);
    const qs = params.toString();
    return qs ? `/instructors?${qs}` : "/instructors";
  };

  return (
    <>
      <Header />
      <section className="section-3 vendors-hero">
        <div className="w-layout-blockcontainer container-2 w-container">
          <div className="div-block-10 vendors-hero-content">
            <div className="vendors-hero-breadcrumb-row vendors-hero-breadcrumb-row--above-title">
              <nav className="vendors-hero-breadcrumb text-sm" aria-label="Breadcrumb">
                <Link href="/" className="hover:underline">Home</Link>
                <span className="mx-2" aria-hidden="true">/</span>
                <span className="vendors-hero-breadcrumb-current" aria-current="page">
                  Find CCW Classes
                </span>
              </nav>
            </div>
            <h1 className="mg-bottom-12px vendors-hero-title">
              <span className="vendors-hero-title-line">Find California CCW Instructors</span>
            </h1>
            <p className="paragraph-5 vendors-hero-description vendors-hero-description--two-lines">
              <span className="vendors-hero-description-line">
                Browse sheriff-approved CCW instructors statewide. Filter by county, class type, price, and format.
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="vendors-results-shell" aria-label="Instructor list and filters">
        <div className="vendors-results-layout">
          <aside className="vendors-filters-sidebar">
            <div className="vendors-filters-card">
              <div className="vendors-filters-head">
                <h2>Filters</h2>
                <Link href="/instructors">Clear all</Link>
              </div>
              <form action="/instructors" method="get" className="vendors-filters-form">
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
                  initialCounty={filters.county}
                  initialCity={filters.city}
                  counties={CALIFORNIA_COUNTIES.map((county) => ({
                    value: county,
                    label: getCountyDisplayName(county),
                  }))}
                  cities={cityOptions}
                />

                <div className="vendors-filter-group">
                  <span id="vendors-price-heading">Price</span>
                  <VendorsSidebarPriceSelect
                    selectId="vendors-price-select"
                    ariaLabelledBy="vendors-price-heading"
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

                <label className="vendors-filter-group">
                  <span>Category</span>
                  <select name="category" defaultValue={filters.category ?? ""}>
                    {CATEGORY_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value || "all"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                {sort && <input type="hidden" name="sort" value={sort} />}
                <input type="hidden" name="view" value={view} />
                <button type="submit" className="btn-primary w-button vendors-filters-submit">
                  Apply filters
                </button>
              </form>
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

                <form action="/instructors" method="get" className="vendors-sort-group">
                  {filters.search && <input type="hidden" name="search" value={filters.search} />}
                  {filters.county && <input type="hidden" name="county" value={filters.county} />}
                  {filters.city && <input type="hidden" name="city" value={filters.city} />}
                  {filters.classType && (
                    <input type="hidden" name="classType" value={filters.classType} />
                  )}
                  {filters.format && <input type="hidden" name="format" value={filters.format} />}
                  {filters.category && (
                    <input type="hidden" name="category" value={filters.category} />
                  )}
                  {filters.priceMax != null && (
                    <input type="hidden" name="priceMax" value={String(filters.priceMax)} />
                  )}
                  {filters.priceListedOnly && (
                    <input type="hidden" name="priceListed" value="1" />
                  )}
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
              <>
                <div className="popular-vendors-redesign__grid vendors-results-grid">
                  {vendors.map((vendor) => {
                    const servedCounty = filters.county
                      ? getCountyDisplayName(filters.county)
                      : vendor.countiesServed[0]
                        ? getCountyDisplayName(vendor.countiesServed[0])
                        : getCountyDisplayName(vendor.county);
                    return (
                      <PopularVendorCard
                        key={vendor.id}
                        vendor={vendor}
                        listingReviews={listingReviewStats.get(vendor.id) ?? null}
                        servedCounty={servedCounty}
                        showFeaturedBadge={Boolean(vendor.featured)}
                        initialSaved={savedIds.has(vendor.id)}
                      />
                    );
                  })}
                </div>
                {vendors.length === 0 && (
                  <div className="empty-state w-dyn-empty">
                    <div>
                      No instructors match your search. Try adjusting your filters.
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="vendors-results-map" aria-label="Instructor map">
                {vendors.length > 0 ? (
                  <VendorsMapDynamic pins={mapPins} hasFilter={hasFilter} />
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

      <Footer />
    </>
  );
}
