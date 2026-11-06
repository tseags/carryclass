/**
 * Turn a paid Stripe Checkout session into a Booking and send the student
 * confirmation email.
 *
 * Stripe's own receipt is sent by Stripe. Our confirmation is not. Test mode
 * has no webhook endpoint, so checkout.session.completed often never reaches
 * the app. The success page fulfills the same way the webhook does. Creating
 * the row and sending the email are both safe to run twice.
 *
 * The seat increment and booking insert are one SQL statement. An interactive
 * Prisma transaction goes through Supabase's transaction pooler (pgBouncer),
 * which can acknowledge the transaction without committing it. The webhook
 * then returns success, no Booking row exists, and the success page stays on
 * "Finalizing your booking…".
 */
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculatePlatformServiceFeeCents } from "@/lib/booking-constants";
import { parsePassThroughSnapshot } from "@/lib/instructor-catalog";
import { sendBookingConfirmationEmail } from "@/lib/booking-confirmation-email";
import {
  generateConfirmationCode,
  isConfirmationCodeCollision,
} from "@/lib/booking-confirmation-code";

type PaidBooking = {
  id: string;
  vendorId: string;
  classSessionId: string;
  customerName: string;
  customerEmail: string;
  confirmationCode: string | null;
};

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (typeof pi === "string") return pi;
  if (pi && "id" in pi) return pi.id;
  return null;
}

function isPaid(session: Stripe.Checkout.Session): boolean {
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2002") return true;
  if (error.code !== "P2010") return false;
  const meta = error.meta as { code?: string; message?: string } | undefined;
  return meta?.code === "23505" || `${meta?.message ?? ""} ${error.message}`.includes("23505");
}

/**
 * Reserve the seat and insert the booking in one statement so pgBouncer
 * transaction mode cannot drop the commit.
 * Returns null when the class is missing or already full.
 */
async function insertPaidBooking(input: {
  id: string;
  vendorId: string;
  classSessionId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  confirmationCode: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  clerkUserId: string | null;
  classAmountCents: number;
  serviceFeeCents: number;
  passThroughFeesJson: string | null;
  passThroughCents: number;
  totalAmountCents: number;
}): Promise<PaidBooking | null> {
  const rows = await prisma.$queryRaw<PaidBooking[]>`
    WITH seat AS (
      UPDATE "ClassSession"
      SET enrolled = enrolled + 1
      WHERE id = ${input.classSessionId}
        AND "vendorId" = ${input.vendorId}
        AND enrolled < capacity
      RETURNING id, "vendorId"
    )
    INSERT INTO "Booking" (
      "id",
      "vendorId",
      "classSessionId",
      "stripeCheckoutSessionId",
      "stripePaymentIntentId",
      "confirmationCode",
      "customerEmail",
      "customerName",
      "customerPhone",
      "clerkUserId",
      "classAmountCents",
      "serviceFeeCents",
      "passThroughFees",
      "passThroughCents",
      "totalAmountCents",
      "status",
      "paidAt",
      "createdAt"
    )
    SELECT
      ${input.id},
      seat."vendorId",
      seat.id,
      ${input.stripeCheckoutSessionId},
      ${input.stripePaymentIntentId},
      ${input.confirmationCode},
      ${input.customerEmail},
      ${input.customerName},
      ${input.customerPhone},
      ${input.clerkUserId},
      ${input.classAmountCents},
      ${input.serviceFeeCents},
      CAST(${input.passThroughFeesJson} AS jsonb),
      ${input.passThroughCents},
      ${input.totalAmountCents},
      CAST('PAID' AS "BookingStatus"),
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM seat
    RETURNING
      "id",
      "vendorId" AS "vendorId",
      "classSessionId" AS "classSessionId",
      "customerName" AS "customerName",
      "customerEmail" AS "customerEmail",
      "confirmationCode" AS "confirmationCode"
  `;
  return rows[0] ?? null;
}

