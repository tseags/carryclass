import Link from "next/link";
import type { Vendor } from "@/types";
import { getCountyDisplayName } from "@/data/counties";
import { SaveHeartButton } from "@/components/SaveHeartButton";

interface VendorCardWebflowProps {
  vendor: Vendor;
  initialSaved?: boolean;
}

export function VendorCardWebflow({ vendor, initialSaved = false }: VendorCardWebflowProps) {
  return (
    <div
      role="listitem"
      className="relative w-dyn-item vendor-card-webflow-root"
      data-name={vendor.name}
      data-county={vendor.county}
      data-city={vendor.city}
    >
      <div className="absolute right-3 top-3 z-20">
        <SaveHeartButton vendorId={vendor.id} initialSaved={initialSaved} />
      </div>
      <Link
        href={`/vendors/${vendor.slug}`}
        className="w-inline-block"
        style={{ textDecoration: "none", color: "inherit", height: "100%", display: "block" }}
      >
        <div
          className="vendor-card-hover card-link-image-top---text-container pd-36px---24px outline popular home"
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <h3 className="link-item-text---hover-secondary-2 heading-h4-size vendor-name pt-1">
            {vendor.name}
          </h3>
          <div className="grid-1-column gap-row-10px mg-bottom-24px">
            <div className="flex align-start gap-column-8px">
              <div className="paragraph-small color-neutral-600 bold">
                {vendor.type === "company" ? "Company" : "Instructor"} · {vendor.city}, CA
              </div>
            </div>
            <div className="flex align-start gap-column-8px">
              <img
                src="/images/location-icon-color-neutral-400-directory-webflow-ecommerce-template.svg"
                loading="lazy"
                width={14}
                alt=""
                className="mg-top-4px"
              />
              <div className="paragraph-small color-neutral-600">
                {vendor.countiesServed.map((c) => getCountyDisplayName(c)).join(", ")}
              </div>
            </div>
            <div
              className={
                vendor.priceInitial == null && vendor.priceRenewal == null
                  ? "vendor-card-pricing-rows vendor-card-pricing-rows--contact-fallback"
                  : "vendor-card-pricing-rows"
              }
            >
              {vendor.priceInitial == null && vendor.priceRenewal == null ? (
                <div className="paragraph-small color-neutral-600">Contact for pricing</div>
              ) : (
                <>
                  <div className="flex align-start gap-column-8px">
                    <div className="paragraph-small color-neutral-600">
                      <strong className="bold-text-2">$</strong>
                    </div>
                    <div className="paragraph-small color-neutral-600">
                      16-Hour Initial:{" "}
                      <strong>
                        {vendor.priceInitial != null ? `$${vendor.priceInitial}` : "Contact"}
                      </strong>
                    </div>
                  </div>
                  <div className="flex align-start gap-column-8px">
                    <div className="paragraph-small color-neutral-600">
                      <strong className="bold-text-2">$</strong>
                    </div>
                    <div className="paragraph-small color-neutral-600">
                      8-Hour Renewal:{" "}
                      <strong>
                        {vendor.priceRenewal != null ? `$${vendor.priceRenewal}` : "Contact"}
                      </strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex-align-left flex-align-stretch-mbp mg-top-auto">
            <div className="btn-primary vendor-card">View Now</div>
          </div>
        </div>
      </Link>
    </div>
  );
}
