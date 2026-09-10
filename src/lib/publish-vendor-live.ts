/**
 * Publish bridge: onboarding profile → public listing + Prisma booking vendor.
 * Listing writes always go through DATABASE_URL (see vendor-data rules).
 */
import { prisma } from "@/lib/db";
import type {
  VendorCalendarClass,
  VendorClassType,
  VendorProfile,
} from "@/lib/onboarding-db";
import {
  buildListingPatch,
  buildPrismaVendorData,
  calendarClassesToSessions,
  isSlugAllowedForPublishLiveSync,
  parsePublishLiveSlugAllowlist,
  type SessionScaffoldInput,
} from "@/lib/publish-vendor-live-map";
import {
  findCarryClassSourceRowIdsForSlug,
  getVendorBySlug,
  updateCarryClassVendorListingRows,
} from "@/lib/vendors-db";

export {
  acceptsBookingsFromStripe,
  buildListingPatch,
  buildPrismaVendorData,
  calendarClassesToSessions,
  deriveClassPricing,
  isSlugAllowedForPublishLiveSync,
  parsePublishLiveSlugAllowlist,
} from "@/lib/publish-vendor-live-map";
export type {
  BookableClassType,
  CarryClassListingPublishPatch,
  DerivedClassPricing,
  PrismaVendorPublishData,
  SessionScaffoldInput,
} from "@/lib/publish-vendor-live-map";

async function upsertClassSessionsForVendor(
  vendorId: string,
  sessions: SessionScaffoldInput[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const session of sessions) {
    const existing = await prisma.classSession.findFirst({
      where: {
        vendorId,
        startsAt: session.startsAt,
        classType: session.classType,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.classSession.update({
        where: { id: existing.id },
        data: {
          endsAt: session.endsAt,
          title: session.title,
          priceCents: session.priceCents,
          capacity: session.capacity,
          timezone: "America/Los_Angeles",
        },
      });
      updated += 1;
    } else {
      await prisma.classSession.create({
        data: {
          vendorId,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          title: session.title,
          classType: session.classType,
          priceCents: session.priceCents,
          capacity: session.capacity,
          enrolled: 0,
          timezone: "America/Los_Angeles",
        },
      });
      created += 1;
    }
  }

  return { created, updated };
}

export type PublishLiveResult = {
  slug: string;
  /** True when allowlist blocked listing/Prisma/session writes. */
  skipped: boolean;
  listingRowsUpdated: number;
  prismaVendorId: string | null;
  sessionsCreated: number;
  sessionsUpdated: number;
};

/**
 * Sync a claimed onboarding vendor into the public directory + booking system.
 * Does not set onboarding `is_published` — caller does that after success
 * (including when live sync is skipped by the slug allowlist).
 */
export async function syncPublishedVendorToLive(input: {
  profile: VendorProfile;
  classTypes: VendorClassType[];
  calendarClasses: VendorCalendarClass[];
}): Promise<PublishLiveResult> {
  const slug = input.profile.slug?.trim();
  if (!slug) {
    throw new Error("Cannot publish without a claimed listing slug.");
  }

  const allowlist = parsePublishLiveSlugAllowlist();
  if (allowlist !== null) {
    console.warn(
      `[publish-vendor-live] ⚠ PUBLISH_LIVE_SLUG_ALLOWLIST is ACTIVE (${allowlist.length} slug(s): ${allowlist.join(", ")}). NOT full go-live — clear this env to sync every publish.`
    );
    if (!isSlugAllowedForPublishLiveSync(slug, allowlist)) {
      console.warn(
        `[publish-vendor-live] Skipping live sync for slug "${slug}" (not on allowlist). Caller may still set onboarding is_published.`
      );
      return {
        slug,
        skipped: true,
        listingRowsUpdated: 0,
        prismaVendorId: null,
        sessionsCreated: 0,
        sessionsUpdated: 0,
      };
    }
  }

  const listing = await getVendorBySlug(slug, { audience: "claim" });
  if (!listing) {
    throw new Error(`Claimed listing not found for slug: ${slug}`);
  }

  const rowIds = await findCarryClassSourceRowIdsForSlug(slug);
  if (rowIds.length === 0) {
    throw new Error(
      `No carry_class_vendor_data rows found for claimed slug: ${slug}`
    );
  }

  const listingPatch = buildListingPatch(input.profile, input.classTypes);
  const listingRowsUpdated = await updateCarryClassVendorListingRows(
    rowIds,
    listingPatch
  );
  if (listingRowsUpdated < 1) {
    throw new Error(
      `Failed to update carry_class_vendor_data rows for slug: ${slug}`
    );
  }

  const vendorData = buildPrismaVendorData(
    input.profile,
    listing,
    input.classTypes
  );

  const prismaVendor = await prisma.vendor.upsert({
    where: { slug: vendorData.slug },
    create: vendorData,
    update: {
      name: vendorData.name,
      type: vendorData.type,
      city: vendorData.city,
      county: vendorData.county,
      state: vendorData.state,
      countiesServed: vendorData.countiesServed,
      classTypes: vendorData.classTypes,
      formats: vendorData.formats,
      priceMin: vendorData.priceMin,
      priceMax: vendorData.priceMax,
      priceInitial: vendorData.priceInitial,
      priceRenewal: vendorData.priceRenewal,
      priceAddGun: vendorData.priceAddGun,
      address: vendorData.address,
      website: vendorData.website,
      phone: vendorData.phone,
      email: vendorData.email,
      description: vendorData.description,
      imageUrl: vendorData.imageUrl,
      photos: vendorData.photos,
      acceptsBookings: vendorData.acceptsBookings,
      stripeConnectAccountId: vendorData.stripeConnectAccountId,
    },
    select: { id: true },
  });

  // No Stripe Connect ⇒ no bookable inventory. Sessions are scaffolded on the
  // re-sync that runs once the instructor connects (stripe-connect/callback).
  const sessions = vendorData.acceptsBookings
    ? calendarClassesToSessions(input.calendarClasses, input.classTypes)
    : [];
  const { created, updated } = await upsertClassSessionsForVendor(
    prismaVendor.id,
    sessions
  );

  return {
    slug: vendorData.slug,
    skipped: false,
    listingRowsUpdated,
    prismaVendorId: prismaVendor.id,
    sessionsCreated: created,
    sessionsUpdated: updated,
  };
}
