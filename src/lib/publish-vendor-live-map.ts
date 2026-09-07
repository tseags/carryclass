/**
 * Pure mapping helpers for the publish → live bridge (no DB imports).
 */
import type { Vendor } from "@/types";
import type {
  VendorCalendarClass,
  VendorClassType,
  VendorProfile,
} from "@/lib/onboarding-db";

/** Patch applied to claimed `carry_class_vendor_data` rows on instructor publish. */
export type CarryClassListingPublishPatch = {
  vendor_description: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  address: string | null;
  price_16hr_full: string | null;
  price_8hr_renewal: string | null;
  price_add_a_gun: string | null;
  logo_path: string | null;
  accepts_bookings: boolean;
  stripe_connect_account_id: string | null;
};

export type BookableClassType = "initial" | "renewal";

export type DerivedClassPricing = {
  priceInitial: number | null;
  priceRenewal: number | null;
  priceAddGun: number | null;
  priceMin: number | null;
  priceMax: number | null;
  classTypes: Array<"initial" | "renewal" | "both">;
  price_16hr_full: string | null;
  price_8hr_renewal: string | null;
  price_add_a_gun: string | null;
};

export type SessionScaffoldInput = {
  startsAt: Date;
  endsAt: Date | null;
  title: string | null;
  classType: BookableClassType;
  priceCents: number;
  capacity: number;
};

export type PrismaVendorPublishData = {
  slug: string;
  name: string;
  type: string;
  city: string;
  county: string;
  state: string;
  countiesServed: string[];
  classTypes: string[];
  formats: string[];
  priceMin: number | null;
  priceMax: number | null;
  priceInitial: number | null;
  priceRenewal: number | null;
  priceAddGun: number | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  imageUrl: string | null;
  photos: string[];
  acceptsBookings: boolean;
  stripeConnectAccountId: string | null;
};

