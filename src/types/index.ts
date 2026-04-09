export type ClassType = "initial" | "renewal" | "both";
export type ClassFormat = "in-person" | "online" | "hybrid";
export type CourseCategory = "initial" | "renewal" | "add-gun" | "online";

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
  priceMin?: number;
  priceMax?: number;
  search?: string;
};
