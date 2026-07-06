import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PopularVendorCard } from "@/components/PopularVendorCard";
import { VendorReviewsSection } from "@/components/VendorReviewsSection";
import { VendorHeroMapDynamic } from "@/components/VendorHeroMapDynamic";
import { getVendorBySlug, getRelatedVendorsForProfile } from "@/lib/vendors-db";
import { getCurrentUserSavedVendorIds } from "@/lib/saved-vendors";
import { getApprovedReviewStatsByVendorIds } from "@/lib/vendor-reviews";
import {
  formatCountyContactLabel,
  sortVendorCountyContacts,
} from "@/lib/merge-canonical-vendors";
import { SaveHeartButton } from "@/components/SaveHeartButton";
import { getCountyDisplayName } from "@/data/counties";
import type { VendorCountyContact } from "@/types";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { vendorLocalBusinessJsonLd } from "@/lib/json-ld";
import { JsonLd } from "@/components/JsonLd";
import { buildVendorWebsiteUrl } from "@/lib/vendor-website-url";
import { VendorWebsiteLink } from "@/components/VendorWebsiteLink";

/** Cache public profiles for 24h — crawlers and repeat visitors avoid repeated full DB reads. */
export const revalidate = 86400;

const WHAT_TO_BRING_ITEMS = [
  "Firearm (must be on your permit application)",
  "100 rounds of ammunition",
  "Eye protection (wrap-around)",
  "Ear protection (muffs or plugs)",
  "Holster",
  "Belt (sturdy, designed for carry)",
  "Spare magazine",
  "6 snap caps",
] as const;

const TAB_CONFIG = [
  { id: "about", label: "About" },
  { id: "reviews", label: "Reviews" },
  { id: "what-to-bring", label: "What To Bring" },
] as const;

type VendorTab = (typeof TAB_CONFIG)[number]["id"];
type AvailableCourse = {
  key: string;
  title: string;
  subtitle: string;
  price: string;
};

function getCountyPillClassName(name: string) {
  const len = name.length;
  if (len <= 6) return "px-2.5 py-1 text-[12px] sm:text-[13px]";
  if (len <= 12) return "px-3 py-1.5 text-[13px] sm:text-[14px]";
  return "px-3.5 py-2 text-[12px] sm:text-[13px] leading-snug";
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return {};
  const countyName = getCountyDisplayName(vendor.county);
  const title = vendor.name;
  const description =
    vendor.description ??
    `${vendor.name} offers sheriff-approved CCW classes in ${vendor.city}, ${countyName} County, California. Compare pricing, schedules, and class formats.`;

  return pageMetadata({
    title,
    description,
    path: `/instructors/${slug}`,
    imageUrl: vendor.imageUrl ?? null,
  });
}