function trimOrNull(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function priceString(n: number | null): string | null {
  if (n == null || !Number.isFinite(n) || n < 0) return null;
  return String(n);
}

/** Derive listing/Prisma prices and classTypes from active onboarding class types. */
export function deriveClassPricing(classTypes: VendorClassType[]): DerivedClassPricing {
  const active = classTypes.filter((ct) => ct.is_active);
  const byType = new Map(active.map((ct) => [ct.class_type, Number(ct.price)]));

  const priceInitial =
    byType.has("initial") && Number.isFinite(byType.get("initial"))
      ? (byType.get("initial") as number)
      : null;
  const priceRenewal =
    byType.has("renewal") && Number.isFinite(byType.get("renewal"))
      ? (byType.get("renewal") as number)
      : null;
  const priceAddGun =
    byType.has("add_a_gun") && Number.isFinite(byType.get("add_a_gun"))
      ? (byType.get("add_a_gun") as number)
      : null;

  const hasInitial = priceInitial != null;
  const hasRenewal = priceRenewal != null;
  let classTypesOut: Array<"initial" | "renewal" | "both"> = [];
  if (hasInitial && hasRenewal) classTypesOut = ["both"];
  else if (hasInitial) classTypesOut = ["initial"];
  else if (hasRenewal) classTypesOut = ["renewal"];
  else classTypesOut = ["initial", "renewal", "both"];

  const priced = [priceInitial, priceRenewal, priceAddGun].filter(
    (n): n is number => n != null && Number.isFinite(n)
  );

  return {
    priceInitial,
    priceRenewal,
    priceAddGun,
    priceMin: priced.length ? Math.min(...priced) : null,
    priceMax: priced.length ? Math.max(...priced) : null,
    classTypes: classTypesOut,
    price_16hr_full: priceString(priceInitial),
    price_8hr_renewal: priceString(priceRenewal),
    price_add_a_gun: priceString(priceAddGun),
  };
}

/** Book Now is enabled only when Stripe Connect is linked on the onboarding profile. */
export function acceptsBookingsFromStripe(
  stripeAccountId: string | null | undefined
): boolean {
  return trimOrNull(stripeAccountId) != null;
}

/**
 * Parse `PUBLISH_LIVE_SLUG_ALLOWLIST`.
 * - Empty / unset → `null` (full go-live: sync every publish).
 * - Non-empty → trimmed, lowercased claimed slugs that may sync.
 */
export function parsePublishLiveSlugAllowlist(
  raw: string | undefined | null = process.env.PUBLISH_LIVE_SLUG_ALLOWLIST
): string[] | null {
  if (raw == null) return null;
  const slugs = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return slugs.length > 0 ? slugs : null;
}

export function isSlugAllowedForPublishLiveSync(
  slug: string,
  allowlist: string[] | null = parsePublishLiveSlugAllowlist()
): boolean {
  if (allowlist === null) return true;
  const normalized = slug.trim().toLowerCase();
  return allowlist.includes(normalized);
}

/** Map onboarding profile + class types onto carry_class_vendor_data columns. */
export function buildListingPatch(
  profile: Pick<
    VendorProfile,
    | "bio"
    | "phone"
    | "email"
    | "website"
    | "address"
    | "photo_url"
    | "stripe_account_id"
  >,
  classTypes: VendorClassType[]
): CarryClassListingPublishPatch {
  const pricing = deriveClassPricing(classTypes);
  const stripeConnectAccountId = trimOrNull(profile.stripe_account_id);
  return {
    vendor_description: trimOrNull(profile.bio),
    phone: trimOrNull(profile.phone),
    email: trimOrNull(profile.email),
    website_url: trimOrNull(profile.website),
    address: trimOrNull(profile.address),
    price_16hr_full: pricing.price_16hr_full,
    price_8hr_renewal: pricing.price_8hr_renewal,
    price_add_a_gun: pricing.price_add_a_gun,
    logo_path: trimOrNull(profile.photo_url),
    accepts_bookings: acceptsBookingsFromStripe(stripeConnectAccountId),
    stripe_connect_account_id: stripeConnectAccountId,
  };
}

/** Build Prisma Vendor create/update payload keyed by claimed slug. */
export function buildPrismaVendorData(
  profile: VendorProfile,
  listing: Vendor,
  classTypes: VendorClassType[]
): PrismaVendorPublishData {
  const pricing = deriveClassPricing(classTypes);
  const name =
    trimOrNull(profile.name) ??
    trimOrNull(profile.canonical_name) ??
    listing.name;
  const slug = profile.slug?.trim() || listing.slug;
  const stripeConnectAccountId = trimOrNull(profile.stripe_account_id);

  return {
    slug,
    name,
    type: listing.type === "company" ? "company" : "instructor",
    city: listing.city || "",
    county: listing.county || "",
    state: listing.state || "CA",
    countiesServed:
      listing.countiesServed?.length > 0
        ? listing.countiesServed
        : listing.county
          ? [listing.county]
          : [],
    classTypes: pricing.classTypes,
    formats: listing.formats?.length ? listing.formats : ["in-person"],
    priceMin: pricing.priceMin,
    priceMax: pricing.priceMax,
    priceInitial: pricing.priceInitial,
    priceRenewal: pricing.priceRenewal,
    priceAddGun: pricing.priceAddGun,
    address: trimOrNull(profile.address) ?? listing.address ?? null,
    website: trimOrNull(profile.website) ?? listing.website ?? null,
    phone: trimOrNull(profile.phone) ?? listing.phone ?? null,
    email: trimOrNull(profile.email) ?? listing.email ?? null,
    description: trimOrNull(profile.bio) ?? listing.description ?? null,
    imageUrl: trimOrNull(profile.photo_url) ?? listing.imageUrl ?? null,
    photos: (profile.gallery_urls ?? []).filter((u) => Boolean(u?.trim())),
    acceptsBookings: acceptsBookingsFromStripe(stripeConnectAccountId),
    stripeConnectAccountId,
  };
}

/**
 * Map active onboarding calendar classes to Prisma ClassSession scaffolds.
 * Only initial/renewal (booking UI); price falls back to class-type dollars.
 */
export function calendarClassesToSessions(
  calendarClasses: VendorCalendarClass[],
  classTypes: VendorClassType[]
): SessionScaffoldInput[] {
  const pricing = deriveClassPricing(classTypes);
  const typePriceCents: Record<BookableClassType, number> = {
    initial:
      pricing.priceInitial != null ? dollarsToCents(pricing.priceInitial) : 0,
    renewal:
      pricing.priceRenewal != null ? dollarsToCents(pricing.priceRenewal) : 0,
  };

  const out: SessionScaffoldInput[] = [];
  for (const cls of calendarClasses) {
    if (!cls.is_active) continue;
    const rawType = (cls.class_type ?? "").trim().toLowerCase();
    if (rawType !== "initial" && rawType !== "renewal") continue;

    const startsAt = new Date(cls.start_time);
    if (!Number.isFinite(startsAt.getTime())) continue;
    const endsAt = cls.end_time ? new Date(cls.end_time) : null;
    const endsAtValid =
      endsAt && Number.isFinite(endsAt.getTime()) ? endsAt : null;

    const priceCents =
      cls.price != null && Number.isFinite(Number(cls.price))
        ? dollarsToCents(Number(cls.price))
        : typePriceCents[rawType];

    const capacity =
      cls.max_students != null &&
      Number.isFinite(Number(cls.max_students)) &&
      Number(cls.max_students) > 0
        ? Math.floor(Number(cls.max_students))
        : 12;

    out.push({
      startsAt,
      endsAt: endsAtValid,
      title: trimOrNull(cls.title),
      classType: rawType,
      priceCents,
      capacity,
    });
  }
  return out;
}
