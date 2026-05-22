import type { Vendor } from "@/types";
import { vendorHasListedCoursePrice } from "@/lib/filter-vendors";
import { applyListingSort } from "@/lib/vendor-listing-sort";
import type { VendorListingReviewStats } from "@/lib/vendor-reviews";

function countyListingTier(
  vendor: Vendor,
  reviewStats: Map<string, VendorListingReviewStats>
): number {
  const hasPrice = vendorHasListedCoursePrice(vendor);
  const hasReviews = (reviewStats.get(vendor.id)?.count ?? 0) > 0;
  if (hasPrice && hasReviews) return 0;
  if (hasPrice) return 1;
  return 2;
}

/**
 * Default county listing order: pricing + approved reviews, then pricing only,
 * then everyone else. Within each tier: featured, then name A–Z.
 * Explicit sort options (price, name) use the shared listing sorter unchanged.
 */
export function sortCountyListingVendors(
  vendors: Vendor[],
  reviewStats: Map<string, VendorListingReviewStats>,
  sort: string | undefined
): Vendor[] {
  if (sort && sort !== "featured") {
    return applyListingSort(vendors, sort);
  }

  return [...vendors].sort((a, b) => {
    const tierDiff =
      countyListingTier(a, reviewStats) - countyListingTier(b, reviewStats);
    if (tierDiff !== 0) return tierDiff;

    const featuredDiff = Number(b.featured ?? false) - Number(a.featured ?? false);
    if (featuredDiff !== 0) return featuredDiff;

    return a.name.localeCompare(b.name);
  });
}
