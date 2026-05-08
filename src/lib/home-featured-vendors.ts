import type { Vendor } from "@/types";

/** Counties shown on the home page “Popular CCW courses” grid (one vendor each). */
export const HOME_POPULAR_COUNTY_ORDER = [
  "san-diego",
  "riverside",
  "los-angeles",
] as const;

function vendorMatchesPopularListingCriteria(v: Vendor): boolean {
  const hasPricing = v.priceInitial != null && v.priceRenewal != null;
  const hasDesc = Boolean(v.description?.trim() || v.listingCardText?.trim());
  const hasGoogle = Boolean(v.googlePlaceId?.trim() || v.googleReviewsUrl?.trim());
  return hasPricing && hasDesc && hasGoogle;
}

function vendorServesCounty(v: Vendor, countySlug: string): boolean {
  return v.county === countySlug || v.countiesServed.includes(countySlug);
}

/**
 * Picks up to three vendors for the home page: one per county in
 * {@link HOME_POPULAR_COUNTY_ORDER}, each with initial + renewal pricing,
 * copy (description or listing card text), and Google reviews metadata.
 * Tie-break: alphabetical by name (stable for ISR/cache).
 */
export function pickHomePopularVendors(allVendors: Vendor[]): Vendor[] {
  const picked: Vendor[] = [];
  const usedSlugs = new Set<string>();

  for (const countySlug of HOME_POPULAR_COUNTY_ORDER) {
    const pool = allVendors.filter(
      (v) =>
        vendorServesCounty(v, countySlug) &&
        vendorMatchesPopularListingCriteria(v) &&
        !usedSlugs.has(v.slug)
    );
    pool.sort((a, b) => a.name.localeCompare(b.name));
    const choice = pool[0];
    if (choice) {
      picked.push(choice);
      usedSlugs.add(choice.slug);
    }
  }

  if (picked.length >= 3) return picked;

  const fallback = [...allVendors]
    .filter(
      (v) => vendorMatchesPopularListingCriteria(v) && !usedSlugs.has(v.slug)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const v of fallback) {
    if (picked.length >= 3) break;
    picked.push(v);
    usedSlugs.add(v.slug);
  }

  return picked;
}
