import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VendorCard } from "@/components/VendorCard";
import { getVendorBySlug, VENDORS } from "@/data/vendors";
import { getCountyDisplayName } from "@/data/counties";

const GEAR_ITEMS = [
  { label: "Firearm", icon: "gun" },
  { label: "Eye protection", icon: "safety-glasses" },
  { label: "Belt", icon: "belt" },
  { label: "100 rounds (+50 per extra gun)", icon: "bullet" },
  { label: "Spare magazine", icon: "magazine" },
  { label: "6 snap caps", icon: "bullet" },
  { label: "Ear protection", icon: "ear-muff" },
  { label: "Holster", icon: "holster" },
  { label: "Gun case", icon: "gun-case" },
];

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const vendor = getVendorBySlug(slug);
  if (!vendor) return {};
  return {
    title: `${vendor.name} | CCW Training`,
    description: vendor.description ?? `${vendor.name} - CCW training in ${vendor.city}, ${getCountyDisplayName(vendor.county)} County.`,
  };
}

export default async function VendorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const vendor = getVendorBySlug(slug);

  if (!vendor) {
    notFound();
  }

  // Other vendors (exclude current)
  const otherVendors = VENDORS.filter((v) => v.slug !== slug).slice(0, 3);

  const locationDisplay = vendor.address
    ? `${vendor.city}, ${vendor.state} | ${vendor.address}`
    : `${vendor.city}, ${getCountyDisplayName(vendor.county)} County`;

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-700">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/vendors" className="hover:text-zinc-700">
            Find CCW Courses
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-900">{vendor.name}</span>
        </nav>

        {/* Vendor info + Map - two column */}
        <section className="mb-12 rounded-xl border border-zinc-200 bg-zinc-100 p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
                {vendor.name}
              </h1>
              {vendor.description && (
                <p className="mt-4 text-zinc-600">{vendor.description}</p>
              )}
              <p className="mt-4 flex items-center gap-2 text-sm text-zinc-600">
                <svg
                  className="h-4 w-4 shrink-0 text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                </svg>
                {locationDisplay}
              </p>
              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-block rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Website
                </a>
              )}
            </div>
            <div className="relative min-h-[240px] overflow-hidden rounded-lg bg-zinc-200">
              <div className="flex h-full items-center justify-center">
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-zinc-500">
                    Map preview
                  </p>
                  <p className="text-xs text-zinc-400">
                    View actual map on published site
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content - 2 cols */}
          <div className="lg:col-span-2 space-y-12">
            {/* CCW Course Pricing */}
            <section>
              <h2 className="text-xl font-bold text-zinc-900">
                CCW Course Pricing
              </h2>
              {vendor.discountInfo && (
                <p className="mt-2 text-sm text-zinc-500">
                  {vendor.discountInfo}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-4">
                {(vendor.priceInitial || vendor.classTypes.includes("initial") || vendor.classTypes.includes("both")) && (
                  <div className="min-w-[140px] rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="font-semibold text-zinc-900">
                      16 Hour Initial
                    </p>
                    <p className="mt-1 text-zinc-700">
                      ${vendor.priceInitial ?? vendor.priceMax ?? vendor.priceMin ?? "—"}
                    </p>
                  </div>
                )}
                {(vendor.priceRenewal || vendor.classTypes.includes("renewal") || vendor.classTypes.includes("both")) && (
                  <div className="min-w-[140px] rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="font-semibold text-zinc-900">
                      8 Hour Initial or Renewal
                    </p>
                    <p className="mt-1 text-zinc-700">
                      ${vendor.priceRenewal ?? vendor.priceMin ?? vendor.priceMax ?? "—"}
                    </p>
                  </div>
                )}
                {vendor.priceAddGun && (
                  <div className="min-w-[140px] rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="font-semibold text-zinc-900">
                      Add a Gun to CCW
                    </p>
                    <p className="mt-1 text-zinc-700">${vendor.priceAddGun}</p>
                  </div>
                )}
              </div>
            </section>

            {/* About the experience */}
            {vendor.description && (
              <section>
                <h2 className="text-xl font-bold text-zinc-900">
                  About the experience
                </h2>
                <p className="mt-4 text-zinc-600">{vendor.description}</p>
              </section>
            )}

            {/* Gear Needed */}
            <section>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-zinc-900">
                  Gear Needed for CCW Course
                </h2>
                <Link
                  href="/gear"
                  className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Buy Gear
                </Link>
              </div>
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {GEAR_ITEMS.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white">
                        <Image
                          src={`/icons/${item.icon}.png`}
                          alt=""
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </div>
                      <span className="text-sm text-zinc-700">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar - Instructor info */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-zinc-900">
                Instructor information
              </h3>
              <div className="mt-4 space-y-3">
                {vendor.phone && (
                  <p className="flex items-center gap-2 text-sm text-zinc-600">
                    <svg
                      className="h-4 w-4 shrink-0 text-zinc-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <a href={`tel:${vendor.phone}`} className="hover:underline">
                      {vendor.phone}
                    </a>
                  </p>
                )}
                {vendor.address && (
                  <p className="flex items-center gap-2 text-sm text-zinc-600">
                    <svg
                      className="h-4 w-4 shrink-0 text-zinc-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                    </svg>
                    {vendor.address}
                  </p>
                )}
                {vendor.email && (
                  <p className="flex items-center gap-2 text-sm text-zinc-600">
                    <svg
                      className="h-4 w-4 shrink-0 text-zinc-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <a href={`mailto:${vendor.email}`} className="hover:underline">
                      {vendor.email}
                    </a>
                  </p>
                )}
              </div>
              <div className="mt-6 space-y-3">
                {vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-lg border border-zinc-300 py-2.5 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Website
                  </a>
                )}
                <Link
                  href="/vendors"
                  className="block w-full rounded-lg bg-zinc-900 py-2.5 text-center text-sm font-medium text-white hover:bg-zinc-800"
                >
                  View More
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Browse other vendors */}
        <section className="mt-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-zinc-900">
              Browse other approved CCW vendors
            </h2>
            <Link
              href="/vendors"
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              View all
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {otherVendors.map((v) => (
              <VendorCard key={v.id} vendor={v} variant="outline" />
            ))}
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
