import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VendorCardWebflow } from "@/components/VendorCardWebflow";
import { VendorReviewsSection } from "@/components/VendorReviewsSection";
import { VendorPhotoGrid } from "@/components/VendorPhotoGrid";
import { getVendorBySlug, getAllVendors } from "@/lib/vendors-db";
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
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return {};
  return {
    title: `${vendor.name} | CCW Training`,
    description: vendor.description ?? `${vendor.name} - CCW training in ${vendor.city}, ${getCountyDisplayName(vendor.county)} County.`,
  };
}

export default async function VendorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);

  if (!vendor) {
    notFound();
  }

  // Other vendors (exclude current)
  const allVendors = await getAllVendors();
  const otherVendors = allVendors.filter((v) => v.slug !== slug).slice(0, 3);

  const mapQuery = vendor.address
    ? `${vendor.address}, ${vendor.city}, ${vendor.state}`
    : `${vendor.city}, ${vendor.state}, USA`;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&hl=en&output=embed`;
  const heroButtonClassName = "btn-primary bg-secondary-2 small w-button match-header-btn mt-6 inline-block text-center";

  return (
    <div className="min-h-screen bg-white">
      <Header />
      {/* Hero: full-width grey bar from below header; breadcrumb + content inside */}
      <section className="vendor-profile-hero relative left-1/2 -translate-x-1/2 w-screen mb-14 bg-zinc-100 pb-8 sm:pb-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav className="mb-6 pt-[var(--header-offset)] text-sm text-zinc-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-zinc-800">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/vendors" className="hover:text-zinc-800">
              Vendors
            </Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-900 font-medium">{vendor.name}</span>
          </nav>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10 lg:items-stretch">
            <div className="flex flex-col justify-center">
              <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
                {vendor.name}
              </h1>
              {vendor.description && (
                <p className="mt-4 text-zinc-700 leading-relaxed line-clamp-3">
                  {vendor.description}
                </p>
              )}
              <p className="mt-4 flex items-center gap-2 text-sm text-zinc-600">
                <svg
                  className="h-5 w-5 shrink-0 text-zinc-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                {vendor.address ? (
                  <>
                    <strong className="font-semibold text-zinc-700">{vendor.city}, {vendor.state} |</strong>{" "}{vendor.address}
                  </>
                ) : (
                  <strong className="font-semibold text-zinc-700">{vendor.city}, {getCountyDisplayName(vendor.county)} County</strong>
                )}
              </p>
              {vendor.acceptsBookings ? (
                <Link
                  href={`/vendors/${vendor.slug}/book`}
                  className={heroButtonClassName}
                >
                  Book Now
                </Link>
              ) : (
                vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${heroButtonClassName} self-start`}
                  >
                    Visit website
                  </a>
                )
              )}
            </div>
            <div
              data-hero-image-wrapper
              className="relative w-full overflow-hidden rounded-xl border border-zinc-300 bg-zinc-200 shadow-sm aspect-[4/3] min-h-[200px]"
              aria-label={`Map: ${vendor.name} location`}
            >
              <iframe
                title={`Map: ${vendor.name} location`}
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                className="absolute inset-0 h-full w-full border-0"
                allowFullScreen
                loading="eager"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      <main className="vendor-profile-main mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-12">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* Main content - 2 cols */}
          <div className="lg:col-span-2 space-y-14">
            {/* CCW Course Pricing */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-semibold text-zinc-800">
                CCW Course Pricing
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {(vendor.priceInitial || vendor.classTypes.includes("initial") || vendor.classTypes.includes("both")) && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5 text-center">
                    <span className="block text-2xl font-bold tabular-nums text-zinc-900">
                      ${vendor.priceInitial ?? vendor.priceMax ?? vendor.priceMin ?? "—"}
                    </span>
                    <span className="mt-1 block text-sm font-medium text-zinc-600">16hr Initial</span>
                  </div>
                )}
                {(vendor.priceRenewal || vendor.classTypes.includes("renewal") || vendor.classTypes.includes("both")) && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5 text-center">
                    <span className="block text-2xl font-bold tabular-nums text-zinc-900">
                      ${vendor.priceRenewal ?? vendor.priceMin ?? vendor.priceMax ?? "—"}
                    </span>
                    <span className="mt-1 block text-sm font-medium text-zinc-600">8hr Renewal</span>
                  </div>
                )}
                {vendor.priceAddGun && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5 text-center">
                    <span className="block text-2xl font-bold tabular-nums text-zinc-900">
                      ${vendor.priceAddGun}
                    </span>
                    <span className="mt-1 block text-sm font-medium text-zinc-600">Add a gun</span>
                  </div>
                )}
              </div>
            </section>

            {/* About the experience */}
            {(vendor.description || (vendor.photos && vendor.photos.length > 0)) && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-lg font-semibold text-zinc-800">
                  About the Experience
                </h2>
                {vendor.description && (
                  <p className="mt-4 text-zinc-700 leading-relaxed">{vendor.description}</p>
                )}
                {vendor.photos && vendor.photos.length > 0 && (
                  <VendorPhotoGrid photos={vendor.photos} vendorName={vendor.name} />
                )}
              </section>
            )}

            {/* Gear Needed */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-zinc-800">
                  Gear Needed
                </h2>
                <Link
                  href="/gear"
                  className="btn-primary bg-secondary-2 small w-button"
                >
                  Buy Gear
                </Link>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {GEAR_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 pl-3 pr-4"
                  >
                    <div className="vendor-gear-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-md shadow-sm">
                      <Image
                        src={`/icons/${item.icon}.png`}
                        alt=""
                        width={22}
                        height={22}
                        className="vendor-gear-icon-img object-contain"
                      />
                    </div>
                    <span className="text-sm font-medium text-white">{item.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar - Instructor info */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border-2 border-zinc-200 bg-white p-6 shadow-md vendor-profile-contact-card-sticky md:sticky md:top-[calc(var(--header-offset)+1rem)]">
              <h3 className="text-sm font-semibold text-zinc-800">
                Contact
              </h3>
              <div className="mt-4 space-y-4">
                {vendor.phone && (
                  <p className="flex items-center gap-2 text-sm text-zinc-800">
                    <svg
                      className="h-4 w-4 shrink-0 text-zinc-500"
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
                    <a href={`tel:${vendor.phone}`} className="font-medium hover:underline">
                      {vendor.phone}
                    </a>
                  </p>
                )}
                {vendor.address && (
                  <p className="flex items-center gap-2 text-sm text-zinc-800">
                    <svg
                      className="h-4 w-4 shrink-0 text-zinc-500"
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
                  <p className="flex items-center gap-2 text-sm text-zinc-800">
                    <svg
                      className="h-4 w-4 shrink-0 text-zinc-500"
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
                    <a href={`mailto:${vendor.email}`} className="font-medium hover:underline">
                      {vendor.email}
                    </a>
                  </p>
                )}
              </div>
              {vendor.website && (
                <div className="mt-6">
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-xl border-2 border-zinc-200 py-3 text-center text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    Website
                  </a>
                </div>
              )}
              <div className="mt-6 border-t border-zinc-200 pt-4">
                <p className="text-xs text-zinc-600">
                  Are you the owner or instructor for this business?{" "}
                  <Link
                    href="/vendors/claim"
                    className="font-semibold text-[var(--navy)] underline-offset-2 hover:underline"
                  >
                    Claim this listing
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews - Google reviews when place_id is set */}
        <VendorReviewsSection vendor={vendor} />

        {/* More approved vendors - full-width grey band, not a card */}
        <section className="relative left-1/2 -translate-x-1/2 w-screen mt-16 bg-zinc-100 py-8 sm:py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-zinc-800">
                More Approved Vendors
              </h2>
              <Link
                href="/vendors"
                className="btn-primary bg-secondary-2 small w-button"
              >
                View all
              </Link>
            </div>
            <div role="list" className="vendors-grid mt-6">
              {otherVendors.map((v) => (
                <VendorCardWebflow key={v.id} vendor={v} />
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
