/**
 * Booking success-page data, keyed by Stripe Checkout session id.
 *
 * The Booking row is written by the Stripe webhook, which can lag the redirect
 * back from Checkout. Until it lands, class/price details come from the
 * Checkout session metadata so the page is never empty.
 */
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getVendorProfileBySlug } from "@/lib/onboarding-db";
import { calculatePlatformServiceFeeCents } from "@/lib/booking-constants";
import {
  CCW_PUBLIC_COPY,
  isCanonicalClassType,
  parsePassThroughSnapshot,
  type PassThroughSnapshot,
} from "@/lib/instructor-catalog";

export type BookingConfirmationState =
  /** Booking row exists — confirmation code is final. */
  | "confirmed"
  /** Payment done, webhook hasn't written the booking yet. */
  | "pending"
  /** Checkout session is still open or expired — nothing was charged. */
  | "unpaid";

export type BookingConfirmation = {
  state: BookingConfirmationState;
  confirmationCode: string | null;
  vendorName: string;
  vendorSlug: string;
  classTitle: string;
  classType: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  location: string | null;
  customerName: string;
  customerEmail: string;
  classAmountCents: number;
  passThroughFees: PassThroughSnapshot[];
  serviceFeeCents: number;
  totalAmountCents: number;
  status: string | null;
  paidAt: string | null;
};

export function bookingClassTitle(classType: string, title: string | null): string {
  if (title?.trim()) return title.trim();
  if (isCanonicalClassType(classType)) return CCW_PUBLIC_COPY[classType].title;
  return "CCW class";
}

async function vendorLocation(slug: string, fallback: string | null): Promise<string | null> {
  const profile = await getVendorProfileBySlug(slug).catch(() => null);
  return profile?.address?.trim() || fallback?.trim() || null;
}

async function fromBooking(sessionId: string): Promise<BookingConfirmation | null> {
  const booking = await prisma.booking.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    include: {
      vendor: { select: { name: true, slug: true, address: true } },
      classSession: true,
    },
  });
  if (!booking) return null;

  const cs = booking.classSession;
  return {
    state: "confirmed",
    confirmationCode: booking.confirmationCode,
    vendorName: booking.vendor.name,
    vendorSlug: booking.vendor.slug,
    classTitle: bookingClassTitle(cs.classType, cs.title),
    classType: cs.classType,
    startsAt: cs.startsAt.toISOString(),
    endsAt: cs.endsAt?.toISOString() ?? null,
    timezone: cs.timezone || "America/Los_Angeles",
    location: await vendorLocation(booking.vendor.slug, booking.vendor.address),
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    classAmountCents: booking.classAmountCents,
    passThroughFees: parsePassThroughSnapshot(booking.passThroughFees),
    serviceFeeCents: booking.serviceFeeCents,
    totalAmountCents: booking.totalAmountCents,
    status: booking.status,
    paidAt: booking.paidAt?.toISOString() ?? null,
  };
}

async function fromCheckoutSession(sessionId: string): Promise<BookingConfirmation | null> {
  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.warn("[booking-confirmation] checkout session lookup failed", error);
    return null;
  }
  const md = session.metadata;
  if (!md?.classSessionId) return null;

  const cs = await prisma.classSession.findUnique({
    where: { id: md.classSessionId },
    include: { vendor: { select: { name: true, slug: true, address: true } } },
  });
  if (!cs || cs.vendorId !== md.vendorId) return null;

  let classAmountCents = parseInt(md.classAmountCents ?? "0", 10) || 0;
  let passThroughFees: PassThroughSnapshot[] = [];
  if (md.feeSnapshotId) {
    const snap = await prisma.checkoutFeeSnapshot.findUnique({ where: { id: md.feeSnapshotId } });
    if (snap && snap.classSessionId === cs.id) {
      classAmountCents = snap.classAmountCents;
      passThroughFees = parsePassThroughSnapshot(snap.passThroughFees);
    }
  }
  const serviceFeeCents = calculatePlatformServiceFeeCents(classAmountCents);
  const passThroughCents = passThroughFees.reduce((sum, fee) => sum + fee.amountCents, 0);

  return {
    state: session.status === "complete" ? "pending" : "unpaid",
    confirmationCode: null,
    vendorName: cs.vendor.name,
    vendorSlug: cs.vendor.slug,
    classTitle: bookingClassTitle(cs.classType, cs.title),
    classType: cs.classType,
    startsAt: cs.startsAt.toISOString(),
    endsAt: cs.endsAt?.toISOString() ?? null,
    timezone: cs.timezone || "America/Los_Angeles",
    location: await vendorLocation(cs.vendor.slug, cs.vendor.address),
    customerName: md.customerName ?? "",
    customerEmail: md.customerEmail ?? session.customer_email ?? "",
    classAmountCents,
    passThroughFees,
    serviceFeeCents,
    totalAmountCents:
      session.amount_total ?? classAmountCents + passThroughCents + serviceFeeCents,
    status: null,
    paidAt: null,
  };
}

export async function getBookingConfirmation(
  sessionId: string
): Promise<BookingConfirmation | null> {
  if (!sessionId.startsWith("cs_")) return null;
  return (await fromBooking(sessionId)) ?? (await fromCheckoutSession(sessionId));
}
