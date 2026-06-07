import { VENDORS } from "@/data/vendors";
import {
  DEMO_BOOKING_VENDOR_SLUG,
  ensureDemoBookingData,
} from "@/lib/demo-booking-seed-shared";
import { prisma } from "./db";
import {
  calculatePlatformServiceFeeCents,
  PLATFORM_SERVICE_FEE_PERCENT_LABEL,
  PLATFORM_SERVICE_FEE_RATE,
} from "./booking-constants";

/** Sandbox-only: shift past demo sessions forward so listing query (startsAt > now) finds them again. */
async function refreshStaleDemoSessionsIfNeeded(
  vendorSlug: string,
  now: Date
): Promise<boolean> {
  if (vendorSlug !== DEMO_BOOKING_VENDOR_SLUG) return false;

  const all = await prisma.classSession.findMany({
    where: { vendor: { slug: vendorSlug } },
  });
  if (all.length === 0) return false;

  const msPerDay = 24 * 60 * 60 * 1000;
  let updated = 0;
  for (const s of all) {
    if (s.startsAt > now) continue;
    const daysToShift = Math.ceil((now.getTime() - s.startsAt.getTime()) / msPerDay) + 45;
    const shiftMs = daysToShift * msPerDay;
    await prisma.classSession.update({
      where: { id: s.id },
      data: {
        startsAt: new Date(s.startsAt.getTime() + shiftMs),
        endsAt: s.endsAt ? new Date(s.endsAt.getTime() + shiftMs) : null,
      },
    });
    updated += 1;
  }

  return updated > 0;
}

export type PublicClassSession = {
  id: string;
  startsAt: Date;
  endsAt: Date | null;
  title: string | null;
  classType: string;
  priceCents: number;
  capacity: number;
  enrolled: number;
  spotsLeft: number;
  timezone: string;
};

export async function getUpcomingSessionsForVendorSlug(
  vendorSlug: string
): Promise<{ vendorId: string; sessions: PublicClassSession[] } | null> {
  const staticVendor = VENDORS.find((v) => v.slug === vendorSlug);

  if (vendorSlug === DEMO_BOOKING_VENDOR_SLUG && staticVendor?.acceptsBookings) {
    try {
      await ensureDemoBookingData(prisma);
    } catch (e) {
      console.error("[bookings-db] ensureDemoBookingData", e);
    }
  }

  let prismaVendor: { id: string; acceptsBookings: boolean } | null = null;
  try {
    prismaVendor = await prisma.vendor.findUnique({
      where: { slug: vendorSlug },
      select: { id: true, acceptsBookings: true },
    });
  } catch (e) {
    console.error("[bookings-db] getUpcomingSessionsForVendorSlug", e);
    return null;
  }

  // DB can be stale (acceptsBookings false); static seed data is source of truth when it says true.
  const bookingAllowed =
    prismaVendor?.acceptsBookings === true || staticVendor?.acceptsBookings === true;
  if (!bookingAllowed) return null;

  const now = new Date();
  let rows: Awaited<ReturnType<typeof prisma.classSession.findMany>>;
  try {
    rows = await prisma.classSession.findMany({
      where: {
        vendor: { slug: vendorSlug },
        startsAt: { gt: now },
      },
      orderBy: { startsAt: "asc" },
    });
  } catch (e) {
    console.error("[bookings-db] classSession.findMany", e);
    return null;
  }

  let totalSessionsIgnoreDate = 0;
  if (rows.length === 0) {
    try {
      totalSessionsIgnoreDate = await prisma.classSession.count({
        where: { vendor: { slug: vendorSlug } },
      });
    } catch {
      totalSessionsIgnoreDate = -1;
    }
  }

  if (
    rows.length === 0 &&
    totalSessionsIgnoreDate > 0 &&
    vendorSlug === DEMO_BOOKING_VENDOR_SLUG
  ) {
    try {
      const didRefresh = await refreshStaleDemoSessionsIfNeeded(vendorSlug, now);
      if (didRefresh) {
        rows = await prisma.classSession.findMany({
          where: {
            vendor: { slug: vendorSlug },
            startsAt: { gt: now },
          },
          orderBy: { startsAt: "asc" },
        });
      }
    } catch (e) {
      console.error("[bookings-db] refreshStaleDemoSessionsIfNeeded", e);
    }
  }

  const sessions: PublicClassSession[] = rows
    .filter((r) => r.enrolled < r.capacity)
    .map((r) => ({
      id: r.id,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      title: r.title,
      classType: r.classType,
      priceCents: r.priceCents,
      capacity: r.capacity,
      enrolled: r.enrolled,
      spotsLeft: r.capacity - r.enrolled,
      timezone: r.timezone,
    }));

  const vendorId = prismaVendor?.id ?? rows[0]?.vendorId ?? staticVendor?.id ?? "";
  if (!vendorId) return null;

  return { vendorId, sessions };
}

export {
  calculatePlatformServiceFeeCents,
  PLATFORM_SERVICE_FEE_PERCENT_LABEL,
  PLATFORM_SERVICE_FEE_RATE,
};
