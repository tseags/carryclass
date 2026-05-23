import Link from "next/link";
import type { Vendor } from "@/types";
import { formatInitialRenewalPrices } from "@/lib/utils";
import { SaveHeartButton } from "@/components/SaveHeartButton";

interface VendorCardProps {
  vendor: Vendor;
  variant?: "default" | "outline"; // outline = white button with border for "other vendors" section
}

export function VendorCard({ vendor, variant = "default" }: VendorCardProps) {
  const prices = formatInitialRenewalPrices(vendor);

  return (
    <div className="relative card-link-image-top---text-container pd-36px---24px outline h-full transition-shadow hover:shadow-md">
      <div className="absolute right-3 top-3">
        <SaveHeartButton vendorId={vendor.id} />
      </div>
      <h3 className="link-item-text---hover-secondary-2 heading-h4-size vendor-name mg-bottom-0 pt-1">
        {vendor.name}
      </h3>
      <div className="grid-1-column gap-row-10px mg-bottom-24px">
        <div className="flex align-start gap-column-8px">
          <img
            src="/images/location-icon-color-neutral-400-directory-webflow-ecommerce-template.svg"
            width={14}
            height={14}
            alt=""
            className="mg-top-4px shrink-0"
          />
          <div className="paragraph-small color-neutral-600">
            {vendor.city?.trim()
              ? `${vendor.city.trim()}, ${vendor.county.replace(/-/g, " ")}`
              : vendor.county.replace(/-/g, " ")}
            {variant === "outline" && vendor.address && (
              <>
                <br />
                {vendor.address}
              </>
            )}
          </div>
        </div>
        <div
          className={
            !prices.initial && !prices.renewal
              ? "vendor-card-pricing-rows vendor-card-pricing-rows--contact-fallback"
              : "vendor-card-pricing-rows"
          }
        >
          {prices.initial && (
            <div className="paragraph-small color-neutral-600">{prices.initial}</div>
          )}
          {prices.renewal && (
            <div className="paragraph-small color-neutral-600">{prices.renewal}</div>
          )}
          {!prices.initial && !prices.renewal && (
            <div className="paragraph-small color-neutral-600">Contact for pricing</div>
          )}
        </div>
      </div>
      <div className="flex-align-left flex-align-stretch-mbp mg-top-auto">
        <Link href={`/vendors/${vendor.slug}`} className="w-inline-block w-full">
          <div
            className={
              variant === "outline"
                ? "btn-secondary vendor-card w-button w-full text-center"
                : "btn-primary vendor-card w-button w-full text-center"
            }
          >
            View Now
          </div>
        </Link>
      </div>
    </div>
  );
}
