import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SmoothScrollTo } from "@/components/SmoothScrollTo";
import { VendorCard } from "@/components/VendorCard";
import {
  getCountyDisplayName,
  isValidCountySlug,
  CALIFORNIA_COUNTIES,
} from "@/data/counties";
import { getVendorsByCounty } from "@/data/vendors";
import { filterVendors } from "@/lib/filter-vendors";
import { getCountyImageUrl } from "@/data/county-images";
import { GearCtaSection } from "@/components/GearCtaSection";
import { CountyStatsSection } from "@/components/CountyStatsSection";
import { CcwTimelineSection } from "@/components/CcwTimelineSection";
import { getPlaceholderCcwTimelineData } from "@/data/ccw-timeline-placeholder";

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
  const resolved = await searchParams;

  if (!isValidCountySlug(county)) {
    notFound();
  }

  const displayName = getCountyDisplayName(county);
  const allVendors = getVendorsByCounty(county);

  const filters = {
    county,
    city: resolved.city as string | undefined,
    classType: resolved.classType as "initial" | "renewal" | "both" | undefined,
    format: resolved.format as "in-person" | "online" | "hybrid" | undefined,
    priceMax: resolved.priceMax ? Number(resolved.priceMax) : undefined,
    search: resolved.search as string | undefined,
  };

  const vendors = filterVendors(allVendors, filters);
  const countyImage = getCountyImageUrl(county);

  // Popular: first 4 vendors (or all if fewer)
  const popularVendors = vendors.slice(0, 4);
  const timelineData = getPlaceholderCcwTimelineData(county, displayName);

  return (
    <>
      <Header />
      <div className="top-section county-page">
        <div className="container-default w-container">
          <nav className="vendors-hero-breadcrumb mg-bottom-12px text-sm">
            <Link href="/" className="hover:underline">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/ca" className="hover:underline">Counties</Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-900">{displayName} County</span>
          </nav>
          <div className="county-hero-row">
            <div className="county-hero-content">
              <h1 className="county-h1">{displayName} County CCW Training</h1>
              <p className="county-sub-heading">
                Find <strong>sheriff-approved CCW instructors</strong> and{" "}
                <strong>concealed carry training vendors</strong> in {displayName} County. All
                instructors listed below are approved by the{" "}
                <strong>County Sheriff&apos;s Office</strong> to provide valid training
                certificates for new applicants and renewals.                 Compare pricing, locations, and
                course options.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <SmoothScrollTo
                  targetId="Popular-Vendors"
                  className="btn-primary bg-secondary-2 small w-button"
                >
                  View Vendors
                </SmoothScrollTo>
                <SmoothScrollTo
                  targetId="ccw-timeline"
                  className="btn-secondary small w-button county-hero-timeline-btn"
                >
                  Current Wait Times
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

      <CountyStatsSection
        vendors={allVendors}
        countyDisplayName={displayName}
      />

      <CcwTimelineSection data={timelineData} />

      <div id="Popular-Vendors" className="section bg-neutral-200">
        <div className="container-default w-container">
          <div className="flex children-wrap mg-bottom-32px">
            <img
              src="/images/category-dropdown-icon-directory-webflow-ecommerce-template.svg"
              loading="eager"
              width={26}
              alt=""
              className="mg-top-4px popular-star"
            />
            <div className="heading-h2-size"> Popular CCW Vendors in </div>
            <h2 className="mg-bottom-0">{displayName} County</h2>
          </div>
          <div className="w-dyn-list">
            {popularVendors.length > 0 ? (
              <div role="list" className="grid-2-columns _1-col-tablet w-dyn-items">
                {popularVendors.map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} />
                ))}
              </div>
            ) : (
              <div className="empty-state w-dyn-empty">
                <div>No instructors found in this county yet.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="Vendors-in-County" className="section county-list-section">
        <div className="container-default w-container">
          <div className="flex children-wrap mg-bottom-32px">
            <div className="heading-h2-size">View all vendors in </div>
            <h2 className="mg-bottom-0">{displayName} County</h2>
          </div>
          <div className="w-dyn-list">
            {vendors.length > 0 ? (
              <div role="list" className="vendors-grid grid-3-columns w-dyn-items">
                {vendors.map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} />
                ))}
              </div>
            ) : (
              <div className="empty-state w-dyn-empty">
                <div>
                  No instructors match your filters. Try adjusting your criteria or{" "}
                  <Link href={`/ca/${county}`} className="font-medium underline">
                    clear filters
                  </Link>
                  .
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <GearCtaSection />

      <Footer />
    </>
  );
}