async function createPaidBooking(session: Stripe.Checkout.Session): Promise<PaidBooking> {
  const md = session.metadata ?? {};
  let classAmountCents = parseInt(md.classAmountCents ?? "0", 10);
  let serviceFeeCents = calculatePlatformServiceFeeCents(classAmountCents);
  let passThroughFeesJson: string | null = null;
  let passThroughCents = 0;
  if (md.feeSnapshotId) {
    const snap = await prisma.checkoutFeeSnapshot.findUnique({
      where: { id: md.feeSnapshotId },
    });
    if (snap && snap.classSessionId === md.classSessionId) {
      classAmountCents = snap.classAmountCents;
      serviceFeeCents = calculatePlatformServiceFeeCents(classAmountCents);
      const lines = parsePassThroughSnapshot(snap.passThroughFees);
      if (lines.length) passThroughFeesJson = JSON.stringify(lines);
      passThroughCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
    }
  }

  const customerEmail = md.customerEmail ?? session.customer_email ?? "";
  const customerName = md.customerName ?? "";
  const totalAmountCents =
    session.amount_total ?? classAmountCents + passThroughCents + serviceFeeCents;

  let confirmationCode = generateConfirmationCode();
  for (let attempt = 1; ; attempt += 1) {
    try {
      const inserted = await insertPaidBooking({
        id: randomUUID(),
        vendorId: md.vendorId,
        classSessionId: md.classSessionId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId(session),
        confirmationCode,
        customerEmail,
        customerName,
        customerPhone: md.customerPhone || null,
        clerkUserId: md.clerkUserId || null,
        classAmountCents,
        serviceFeeCents,
        passThroughFeesJson,
        passThroughCents,
        totalAmountCents,
      });
      if (!inserted) {
        const cs = await prisma.classSession.findUnique({
          where: { id: md.classSessionId },
        });
        if (!cs || cs.vendorId !== md.vendorId) throw new Error("ClassSession missing");
        if (cs.enrolled >= cs.capacity) throw new Error("ClassSession full");
        throw new Error("Could not record booking");
      }

      const saved = await prisma.booking.findUnique({
        where: { id: inserted.id },
      });
      if (!saved) throw new Error("Paid booking was not saved");
      return saved;
    } catch (err) {
      if (isConfirmationCodeCollision(err) && attempt < 5) {
        confirmationCode = generateConfirmationCode();
        continue;
      }
      if (isUniqueViolation(err)) {
        const existing = await prisma.booking.findUnique({
          where: { stripeCheckoutSessionId: session.id },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }
}

/** Claim the send so a webhook and the success page cannot both deliver it. */
async function sendConfirmationOnce(
  booking: PaidBooking,
  customerFirstName?: string
): Promise<void> {
  const claim = await prisma.booking.updateMany({
    where: { id: booking.id, confirmationEmailSentAt: null },
    data: { confirmationEmailSentAt: new Date() },
  });
  if (claim.count !== 1) {
    const stillThere = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { id: true },
    });
    if (!stillThere) throw new Error("Paid booking was not saved");
    return;
  }

  try {
    const sent = await sendBookingConfirmationEmail({
      prismaVendorId: booking.vendorId,
      classSessionId: booking.classSessionId,
      customerName: booking.customerName,
      customerFirstName,
      customerEmail: booking.customerEmail,
      confirmationCode: booking.confirmationCode,
    });
    if (!sent) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { confirmationEmailSentAt: null },
      });
    }
  } catch (err) {
    await prisma.booking
      .update({
        where: { id: booking.id },
        data: { confirmationEmailSentAt: null },
      })
      .catch(() => undefined);
    throw err;
  }
}

export async function fulfillPaidCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<void> {
  const md = session.metadata;
  if (!md?.classSessionId || !md.vendorId) {
    console.warn("[fulfill-paid-booking] missing metadata", session.id);
    return;
  }
  if (!isPaid(session)) {
    console.warn("[fulfill-paid-booking] checkout not paid", session.id, session.payment_status);
    return;
  }

  const existing = await prisma.booking.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  });
  const booking = existing ?? (await createPaidBooking(session));
  await sendConfirmationOnce(booking, md.customerFirstName);
}

/** Retry the confirmation email for a booking the webhook or success page already wrote. */
export async function ensureBookingConfirmationEmail(
  stripeCheckoutSessionId: string
): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { stripeCheckoutSessionId },
  });
  if (!booking || booking.status !== "PAID") return;
  await sendConfirmationOnce(booking);
}
