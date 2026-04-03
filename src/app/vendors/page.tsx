import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VendorCard } from "@/components/VendorCard";
import { VendorsSearchBar } from "@/components/VendorsSearchBar";
import { VENDORS } from "@/data/vendors";
import { filterVendors } from "@/lib/filter-vendors";
import { COUNTY_DISPLAY_NAMES } from "@/data/counties";
import { CALIFORNIA_COUNTIES } from "@/data/counties";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

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

  let vendors = filterVendors(VENDORS, filters);
  const sort = resolved.sort as string | undefined;
  if (sort === "name") {
    vendors = [...vendors].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "price-low") {
    vendors = [...vendors].sort((a, b) => (a.priceMin ?? 0) - (b.priceMin ?? 0));
  } else if (sort === "price-high") {
    vendors = [...vendors].sort((a, b) => (b.priceMax ?? 0) - (a.priceMax ?? 0));
  }

  const countyOptions = CALIFORNIA_COUNTIES.map((slug) => ({
    slug,
    name: COUNTY_DISPLAY_NAMES[slug] ?? slug,
  }));

  return (
    <>
      <Header />
      <section className="section-3">
        <div className="w-layout-blockcontainer container-2 w-container">
          <div className="div-block-10">
            <nav className="vendors-hero-breadcrumb mg-bottom-12px text-sm">
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <span className="mx-2">/</span>
              <span className="text-zinc-900">Find CCW Courses</span>
            </nav>
            <h1 className="mg-bottom-12px">Find California CCW Instructors &amp; Approved Training Vendors</h1>
            <p className="paragraph-5">
              Browse all sheriff-approved CCW instructors in California. Filter by county, class type,
              pricing, availability, or in-person/virtual options to find the right instructor for your
              initial or renewal training.
            </p>
          </div>
          <VendorsSearchBar counties={countyOptions} />
        </div>
      </section>

      <section className="section-4">
        <div className="w-layout-blockcontainer container-3 w-container">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
            <div className="flex h-48 items-center justify-center text-zinc-500">
              <div className="text-center">
                <p className="text-sm font-medium">Map preview</p>
                <p className="text-xs text-zinc-400">Interactive map coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section bg-neutral-200">
        <div className="container-default w-container">
          <div className="w-dyn-list">
            {vendors.length > 0 ? (
              <div role="list" className="grid-3-columns w-dyn-items">
                {vendors.map((vendor) => (
                  <div key={vendor.id} role="listitem" className="w-dyn-item">
                    <VendorCard vendor={vendor} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state w-dyn-empty">
                <div>No instructors match your search. Try adjusting your filters.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
