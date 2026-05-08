import { getApprovedVendorReviews } from "@/lib/vendor-reviews";
import { VendorReviewsSectionClient } from "@/components/VendorReviewsSectionClient";
import type { Vendor } from "@/types";

interface VendorReviewsSectionProps {
  vendor: Vendor;
  variant?: "default" | "profile-tab";
  /**
   * When true, loads Google Places reviews after this UI mounts (one `/api/google-reviews` call).
   * Defaults false so incidental renders never bill Places API — vendor profile sets true only on the Reviews tab.
   */
  fetchGoogleReviews?: boolean;
}

export async function VendorReviewsSection({
  vendor,
  variant = "default",
  fetchGoogleReviews = false,
}: VendorReviewsSectionProps) {
  const nativeReviews = await getApprovedVendorReviews(vendor.id);
  return (
    <VendorReviewsSectionClient
      vendorId={vendor.id}
      googlePlaceId={vendor.googlePlaceId}
      googleReviewsUrl={vendor.googleReviewsUrl}
      variant={variant}
      fetchGoogleReviews={fetchGoogleReviews}
      nativeReviews={nativeReviews}
    />
  );
}
