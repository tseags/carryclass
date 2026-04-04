import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VendorsFilterBarWebflow } from "@/components/VendorsFilterBarWebflow";
import { VendorCardWebflow } from "@/components/VendorCardWebflow";
import { VendorsMapDynamic } from "@/components/VendorsMapDynamic";
import { GearCtaSection } from "@/components/GearCtaSection";
import { getAllVendors, getAllUniqueCities } from "@/lib/vendors-db";
import { filterVendors } from "@/lib/filter-vendors";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Find California CCW Instructors & Approved Training Vendors",
  description:
    "Browse all sheriff-approved CCW instructors in California. Filter by county, class type, pricing, availability, or in-person/virtual options.",
};

export default async function VendorsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const filters = {
    county: resolved.county as string | undefined,
    city: resolved.city as string | undefined,
    classType: resolved.classType as "initial" | "renewal" | "both" | undefined,
    format: resolved.format as "in-person" | "online" | "hybrid" | undefined,
    priceMax: resolved.priceMax ? Number(resolved.priceMax) : undefined,
    search: resolved.search as string | undefined,
  };

  const allVendors = await getAllVendors();
  const allCities = await getAllUniqueCities();
  let vendors = filterVendors(allVendors, filters);
  const sort = resolved.sort as string | undefined;
  if (sort === "name") {
    vendors = [...vendors].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "name-desc") {
    vendors = [...vendors].sort((a, b) => b.name.localeCompare(a.name));
  } else if (sort === "price-low") {
    vendors = [...vendors].sort((a, b) => (a.priceMin ?? 0) - (b.priceMin ?? 0));
  } else if (sort === "price-high") {
    vendors = [...vendors].sort((a, b) => (b.priceMax ?? 0) - (a.priceMax ?? 0));
  }

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
                  Find CCW Courses
                </span>
              </nav>
            </div>
            <h1 className="mg-bottom-12px vendors-hero-title">
              <span className="vendors-hero-title-line">Find California CCW Instructors</span>
              <br aria-hidden="true" />
              <span className="vendors-hero-title-line">&amp; Approved Training Vendors</span>
            </h1>
            <p className="paragraph-5 vendors-hero-description vendors-hero-description--two-lines">
              <span className="vendors-hero-description-line">
                Browse sheriff-approved CCW instructors statewide. Filter by county, class type, price, format,
              </span>
              <br aria-hidden="true" />
              <span className="vendors-hero-description-line">
                and availability. Find the right instructor for your initial or renewal training.
              </span>
            </p>
          </div>

          <div className="mg-top-40px">
            <VendorsFilterBarWebflow allCities={allCities} />
          </div>
        </div>
      </section>

      <div className="vendors-page-content">
        <section className="section-4 vendors-map-section" aria-label="Vendor locations map">
          <div className="w-layout-blockcontainer container-3 w-container">
            <div className="map-3 w-widget w-widget-map" role="region" title="Vendor locations">
              <VendorsMapDynamic vendors={vendors} hasFilter={!!(resolved.county || resolved.city)} />
            </div>
          </div>
        </section>

        <section className="section vendors-list-section" aria-label="Vendor list">
          <div className="container-default w-container">
            <div className="w-dyn-list">
              <div role="list" className="vendors-grid">
                {vendors.map((vendor) => (
                  <VendorCardWebflow key={vendor.id} vendor={vendor} />
                ))}
              </div>
              {vendors.length === 0 && (
                <div className="empty-state w-dyn-empty">
                  <div>No instructors match your search. Try adjusting your filters.</div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <GearCtaSection />

      <Footer />
    </>
  );
}
