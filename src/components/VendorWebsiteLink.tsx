"use client";

import { trackEvent } from "@/lib/analytics";
import type { VendorWebsiteLinkPlacement } from "@/lib/vendor-website-url";

type VendorWebsiteLinkProps = {
  href: string;
  vendorSlug: string;
  placement: VendorWebsiteLinkPlacement;
  className?: string;
  children: React.ReactNode;
};

export function VendorWebsiteLink({
  href,
  vendorSlug,
  placement,
  className,
  children,
}: VendorWebsiteLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() =>
        trackEvent("outbound_instructor_website", {
          vendor_slug: vendorSlug,
          placement,
        })
      }
    >
      {children}
    </a>
  );
}
