import Link from "next/link";
import type { Vendor } from "@/types";
import { SaveHeartButton } from "@/components/SaveHeartButton";

interface PopularVendorCardProps {
  vendor: Vendor;
  ratingText: string;
  reviewsText: string;
  servedCounty: string;
  description: string;
  showFeaturedBadge?: boolean;
  initialSaved?: boolean;
}

export function PopularVendorCard({
  vendor,
  ratingText,
  reviewsText,
  servedCounty,
  description,
  showFeaturedBadge = false,
  initialSaved = false,
}: PopularVendorCardProps) {
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

        <p className="popular-vendors-redesign__description">{description}</p>

        <div className="popular-vendors-redesign__prices">
          {vendor.priceInitial == null && vendor.priceRenewal == null ? (
            <p className="popular-vendors-redesign__contact-pricing">Contact for pricing</p>
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
