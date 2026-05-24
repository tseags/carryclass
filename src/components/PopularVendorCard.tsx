import Link from "next/link";
import type { Vendor } from "@/types";
import type { VendorListingReviewStats } from "@/lib/vendor-reviews";
import { SaveHeartButton } from "@/components/SaveHeartButton";

const LISTING_CARD_FALLBACK =
  "Sheriff-approved CCW instruction and renewal classes.";

function ListingStarCluster({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5 text-[12px] leading-none tracking-[0.04em]" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={
            i <= full
              ? "text-[#c96442]"
              : half && i === full + 1
                ? "text-[#c96442] opacity-[0.82]"
                : "text-[#d8d4cb]"
          }
        >
          ★
        </span>
      ))}
    </span>
  );
}

interface PopularVendorCardProps {
  vendor: Vendor;
  /** Listing cards only show stars when there is at least one approved directory review. */
  listingReviews: VendorListingReviewStats | null;
  servedCounty: string;
  showFeaturedBadge?: boolean;
  initialSaved?: boolean;
}

export function PopularVendorCard({
  vendor,
  listingReviews,
  servedCounty,
  showFeaturedBadge = false,
  initialSaved = false,
}: PopularVendorCardProps) {
  const cardDescription =
    vendor.listingCardText?.trim() || LISTING_CARD_FALLBACK;

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-20">
        <SaveHeartButton vendorId={vendor.id} initialSaved={initialSaved} />
      </div>
      <Link
        href={`/instructors/${vendor.slug}`}
        className={`popular-vendors-redesign__card${showFeaturedBadge ? " popular-vendors-redesign__card--has-featured-badge" : ""}`}
      >
        {showFeaturedBadge ? (
          <div className="popular-vendors-redesign__featured">Featured</div>
        ) : null}
        <div className="popular-vendors-redesign__title-row">
          <h3 className="popular-vendors-redesign__title">{vendor.name}</h3>
        </div>

        {listingReviews && listingReviews.count > 0 ? (
          <div
            className="popular-vendors-redesign__rating-row"
            aria-label={`${listingReviews.averageRating.toFixed(1)} out of 5 stars, ${listingReviews.count} reviews`}
          >
            <ListingStarCluster rating={listingReviews.averageRating} />
            <span className="popular-vendors-redesign__rating-copy">
              {listingReviews.averageRating.toFixed(1)} · {listingReviews.count} review
              {listingReviews.count !== 1 ? "s" : ""}
            </span>
          </div>
        ) : null}

        <div className="popular-vendors-redesign__location-row">
          <img
            src="/images/location-icon-color-neutral-400-directory-webflow-ecommerce-template.svg"
            loading="lazy"
            width={14}
            height={14}
            alt=""
          />
          <span>
            {vendor.city?.trim()
              ? `${vendor.city.trim()}, ${servedCounty} County`
              : `${servedCounty} County`}
          </span>
        </div>

        <p className="popular-vendors-redesign__description">{cardDescription}</p>

        <div className="popular-vendors-redesign__prices">
          {vendor.priceInitial == null && vendor.priceRenewal == null ? (
            <div className="popular-vendors-redesign__prices-contact">
              <div className="popular-vendors-redesign__prices-ghost" aria-hidden="true">
                <div>
                  <div className="popular-vendors-redesign__price">$299</div>
                  <div className="popular-vendors-redesign__price-label">16-hr initial</div>
                </div>
                <div>
                  <div className="popular-vendors-redesign__price">$299</div>
                  <div className="popular-vendors-redesign__price-label">8-hr renewal</div>
                </div>
              </div>
              <p className="popular-vendors-redesign__contact-pricing">Contact for pricing</p>
            </div>
          ) : (
            <>
              <div>
                <div className="popular-vendors-redesign__price">
                  {vendor.priceInitial != null ? `$${vendor.priceInitial}` : "Contact"}
                </div>
                <div className="popular-vendors-redesign__price-label">16-hr initial</div>
              </div>
              <div>
                <div className="popular-vendors-redesign__price">
                  {vendor.priceRenewal != null ? `$${vendor.priceRenewal}` : "Contact"}
                </div>
                <div className="popular-vendors-redesign__price-label">8-hr renewal</div>
              </div>
            </>
          )}
        </div>
      </Link>
    </div>
  );
}
