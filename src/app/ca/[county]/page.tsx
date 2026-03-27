import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VendorCard } from "@/components/VendorCard";
import { FilterBar } from "@/components/FilterBar";
import { getCountyDisplayName, isValidCountySlug } from "@/data/counties";
import {
  getVendorsByCounty,
  getUniqueCitiesInCounty,
} from "@/data/vendors";
import { filterVendors } from "@/lib/filter-vendors";
import { COUNTY_DISPLAY_NAMES } from "@/data/counties";
import { CALIFORNIA_COUNTIES } from "@/data/counties";
import { getCountyImageUrl } from "@/data/county-images";
import { CountyStatsSection } from "@/components/CountyStatsSection";

interface PageProps {
  params: Promise<{ county: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { county } = await params;
  if (!isValidCountySlug(county)) return {};
  const displayName = getCountyDisplayName(county);
  return {
    title: `CCW Training in ${displayName} County, CA`,
    description: `Find CCW training classes and instructors in ${displayName} County, California. Compare prices, schedules, and formats.`,
  };
}

export async function generateStaticParams() {
  return CALIFORNIA_COUNTIES.map((county) => ({ county }));
}

export default async function CountyPage({ params, searchParams }: PageProps) {
  const { county } = await params;
  const resolvedSearchParams = await searchParams;

  if (!isValidCountySlug(county)) {
    notFound();
  }

  const displayName = getCountyDisplayName(county);
  const allVendors = getVendorsByCounty(county);
  const cities = getUniqueCitiesInCounty(county);

  const filters = {
    county,
    city: resolvedSearchParams.city as string | undefined,
    classType: resolvedSearchParams.classType as "initial" | "renewal" | "both" | undefined,
    format: resolvedSearchParams.format as "in-person" | "online" | "hybrid" | undefined,
    priceMax: resolvedSearchParams.priceMax
      ? Number(resolvedSearchParams.priceMax)
      : undefined,
    search: resolvedSearchParams.search as string | undefined,
  };

  const vendors = filterVendors(allVendors, filters);

  const countyOptions = CALIFORNIA_COUNTIES.map((slug) => ({
    slug,
    name: COUNTY_DISPLAY_NAMES[slug] ?? slug,
  }));

  const countyImage = getCountyImageUrl(county);

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main>
        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
          <nav className="mb-8 text-sm text-zinc-500">
            <Link href="/" className="hover:text-zinc-700">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/ca" className="hover:text-zinc-700">
              Counties
            </Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-900">{displayName} County</span>
          </nav>

          <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                CCW Training in {displayName} County
              </h1>
              <p className="mt-2 text-zinc-600">
                {vendors.length} {vendors.length === 1 ? "instructor" : "instructors"}{" "}
                serving {displayName} County. Use filters to narrow your search.
              </p>
            </div>
            {countyImage && (
              <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={countyImage}
                  alt={displayName}
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <CountyStatsSection
          vendors={allVendors}
          countyDisplayName={displayName}
        />

        <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pb-12 sm:pt-12">
          <div className="mb-8">
            <FilterBar
              countySlug={county}
              counties={countyOptions}
              cities={cities}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.length > 0 ? (
              vendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))
            ) : (
              <div className="col-span-full rounded-lg border border-zinc-200 bg-white p-8 text-center">
                <p className="text-zinc-600">
                  No instructors match your filters. Try adjusting your criteria or{" "}
                  <Link href={`/ca/${county}`} className="font-medium text-zinc-900 hover:underline">
                    clear filters
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>

          <Footer />
        </div>
      </main>
    </div>
  );
}
