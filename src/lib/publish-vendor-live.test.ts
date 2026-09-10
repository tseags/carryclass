import { describe, expect, it } from "vitest";
import type {
  VendorCalendarClass,
  VendorClassType,
  VendorProfile,
} from "@/lib/onboarding-db";
import type { Vendor } from "@/types";
import {
  findSourceRowIdsForCanonicalSlug,
  mergeCanonicalVendors,
} from "@/lib/merge-canonical-vendors";
import {
  acceptsBookingsFromStripe,
  buildListingPatch,
  buildPrismaVendorData,
  calendarClassesToSessions,
  deriveClassPricing,
  isSlugAllowedForPublishLiveSync,
  parsePublishLiveSlugAllowlist,
} from "@/lib/publish-vendor-live-map";

function classType(
  partial: Partial<VendorClassType> & Pick<VendorClassType, "class_type" | "price">
): VendorClassType {
  return {
    id: partial.id ?? `ct-${partial.class_type}`,
    vendor_id: "v1",
    is_active: partial.is_active ?? true,
    ...partial,
  };
}

function profile(overrides: Partial<VendorProfile> = {}): VendorProfile {
  return {
    id: "onb-1",
    clerk_user_id: "user_1",
    canonical_name: "Acme Training",
    normalized_name: "acme training",
    name: "Acme Training",
    phone: "925-555-1212",
    email: "owner@acme.test",
    website: "https://acme.test",
    address: "1 Main St",
    county: "alameda",
    counties_served: ["alameda"],
    bio: "We teach CCW.",
    photo_url: "https://cdn.example/logo.png",
    gallery_urls: ["https://cdn.example/a.jpg"],
    badge_tags: null,
    cancellation_policy: null,
    cancellation_hours: null,
    cancellation_refund_percent: null,
    stripe_account_id: "acct_test123",
    is_published: false,
    onboarding_step: 6,
    calendar_type: "manual",
    ical_feed_url: null,
    google_calendar_id: null,
    google_refresh_token: null,
    slug: "acme-training-abcdef0123",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function listing(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: "ccvd-canonical",
    slug: "acme-training-abcdef0123",
    name: "Acme Training",
    type: "instructor",
    city: "Oakland",
    county: "alameda",
    state: "CA",
    countiesServed: ["alameda", "contra-costa"],
    classTypes: ["both"],
    formats: ["in-person"],
    createdAt: "2026-01-01",
    ...overrides,
  };
}

describe("acceptsBookingsFromStripe", () => {
  it("is true only when stripe account id is present", () => {
    expect(acceptsBookingsFromStripe("acct_x")).toBe(true);
    expect(acceptsBookingsFromStripe("  acct_x  ")).toBe(true);
    expect(acceptsBookingsFromStripe(null)).toBe(false);
    expect(acceptsBookingsFromStripe(undefined)).toBe(false);
    expect(acceptsBookingsFromStripe("")).toBe(false);
    expect(acceptsBookingsFromStripe("   ")).toBe(false);
  });
});

describe("parsePublishLiveSlugAllowlist", () => {
  it("treats empty/unset as full go-live (null)", () => {
    expect(parsePublishLiveSlugAllowlist(undefined)).toBeNull();
    expect(parsePublishLiveSlugAllowlist(null)).toBeNull();
    expect(parsePublishLiveSlugAllowlist("")).toBeNull();
    expect(parsePublishLiveSlugAllowlist("  ,  , ")).toBeNull();
  });

  it("trims and lowercases comma-separated slugs", () => {
    expect(
      parsePublishLiveSlugAllowlist(" Acme-Training-ABCDEF0123 , other-slug ")
    ).toEqual(["acme-training-abcdef0123", "other-slug"]);
  });
});

describe("isSlugAllowedForPublishLiveSync", () => {
  it("allows everyone when allowlist is null", () => {
    expect(isSlugAllowedForPublishLiveSync("any-slug", null)).toBe(true);
  });

  it("allows only listed slugs when restricted", () => {
    const allowlist = ["internal-claim-funnel-test-6b7e67a50b"];
    expect(
      isSlugAllowedForPublishLiveSync(
        "internal-claim-funnel-test-6b7e67a50b",
        allowlist
      )
    ).toBe(true);
    expect(
      isSlugAllowedForPublishLiveSync(
        "INTERNAL-CLAIM-FUNNEL-TEST-6B7E67A50B",
        allowlist
      )
    ).toBe(true);
    expect(isSlugAllowedForPublishLiveSync("other-instructor", allowlist)).toBe(
      false
    );
  });
});

describe("deriveClassPricing", () => {
  it("maps active class types to dollars and both/initial/renewal flags", () => {
    const pricing = deriveClassPricing([
      classType({ class_type: "initial", price: 250 }),
      classType({ class_type: "renewal", price: 125 }),
      classType({ class_type: "add_a_gun", price: 50 }),
    ]);
    expect(pricing.priceInitial).toBe(250);
    expect(pricing.priceRenewal).toBe(125);
    expect(pricing.priceAddGun).toBe(50);
    expect(pricing.classTypes).toEqual(["both"]);
    expect(pricing.price_16hr_full).toBe("250");
    expect(pricing.priceMin).toBe(50);
    expect(pricing.priceMax).toBe(250);
  });

  it("ignores inactive types", () => {
    const pricing = deriveClassPricing([
      classType({ class_type: "initial", price: 200, is_active: false }),
      classType({ class_type: "renewal", price: 100 }),
    ]);
    expect(pricing.priceInitial).toBeNull();
    expect(pricing.priceRenewal).toBe(100);
    expect(pricing.classTypes).toEqual(["renewal"]);
  });
});

describe("buildListingPatch", () => {
  it("maps onboarding fields onto carry_class columns and enables bookings when Stripe is linked", () => {
    const patch = buildListingPatch(profile(), [
      classType({ class_type: "initial", price: 300 }),
      classType({ class_type: "renewal", price: 150 }),
    ]);
    expect(patch).toEqual({
      vendor_description: "We teach CCW.",
      phone: "925-555-1212",
      email: "owner@acme.test",
      website_url: "https://acme.test",
      address: "1 Main St",
      price_16hr_full: "300",
      price_8hr_renewal: "150",
      price_add_a_gun: null,
      logo_path: "https://cdn.example/logo.png",
      accepts_bookings: true,
      stripe_connect_account_id: "acct_test123",
    });
  });

  it("keeps accepts_bookings false without stripe_account_id", () => {
    const patch = buildListingPatch(profile({ stripe_account_id: null }), [
      classType({ class_type: "initial", price: 300 }),
    ]);
    expect(patch.accepts_bookings).toBe(false);
    expect(patch.stripe_connect_account_id).toBeNull();
  });
});

describe("buildPrismaVendorData", () => {
  it("keys the booking vendor by claimed slug and copies listing geo", () => {
    const data = buildPrismaVendorData(profile(), listing(), [
      classType({ class_type: "initial", price: 200 }),
    ]);
    expect(data.slug).toBe("acme-training-abcdef0123");
    expect(data.city).toBe("Oakland");
    expect(data.county).toBe("alameda");
    expect(data.countiesServed).toEqual(["alameda", "contra-costa"]);
    expect(data.acceptsBookings).toBe(true);
    expect(data.stripeConnectAccountId).toBe("acct_test123");
    expect(data.classTypes).toEqual(["initial"]);
    expect(data.photos).toEqual(["https://cdn.example/a.jpg"]);
    expect(data.priceInitial).toBe(200);
  });

  it("sets acceptsBookings false when Stripe is missing", () => {
    const data = buildPrismaVendorData(
      profile({ stripe_account_id: "  " }),
      listing(),
      [classType({ class_type: "initial", price: 200 })]
    );
    expect(data.acceptsBookings).toBe(false);
    expect(data.stripeConnectAccountId).toBeNull();
  });

  it("still publishes listing content for a skipped-Stripe instructor", () => {
    const noStripe = profile({ stripe_account_id: null });
    const types = [classType({ class_type: "initial", price: 200 })];
    const patch = buildListingPatch(noStripe, types);
    const data = buildPrismaVendorData(noStripe, listing(), types);

    expect(patch.vendor_description).toBe("We teach CCW.");
    expect(patch.phone).toBe("925-555-1212");
    expect(patch.price_16hr_full).toBe("200");
    expect(data.description).toBe("We teach CCW.");
    expect(data.priceInitial).toBe(200);
  });
});

describe("calendarClassesToSessions", () => {
  it("scaffolds initial/renewal only and converts dollars to cents", () => {
    const classes: VendorCalendarClass[] = [
      {
        id: "c1",
        vendor_id: "v1",
        external_event_id: null,
        class_type: "initial",
        title: "16hr Initial",
        description: null,
        location: null,
        range_location: null,
        start_time: "2026-06-01T09:00:00.000Z",
        end_time: "2026-06-01T17:00:00.000Z",
        is_recurring: false,
        recurrence_rule: null,
        max_students: 8,
        price: 275,
        gun_pricing: null,
        is_active: true,
      },
      {
        id: "c2",
        vendor_id: "v1",
        external_event_id: null,
        class_type: "add_a_gun",
        title: "Add a gun",
        description: null,
        location: null,
        range_location: null,
        start_time: "2026-06-02T09:00:00.000Z",
        end_time: "2026-06-02T12:00:00.000Z",
        is_recurring: false,
        recurrence_rule: null,
        max_students: 4,
        price: 50,
        gun_pricing: null,
        is_active: true,
      },
      {
        id: "c3",
        vendor_id: "v1",
        external_event_id: null,
        class_type: "renewal",
        title: null,
        description: null,
        location: null,
        range_location: null,
        start_time: "2026-06-03T08:00:00.000Z",
        end_time: "2026-06-03T16:00:00.000Z",
        is_recurring: false,
        recurrence_rule: null,
        max_students: null,
        price: null,
        gun_pricing: null,
        is_active: true,
      },
    ];

    const sessions = calendarClassesToSessions(classes, [
      classType({ class_type: "renewal", price: 95 }),
    ]);

    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({
      classType: "initial",
      priceCents: 27500,
      capacity: 8,
      title: "16hr Initial",
    });
    expect(sessions[1]).toMatchObject({
      classType: "renewal",
      priceCents: 9500,
      capacity: 12,
    });
  });
});

describe("findSourceRowIdsForCanonicalSlug", () => {
  it("returns raw ids for the merge group matching the canonical slug", () => {
    const a = listing({
      id: "row-a",
      slug: "ignored",
      name: "Acme Training",
      website: "https://acme.test",
      county: "alameda",
    });
    const b = listing({
      id: "row-b",
      slug: "ignored",
      name: "Acme Training",
      website: "https://acme.test",
      county: "contra-costa",
    });
    const canonical = mergeCanonicalVendors([a, b])[0];
    const ids = findSourceRowIdsForCanonicalSlug([a, b], canonical.slug);
    expect(ids.sort()).toEqual(["row-a", "row-b"].sort());
    expect(findSourceRowIdsForCanonicalSlug([a, b], "missing-slug")).toEqual([]);
  });
});
