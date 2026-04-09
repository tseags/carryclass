import type { PrismaClient } from "@prisma/client";
import { VENDORS } from "@/data/vendors";

export const DEMO_BOOKING_VENDOR_SLUG = "demo-ccw-booking";

type DemoSessionSeed = {
  id: string;
  daysFromNow: number;
  startHour: number;
  classType: "initial" | "renewal";
  durationHours: number;
  title: string;
  priceCents: number;
};

export const DEMO_CLASS_SESSIONS: DemoSessionSeed[] = [
  {
    id: "seed_demo_ccw_session_1",
    daysFromNow: 32,
    startHour: 9,
    classType: "initial",
    durationHours: 16,
    title: "Demo — 16hr Initial CCW (sandbox)",
    priceCents: 175_00,
  },
  {
    id: "seed_demo_ccw_session_2",
    daysFromNow: 39,
    startHour: 8,
    classType: "renewal",
    durationHours: 8,
    title: "Demo — 8hr Renewal CCW (sandbox)",
    priceCents: 95_00,
  },
  {
    id: "seed_demo_ccw_session_3",
    daysFromNow: 46,
    startHour: 9,
    classType: "initial",
    durationHours: 16,
    title: "Demo — 16hr Initial CCW (sandbox)",
    priceCents: 175_00,
  },
  {
    id: "seed_demo_ccw_session_4",
    daysFromNow: 53,
    startHour: 8,
    classType: "renewal",
    durationHours: 8,
    title: "Demo — 8hr Renewal CCW (sandbox)",
    priceCents: 95_00,
  },
  {
    id: "seed_demo_ccw_session_5",
    daysFromNow: 60,
    startHour: 9,
    classType: "initial",
    durationHours: 16,
    title: "Demo — 16hr Initial CCW (sandbox)",
    priceCents: 175_00,
  },
];

export function toDbVendor(v: (typeof VENDORS)[number]) {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    type: v.type,
    city: v.city,
    county: v.county,
    state: v.state,
    countiesServed: v.countiesServed,
    classTypes: v.classTypes,
    formats: v.formats,
    priceMin: v.priceMin ?? null,
    priceMax: v.priceMax ?? null,
    priceInitial: v.priceInitial ?? null,
    priceRenewal: v.priceRenewal ?? null,
    priceAddGun: v.priceAddGun ?? null,
    address: v.address ?? null,
    discountInfo: v.discountInfo ?? null,
    website: v.website ?? null,
    phone: v.phone ?? null,
    email: v.email ?? null,
    description: v.description ?? null,
    imageUrl: v.imageUrl ?? null,
    photos: v.photos ?? [],
    googleReviewsUrl: v.googleReviewsUrl ?? null,
    googlePlaceId: v.googlePlaceId ?? null,
    featured: v.featured ?? false,
    acceptsBookings: v.acceptsBookings ?? false,
    stripeConnectAccountId: v.stripeConnectAccountId?.trim() || null,
    createdAt: new Date(v.createdAt),
  };
}

export async function upsertDemoClassSessions(prisma: PrismaClient, vendorId: string) {
  for (const s of DEMO_CLASS_SESSIONS) {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + s.daysFromNow);
    startsAt.setHours(s.startHour, 0, 0, 0);

    const endsAt = new Date(startsAt);
    endsAt.setHours(endsAt.getHours() + s.durationHours);

    await prisma.classSession.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        vendorId,
        startsAt,
        endsAt,
        title: s.title,
        classType: s.classType,
        priceCents: s.priceCents,
        capacity: 12,
        enrolled: 0,
        timezone: "America/Los_Angeles",
      },
      update: {
        vendorId,
        startsAt,
        endsAt,
        title: s.title,
        classType: s.classType,
        priceCents: s.priceCents,
        capacity: 12,
        timezone: "America/Los_Angeles",
      },
    });
  }

  await prisma.classSession.deleteMany({
    where: { id: "seed_demo_ccw_session_initial" },
  });
}

/**
 * Ensures demo vendor + class sessions exist when DB was never seeded (H3).
 * Idempotent: skips session creation if sessions already exist for this vendor.
 */
export async function ensureDemoBookingData(prisma: PrismaClient): Promise<{
  createdVendor: boolean;
  createdSessions: boolean;
}> {
  const demo = VENDORS.find((v) => v.slug === DEMO_BOOKING_VENDOR_SLUG);
  if (!demo?.acceptsBookings) {
    return { createdVendor: false, createdSessions: false };
  }

  const connectFromEnv = process.env.DEMO_VENDOR_STRIPE_CONNECT_ACCOUNT_ID?.trim();
  const data = toDbVendor(demo);
  const createData = {
    ...data,
    stripeConnectAccountId: connectFromEnv ?? data.stripeConnectAccountId,
  };
  const { stripeConnectAccountId: _sc, ...updateBase } = data;
  const updateData = connectFromEnv
    ? { ...updateBase, stripeConnectAccountId: connectFromEnv }
    : updateBase;

  const before = await prisma.vendor.findUnique({
    where: { slug: DEMO_BOOKING_VENDOR_SLUG },
    select: { id: true },
  });

  await prisma.vendor.upsert({
    where: { slug: demo.slug },
    create: createData,
    update: updateData,
  });

  const row = await prisma.vendor.findUnique({
    where: { slug: DEMO_BOOKING_VENDOR_SLUG },
    select: { id: true },
  });
  if (!row) {
    return { createdVendor: false, createdSessions: false };
  }

  const n = await prisma.classSession.count({ where: { vendorId: row.id } });
  if (n > 0) {
    return { createdVendor: !before, createdSessions: false };
  }

  await upsertDemoClassSessions(prisma, row.id);
  return { createdVendor: !before, createdSessions: true };
}
