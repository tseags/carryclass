/**
 * Server-only data helpers for the instructor dashboard.
 *
 * Registrations and reviews live in Prisma (Postgres) keyed by the Prisma
 * `Vendor.id`, while the onboarding/profile data lives in Supabase keyed by a
 * separate vendor row. The two are linked by a shared `slug`. Every helper here
 * takes the Supabase vendor's slug, resolves the matching Prisma vendor, and
 * falls back to empty/zero state when no Prisma vendor exists yet (e.g. a newly
 * published instructor who has not received any bookings or reviews).
 *
 * Never import this module from a client component.
 */
import { prisma } from "@/lib/db";
import { isPrismaConnectionError } from "@/lib/prisma-connection-error";
import { getStripe } from "@/lib/stripe";

export interface DashboardReview {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
  classDate: string | null;
}

export interface DashboardRegistration {
  id: string;
  customerName: string;
  customerEmail: string;
  classDate: string | null;
  registeredOn: string;
  status: string;
  paidAt: string | null;
}

export interface DashboardStats {
  totalRegistrations: number;
  registrationsThisMonth: number;
  totalReviews: number;
}

export interface DashboardPayout {
  connected: boolean;
  lastAmountCents: number | null;
  lastPayoutDate: string | null;
}

/** Resolve the Prisma vendor id for a given slug. Returns null if not found. */
async function resolvePrismaVendorId(slug: string | null): Promise<string | null> {
  if (!slug?.trim()) return null;
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { slug },
      select: { id: true },
    });
    return vendor?.id ?? null;
  } catch (error) {
    if (isPrismaConnectionError(error)) return null;
    // Table-missing or other transient errors should degrade gracefully.
    console.error("[dashboard-db] resolvePrismaVendorId", error);
    return null;
  }
}

/** Approved reviews for the instructor, newest first. */
export async function getDashboardReviews(slug: string | null): Promise<DashboardReview[]> {
  const vendorId = await resolvePrismaVendorId(slug);
  if (!vendorId) return [];

  try {
    const rows = await prisma.vendorReview.findMany({
      where: { vendorId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        authorName: true,
        rating: true,
        body: true,
        createdAt: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      authorName: row.authorName,
      rating: row.rating,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      // TODO: VendorReview has no attended-class link yet; surface once available.
      classDate: null,
    }));
  } catch (error) {
    if (isPrismaConnectionError(error)) return [];
    console.error("[dashboard-db] getDashboardReviews", error);
    return [];
  }
}

/** Bookings for the instructor, newest first. */
export async function getDashboardRegistrations(
  slug: string | null,
  limit = 100
): Promise<DashboardRegistration[]> {
  const vendorId = await resolvePrismaVendorId(slug);
  if (!vendorId) return [];

  try {
    const rows = await prisma.booking.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        status: true,
        paidAt: true,
        createdAt: true,
        classSession: { select: { startsAt: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      classDate: row.classSession?.startsAt?.toISOString() ?? null,
      registeredOn: row.createdAt.toISOString(),
      status: row.status,
      paidAt: row.paidAt?.toISOString() ?? null,
    }));
  } catch (error) {
    if (isPrismaConnectionError(error)) return [];
    console.error("[dashboard-db] getDashboardRegistrations", error);
    return [];
  }
}

/** Registration + review counts for the stats row. */
export async function getDashboardStats(slug: string | null): Promise<DashboardStats> {
  const empty: DashboardStats = {
    totalRegistrations: 0,
    registrationsThisMonth: 0,
    totalReviews: 0,
  };

  const vendorId = await resolvePrismaVendorId(slug);
  if (!vendorId) return empty;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const [totalRegistrations, registrationsThisMonth, totalReviews] = await Promise.all([
      prisma.booking.count({ where: { vendorId } }),
      prisma.booking.count({
        where: { vendorId, createdAt: { gte: startOfMonth } },
      }),
      prisma.vendorReview.count({ where: { vendorId, status: "APPROVED" } }),
    ]);

    return { totalRegistrations, registrationsThisMonth, totalReviews };
  } catch (error) {
    if (isPrismaConnectionError(error)) return empty;
    console.error("[dashboard-db] getDashboardStats", error);
    return empty;
  }
}

/**
 * Last payout for the connected Stripe account.
 *
 * TODO: full payout history (with pagination) is not implemented yet — this
 * returns only the most recent payout for the Payments widget. Wire a paginated
 * `/api/dashboard/payouts` consumer when the "View payout history" screen ships.
 */
export async function getDashboardPayout(
  stripeAccountId: string | null
): Promise<DashboardPayout> {
  if (!stripeAccountId?.trim()) {
    return { connected: false, lastAmountCents: null, lastPayoutDate: null };
  }

  try {
    const payouts = await getStripe().payouts.list(
      { limit: 1 },
      { stripeAccount: stripeAccountId }
    );
    const last = payouts.data[0];
    return {
      connected: true,
      lastAmountCents: last?.amount ?? null,
      lastPayoutDate: last ? new Date(last.arrival_date * 1000).toISOString() : null,
    };
  } catch (error) {
    console.error("[dashboard-db] getDashboardPayout", error);
    // Account is connected but payout lookup failed — still report connected.
    return { connected: true, lastAmountCents: null, lastPayoutDate: null };
  }
}
