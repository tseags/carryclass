export type ClassType = "initial" | "renewal" | "both";
export type ClassFormat = "in-person" | "online" | "hybrid";
export type CourseCategory = "initial" | "renewal" | "add-gun" | "online";

/**
 * One contact block on a vendor profile after canonical merge.
 * Multiple counties that share the same normalized address+phone collapse into
 * a single block whose `counties` array lists every county represented.
 */
export interface VendorCountyContact {
  /** County slugs (canonical CA slugs) that share this address/phone block. */
  counties: string[];
  address?: string;
  phone?: string;
  city?: string;
}

export interface Vendor {
  id: string;
  slug: string;
  name: string;
  type: "instructor" | "company";
  city: string;
  county: string;
  state: string;
  countiesServed: string[]; // County slugs
  classTypes: ClassType[];
  formats: ClassFormat[];
  priceMin?: number;
  priceMax?: number;
  priceInitial?: number; // 16-hour initial class price
  priceRenewal?: number; // 8-hour renewal class price
  priceAddGun?: number; // Add a gun to CCW
  address?: string; // Street address
  discountInfo?: string; // Veteran discounts, etc.
  website?: string;
  phone?: string;
  email?: string;
  description?: string;
  /** Directory card blurb: `vendor_description` from DB, else instructor names. */
  listingCardText?: string;
  imageUrl?: string;
  /** Optional gallery photos for "About the Experience". Section hidden if empty. */
  photos?: string[];
  googleReviewsUrl?: string;
  googlePlaceId?: string;
  featured?: boolean;
  /** When true, hero shows Book Now and /vendors/[slug]/book is available */
  acceptsBookings?: boolean;
  /** Stripe Connect account id (acct_...) — required for paid checkout */
  stripeConnectAccountId?: string;
  /**
   * Per-county contact blocks (after canonical-vendor merge + address/phone dedupe).
   * Populated by `mergeCanonicalVendors`; absent for un-merged or single-county vendors.
   */
  countyContacts?: VendorCountyContact[];
  /** Source row freshness (ISO date) — used as merge tie-break, may surface in UI later. */
  updatedAt?: string;
  /** Enrichment confidence from upstream pipeline; influences canonical winner scoring. */
  enrichmentConfidence?: "high" | "medium" | "low";
  /** Upstream crawl status (e.g. "success", "failed"); rows with failures are dropped before merge. */
  crawlStatus?: string;
  createdAt: string;
}

export interface County {
  slug: string;
  name: string;
  state: string;
  stateSlug: string;
  cityCount?: number;
}

export interface State {
  slug: string;
  name: string;
  abbreviation: string;
  countyCount: number;
}

export type VendorFilters = {
  county?: string;
  city?: string;
  classType?: ClassType;
  format?: ClassFormat;
  category?: CourseCategory;
  /** When true, only vendors with at least one course price field populated */
  priceListedOnly?: boolean;
  priceMin?: number;
  priceMax?: number;
  search?: string;
};
