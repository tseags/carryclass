import Link from "next/link";
import type { Vendor } from "@/types";
import { SaveHeartButton } from "@/components/SaveHeartButton";

const LISTING_CARD_FALLBACK =
  "Sheriff-approved CCW instruction and renewal classes.";

interface PopularVendorCardProps {
  vendor: Vendor;
  ratingText: string;
  reviewsText: string;
  servedCounty: string;
  showFeaturedBadge?: boolean;
  initialSaved?: boolean;
}

export function PopularVendorCard({
  vendor,
  ratingText,
  reviewsText,
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
        href={`/vendors/${vendor.slug}`}
        className={`popular-vendors-redesign__card${showFeaturedBadge ? " popular-vendors-redesign__card--has-featured-badge" : ""}`}
      >
        {showFeaturedBadge ? (
          <div className="popular-vendors-redesign__featured">Featured</div>
        ) : null}
        <div className="popular-vendors-redesign__title-row">
          <h3 className="popular-vendors-redesign__title">{vendor.name}</h3>
        </div>

        <div className="popular-vendors-redesign__rating-row">
          <span className="popular-vendors-redesign__stars">★★★★★</span>
          <span className="popular-vendors-redesign__rating-copy">
            {ratingText} · {reviewsText}
          </span>
        </div>

        <div className="popular-vendors-redesign__location-row">
          <img
            src="/images/location-icon-color-neutral-400-directory-webflow-ecommerce-template.svg"
            loading="lazy"
            width={14}
            height={14}
            alt=""
          />
          <span>
            {vendor.city}, {servedCounty} County
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
