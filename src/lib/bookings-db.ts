import { prisma } from "./db";
import { PLATFORM_SERVICE_FEE_CENTS } from "./booking-constants";

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
  const vendor = await prisma.vendor.findUnique({
    where: { slug: vendorSlug },
    select: { id: true, acceptsBookings: true },
  });
  if (!vendor?.acceptsBookings) return null;

  const now = new Date();
  const rows = await prisma.classSession.findMany({
    where: {
      vendorId: vendor.id,
      startsAt: { gt: now },
    },
    orderBy: { startsAt: "asc" },
  });

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

  return { vendorId: vendor.id, sessions };
}

export { PLATFORM_SERVICE_FEE_CENTS };
