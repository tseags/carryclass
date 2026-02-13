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
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <nav className="mb-8 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-700">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-900">Find CCW Courses</span>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Find California CCW Instructors & Approved Training Vendors
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-600">
          Browse all sheriff-approved CCW instructors in California. Filter by
          county, class type, pricing, availability, or in-person/virtual options
          to find the right instructor for your initial or renewal training.
        </p>

        <div className="mt-6">
          <VendorsSearchBar counties={countyOptions} />
        </div>

        {/* Map placeholder */}
        <div className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
          <div className="flex h-48 items-center justify-center text-zinc-500">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <p className="mt-2 text-sm">Map preview</p>
              <p className="text-xs text-zinc-400">
                Interactive map coming soon
              </p>
            </div>
          </div>
        </div>

        {/* Vendor grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.length > 0 ? (
            vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))
          ) : (
            <div className="col-span-full rounded-lg border border-zinc-200 bg-white p-8 text-center">
              <p className="text-zinc-600">
                No instructors match your search. Try adjusting your filters.
              </p>
            </div>
          )}
        </div>

        <Footer />
      </main>
    </div>
  );
}