export default async function VendorProfilePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const tabRaw = resolvedSearchParams?.tab;
  const selectedTabCandidate = Array.isArray(tabRaw) ? tabRaw[0] : tabRaw;
  const selectedTab: VendorTab = TAB_CONFIG.some((tab) => tab.id === selectedTabCandidate)
    ? (selectedTabCandidate as VendorTab)
    : "about";
  const vendor = await getVendorBySlug(slug);

  if (!vendor) {
    notFound();
  }

  const otherVendors = await getRelatedVendorsForProfile(vendor, 3);
  const otherVendorListingReviews = await getApprovedReviewStatsByVendorIds(
    otherVendors.map((v) => v.id)
  );

  const heroButtonClassName =
    "vendor-profile-hero-cta btn-primary bg-secondary-2 small w-button match-header-btn mt-6 inline-block self-start text-center !bg-[#c96442] !text-white hover:!bg-[#d97757] focus-visible:!bg-[#d97757]";
  const classTypes = vendor.classTypes ?? [];
  const pricingCardsRaw = [
    vendor.priceInitial || classTypes.includes("initial") || classTypes.includes("both")
      ? {
          key: "initial",
          value: `$${vendor.priceInitial ?? vendor.priceMax ?? vendor.priceMin ?? "—"}`,
          description: "16hr Initial",
        }
      : null,
    vendor.priceRenewal || classTypes.includes("renewal") || classTypes.includes("both")
      ? {
          key: "renewal",
          value: `$${vendor.priceRenewal ?? vendor.priceMin ?? vendor.priceMax ?? "—"}`,
          description: "8hr Renewal",
        }
      : null,
    vendor.priceAddGun
      ? {
          key: "add-gun",
          value: `$${vendor.priceAddGun}`,
          description: "Add a gun",
        }
      : null,
  ].filter((card): card is { key: string; value: string; description: string } => card !== null);

  const pricingCards =
    pricingCardsRaw.length > 0
      ? pricingCardsRaw
      : [
          {
            key: "contact-pricing",
            value: "Contact",
            description: "Call or email for current rates",
          },
        ];
  const availableCourses: AvailableCourse[] = pricingCards.map((card) => {
    if (card.key === "initial") {
      return {
        key: card.key,
        title: "16-Hour Initial CCW Class",
        subtitle: "For first-time CCW applicants. Covers safety, laws, handling, and live-fire qualification.",
        price: card.value,
      };
    }
    if (card.key === "renewal") {
      return {
        key: card.key,
        title: "8-Hour Renewal CCW Class",
        subtitle: "For existing permit holders. State-required refresher with live-fire qualification.",
        price: card.value,
      };
    }
    if (card.key === "add-gun") {
      return {
        key: card.key,
        title: "Add a Gun to Permit",
        subtitle: "Add additional firearms to your existing CCW permit.",
        price: card.value,
      };
    }
    return {
      key: card.key,
      title: "CCW Class",
      subtitle: card.description,
      price: card.value,
    };
  });
  const tabHref = (tab: VendorTab) => `/instructors/${vendor.slug}?tab=${tab}`;
  const aboutIntro = vendor.description
    ? vendor.description
    : `${vendor.name} provides CCW instruction in ${vendor.city}, ${getCountyDisplayName(vendor.county)} County.`;
  const showAboutSupportCopy = Boolean(vendor.description);
  const savedVendorIds = await getCurrentUserSavedVendorIds([
    vendor.id,
    ...otherVendors.map((entry) => entry.id),
  ]);
  const initialSaved = savedVendorIds.includes(vendor.id);

  const fallbackContactBlock: VendorCountyContact = {
    counties: vendor.county ? [vendor.county] : vendor.countiesServed.slice(0, 1),
    address: vendor.address,
    phone: vendor.phone,
    city: vendor.city,
  };
  const contactBlocksRaw =
    vendor.countyContacts && vendor.countyContacts.length > 0
      ? vendor.countyContacts
      : fallbackContactBlock.address || fallbackContactBlock.phone
        ? [fallbackContactBlock]
        : [];
  const contactBlocks = sortVendorCountyContacts(contactBlocksRaw);
  const showCountyLabels = contactBlocks.length > 1;
  const vendorWebsiteHeroUrl = vendor.website
    ? buildVendorWebsiteUrl(vendor.website, { vendorSlug: vendor.slug, placement: "hero" })
    : null;
  const vendorWebsiteContactUrl = vendor.website
    ? buildVendorWebsiteUrl(vendor.website, { vendorSlug: vendor.slug, placement: "contact" })
    : null;

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={vendorLocalBusinessJsonLd(vendor)} />
      <Header />
      {/* Hero: full-width grey bar from below header; breadcrumb + content inside */}
      <section className="vendor-profile-hero relative left-1/2 -translate-x-1/2 w-screen pb-8 sm:pb-10 !bg-[#141413]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav className="mb-6 pt-[var(--header-offset)] text-sm" aria-label="Breadcrumb">
            <Link href="/" className="vendor-profile-hero-breadcrumb-link !text-[#c96442] hover:!text-[#d97757] focus-visible:!text-[#d97757]">
              Home
            </Link>
            <span className="mx-2 vendor-profile-hero-breadcrumb-separator !text-[#c96442]">/</span>
            <Link href="/instructors" className="vendor-profile-hero-breadcrumb-link !text-[#c96442] hover:!text-[#d97757] focus-visible:!text-[#d97757]">
              Instructors
            </Link>
            <span className="mx-2 vendor-profile-hero-breadcrumb-separator !text-[#c96442]">/</span>
            <span className="vendor-profile-hero-breadcrumb-current !font-bold !text-[#c96442]">{vendor.name}</span>
          </nav>
          <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10 lg:items-stretch">
            <div className="flex min-w-0 flex-col justify-center">
              <h1 className="text-2xl font-bold !text-[#f8fafc] sm:text-3xl">
                <span className="!text-[#f8fafc]">{vendor.name}</span>
              </h1>
              {vendor.description && (
                <p className="mt-4 !text-[#b0aea5] leading-relaxed line-clamp-3">
                  {vendor.description}
                </p>
              )}
              <p className="mt-4 flex items-center gap-2 text-sm !text-[#b0aea5]">
                <svg
                  className="h-5 w-5 shrink-0 !text-[#b0aea5]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                {vendor.address ? (
                  <>
                    <strong className="font-semibold !text-[#b0aea5]">{vendor.city}, {vendor.state} |</strong>{" "}{vendor.address}
                  </>
                ) : (
                  <strong className="font-semibold !text-[#b0aea5]">{vendor.city}, {getCountyDisplayName(vendor.county)} County</strong>
                )}
              </p>
              {vendor.acceptsBookings ? (
                <div className="mt-6 flex items-center gap-3">
                  <Link href={`/instructors/${vendor.slug}/book`} className={heroButtonClassName}>
                    Book Now
                  </Link>
                  <SaveHeartButton
                    vendorId={vendor.id}
                    initialSaved={initialSaved}
                    size="md"
                    showFilledWhenSaved={false}
                    colorVariant="burnt"
                  />
                </div>
              ) : (
                <div className="mt-6 flex items-center gap-3">
                  {vendorWebsiteHeroUrl && (
                    <VendorWebsiteLink
                      href={vendorWebsiteHeroUrl}
                      vendorSlug={vendor.slug}
                      placement="hero"
                      className={heroButtonClassName}
                    >
                      Visit website
                    </VendorWebsiteLink>
                  )}
                  <SaveHeartButton
                    vendorId={vendor.id}
                    initialSaved={initialSaved}
                    size="md"
                    showFilledWhenSaved={false}
                    colorVariant="burnt"
                  />
                </div>
              )}
            </div>
            <div
              data-hero-image-wrapper
              className="relative w-full min-w-0 overflow-hidden rounded-xl border border-zinc-300 bg-zinc-200 shadow-sm h-[220px] sm:h-[320px] lg:h-full lg:min-h-[320px]"
              style={{ display: "block" }}
              aria-label={`Map: ${vendor.name} location`}
            >
              <VendorHeroMapDynamic
                vendorName={vendor.name}
                city={vendor.city}
                county={vendor.county}
                state={vendor.state}
                address={vendor.address}
              />
            </div>
          </div>
        </div>
      </section>

      <main className="vendor-profile-main pb-8 sm:pb-12">
        <section className="relative left-1/2 -translate-x-1/2 w-screen border-b border-[#252424] bg-[#141413]">
          <div
            className="mx-auto flex max-w-6xl flex-wrap items-end gap-1 px-4 sm:px-6"
            role="tablist"
            aria-label="Instructor detail sections"
          >
            {TAB_CONFIG.map((tab) => {
              const active = selectedTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tabHref(tab.id)}
                  prefetch={tab.id === "reviews" ? false : undefined}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`vendor-tab-panel-${tab.id}`}
                  id={`vendor-tab-${tab.id}`}
                  className={`vendor-detail-tab inline-flex min-h-12 items-center border-b-2 px-5 py-3 text-[17px] leading-none transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d07a5b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141413] ${
                    active
                      ? "border-[#d07a5b] bg-transparent text-[#f3f2ed]"
                      : "border-transparent bg-transparent text-[#8f8e88] hover:text-[#d6d3c8]"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="relative left-1/2 -translate-x-1/2 w-screen bg-[#efeee8] py-7 sm:py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Main content - 2 cols */}
              <div className="min-w-0 lg:col-span-2">

              {selectedTab === "about" && (
                <section
                  id="vendor-tab-panel-about"
                  role="tabpanel"
                  aria-labelledby="vendor-tab-about"
                  className="space-y-9 bg-[#efeee8] px-5 pb-6 pt-7 sm:px-8 sm:pt-8"
                >
                  <div>
                    <h2 className="text-[28px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#1f1f1d] sm:text-[44px] lg:text-[56px]">About</h2>
                    <p className="mt-3 max-w-4xl text-[16px] leading-[1.7] text-[#4f4e4a] sm:text-[17px]">
                      {aboutIntro}
                    </p>
                    {showAboutSupportCopy && (
                      <p className="mt-4 max-w-4xl text-[16px] leading-[1.7] text-[#4f4e4a] sm:text-[17px]">
                        All classes meet California DOJ and local sheriff requirements. Students receive a certificate of completion and range qualification results on the day of training.
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-[22px] font-semibold leading-[1.15] tracking-[-0.01em] text-[#1f1f1d] sm:text-[32px] lg:text-[40px]">Available Classes &amp; Prices</h3>
                    <div className="mt-5 space-y-3">
                      {availableCourses.map((course) => (
                        <article
                          key={course.key}
                          className="group flex cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-[#ebe9e2] bg-white px-4 py-3 shadow-[0_1px_0_rgba(26,26,24,0.02)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-[#d3d0c8] hover:shadow-[0_14px_32px_rgba(0,0,0,0.12)] sm:gap-4 sm:px-5 sm:py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[15px] font-semibold leading-[1.25] text-[#1f1f1d] transition-colors duration-200 group-hover:text-[#c96442] sm:text-[16px]">
                              {course.title}
                            </h4>
                            {/* On phones the subtitle wraps to ≤2 lines so the
                                full sentence is readable; from `sm:` it stays
                                on a single ellipsised line for the desktop look. */}
                            <p className="mt-0.5 text-[12px] leading-[1.35] text-[#77766f] line-clamp-2 sm:overflow-hidden sm:text-ellipsis sm:whitespace-nowrap sm:text-[13px]">
                              {course.subtitle}
                            </p>
                          </div>
                          <p className="shrink-0 text-[20px] font-semibold leading-none tracking-[-0.02em] text-[#1f1f1d] transition-colors duration-200 group-hover:text-[#c96442] sm:text-[26px]">
                            {course.price}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Reviews (and Google Places fetch) mount only on this tab — avoids Places billing when browsing About / What To Bring */}
              {selectedTab === "reviews" && (
                <section
                  id="vendor-tab-panel-reviews"
                  role="tabpanel"
                  aria-labelledby="vendor-tab-reviews"
                  className="space-y-6 bg-[#efeee8] px-5 pb-6 pt-7 text-left sm:px-8 sm:pt-8"
                >
                  <VendorReviewsSection
                    vendor={vendor}
                    variant="profile-tab"
                    fetchGoogleReviews
                  />
                </section>
              )}

              {selectedTab === "what-to-bring" && (
                <section
                  id="vendor-tab-panel-what-to-bring"
                  role="tabpanel"
                  aria-labelledby="vendor-tab-what-to-bring"
                  className="space-y-6 bg-[#efeee8] px-5 pb-6 pt-7 text-left sm:px-8 sm:pt-8"
                >
                  <div>
                    <h2 className="text-[28px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#1f1f1d] sm:text-[44px] lg:text-[56px]">What to bring to class</h2>
                    <p className="mt-3 max-w-4xl text-[16px] leading-[1.7] text-[#4f4e4a] sm:text-[17px]">
                      All students must arrive with the following gear. Rental equipment may be available, contact the instructor in advance.
                    </p>
                  </div>
                  <ul className="vendor-what-to-bring-list m-0 w-full list-none space-y-3 p-0 text-left">
                    {WHAT_TO_BRING_ITEMS.map((item) => (
                      <li
                        key={item}
                        className="vendor-what-to-bring-card flex w-full items-center justify-start gap-3 rounded-[14px] border border-[#ebe9e2] bg-white px-5 py-3.5 text-left shadow-[0_1px_0_rgba(26,26,24,0.02)] sm:px-6"
                      >
                        <span
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f6efeb] text-[#d27b5d]"
                          aria-hidden
                        >
                          ✓
                        </span>
                        <span className="text-[16px] leading-[1.45] text-[#2f2e2b] sm:text-[17px]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              </div>

              {/* Sidebar - Instructor info */}
              <div className="min-w-0 lg:col-span-1">
                <div className="space-y-4 vendor-profile-contact-card-sticky md:sticky md:top-[calc(var(--header-offset)+1rem)]">
                  <section className="rounded-2xl border border-[#ebe9e2] bg-white p-6 shadow-[0_1px_0_rgba(26,26,24,0.02)] sm:p-7">
                    <h3 className="text-[22px] font-semibold leading-[1.12] tracking-[-0.01em] text-[#1f1f1d] sm:text-[32px] lg:text-[42px]">Contact</h3>
                    <div className="mt-5 space-y-4">
                      {contactBlocks.map((block, idx) => {
                        const label = formatCountyContactLabel(block.counties);
                        const labelId = `vendor-contact-block-${idx}`;
                        return (
                          <div
                            key={`${block.counties.join("-")}-${idx}`}
                            className="space-y-2"
                            aria-labelledby={showCountyLabels ? labelId : undefined}
                            role={showCountyLabels ? "group" : undefined}
                          >
                            {showCountyLabels && label && (
                              <h4
                                id={labelId}
                                className="text-sm font-semibold text-[#1f1f1d]"
                              >
                                {label}
                              </h4>
                            )}
                            {block.address && (
                              <p className="flex items-start gap-2.5 text-[15px] leading-[1.45] text-[#595853]">
                                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-[#8a8881]" aria-hidden>
                                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M12 21s7-6.25 7-11a7 7 0 10-14 0c0 4.75 7 11 7 11z"
                                    />
                                    <circle cx="12" cy="10" r="2.5" />
                                  </svg>
                                </span>
                                <span>{block.address}</span>
                              </p>
                            )}
                            {block.phone && (
                              <p className="flex items-start gap-2.5 text-[15px] leading-[1.45] text-[#595853]">
                                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-[#8a8881]" aria-hidden>
                                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 5.75A1.75 1.75 0 016.75 4h1.53c.74 0 1.39.5 1.59 1.2l.74 2.61a1.75 1.75 0 01-.49 1.74l-1.02.94a14.2 14.2 0 005.02 5.02l.94-1.02c.46-.5 1.17-.7 1.84-.49l2.61.74c.7.2 1.2.84 1.2 1.59v1.53A1.75 1.75 0 0118.25 20h-1.5C10.26 20 4 13.74 4 6.75v-1z"
                                    />
                                  </svg>
                                </span>
                                <a href={`tel:${block.phone}`} className="hover:underline">
                                  {block.phone}
                                </a>
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {vendorWebsiteContactUrl && (
                        <p className="flex items-start gap-2.5 text-[15px] leading-[1.45]">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-[#8a8881]" aria-hidden>
                            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <circle cx="12" cy="12" r="8" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5c2.2 2.2 2.2 12.8 0 15" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5c-2.2 2.2-2.2 12.8 0 15" />
                            </svg>
                          </span>
                          <VendorWebsiteLink
                            href={vendorWebsiteContactUrl}
                            vendorSlug={vendor.slug}
                            placement="contact"
                            className="font-medium text-[#c96442] hover:underline"
                          >
                            Visit website
                          </VendorWebsiteLink>
                        </p>
                      )}
                    </div>
                  </section>

                  {vendor.countiesServed.length > 0 && (
                    <section className="rounded-2xl border border-[#ebe9e2] bg-white p-6 shadow-[0_1px_0_rgba(26,26,24,0.02)] sm:p-7">
                      <h3 className="text-[22px] font-semibold leading-[1.12] tracking-[-0.01em] text-[#1f1f1d] sm:text-[32px] lg:text-[42px]">
                        Counties Served
                      </h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {vendor.countiesServed.map((county) => {
                          const countyName = getCountyDisplayName(county);
                          return (
                            <span
                              key={county}
                              className={`inline-flex w-fit items-center justify-center whitespace-nowrap rounded-full border border-[#2f2e2b] bg-[#2f2e2b] text-center font-medium text-white ${getCountyPillClassName(countyName)}`}
                            >
                              {countyName}
                            </span>
                          );
                        })}
                      </div>
                    </section>
                  )}

                </div>
              </div>
            </div>
          </div>
        </section>

        {otherVendors.length > 0 ? (
          <section
            className="section home-page popular popular-vendors-redesign relative left-1/2 -translate-x-1/2 w-screen"
            aria-label="More CCW Classes"
          >
            <div className="container-default w-container">
              <div className="popular-vendors-redesign__header">
                <div>
                  <h2 className="mg-bottom-0">More CCW Classes</h2>
                </div>
                <div className="popular-vendors-redesign__header-btn">
                  <Link href="/instructors" className="btn-secondary w-button popular-vendors-redesign__view-all">
                    View All Instructors
                  </Link>
                </div>
              </div>
              <div className="popular-vendors-redesign__grid">
                {otherVendors.map((v) => {
                  const servedCounty = v.countiesServed[0]
                    ? getCountyDisplayName(v.countiesServed[0])
                    : getCountyDisplayName(v.county);

                  return (
                    <PopularVendorCard
                      key={v.id}
                      vendor={v}
                      listingReviews={otherVendorListingReviews.get(v.id) ?? null}
                      servedCounty={servedCounty}
                      showFeaturedBadge={false}
                      initialSaved={savedVendorIds.includes(v.id)}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <Footer />
      </main>
    </div>
  );
}
