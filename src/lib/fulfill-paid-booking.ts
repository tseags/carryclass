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
import { sendInstructorBookingNotificationEmail } from "@/lib/instructor-booking-notification-email";
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

function parseSessionIdsFromMetadata(md: Stripe.Metadata): string[] {
  const fromList = (md.classSessionIds ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const primary = md.classSessionId?.trim();
  if (fromList.length > 0) return [...new Set(fromList)];
  return primary ? [primary] : [];
}

/**
 * Reserve seats on every selected session and insert the booking + BookingSession
 * links in one statement so pgBouncer transaction mode cannot drop the commit.
 * Returns null when any class is missing or already full.
 */
async function insertPaidBooking(input: {
  id: string;
  vendorId: string;
  classSessionIds: string[];
  primaryClassSessionId: string;
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
  const sessionIds = [...new Set(input.classSessionIds)];
  if (sessionIds.length === 0) return null;
  const primaryId = sessionIds.includes(input.primaryClassSessionId)
    ? input.primaryClassSessionId
    : sessionIds[0]!;
  const linkIds = sessionIds.map(() => randomUUID());
  const idList = Prisma.join(sessionIds.map((id) => Prisma.sql`${id}`));
  const linkIdList = Prisma.join(linkIds.map((id) => Prisma.sql`${id}`));
  const sessionIdListForUnnest = Prisma.join(sessionIds.map((id) => Prisma.sql`${id}`));

  const rows = await prisma.$queryRaw<PaidBooking[]>`
    WITH seat AS (
      UPDATE "ClassSession"
      SET enrolled = enrolled + 1
      WHERE id IN (${idList})
        AND "vendorId" = ${input.vendorId}
        AND enrolled < capacity
        AND (
          SELECT COUNT(*)::int
          FROM "ClassSession"
          WHERE id IN (${idList})
            AND "vendorId" = ${input.vendorId}
            AND enrolled < capacity
        ) = ${sessionIds.length}
      RETURNING id
    ),
    booked AS (
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
        ${input.vendorId},
        ${primaryId},
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
      WHERE (SELECT COUNT(*)::int FROM seat) = ${sessionIds.length}
      RETURNING
        "id",
        "vendorId" AS "vendorId",
        "classSessionId" AS "classSessionId",
        "customerName" AS "customerName",
        "customerEmail" AS "customerEmail",
        "confirmationCode" AS "confirmationCode"
    ),
    links AS (
      INSERT INTO "BookingSession" ("id", "bookingId", "classSessionId")
      SELECT link_id, booked.id, session_id
      FROM booked
      CROSS JOIN LATERAL (
        SELECT *
        FROM unnest(
          ARRAY[${linkIdList}]::text[],
          ARRAY[${sessionIdListForUnnest}]::text[]
        ) AS t(link_id, session_id)
      ) pairs
      RETURNING "bookingId"
    )
    SELECT
      booked."id",
      booked."vendorId",
      booked."classSessionId",
      booked."customerName",
      booked."customerEmail",
      booked."confirmationCode"
    FROM booked
  `;
  return rows[0] ?? null;
}

async function createPaidBooking(session: Stripe.Checkout.Session): Promise<PaidBooking> {
  const md = session.metadata ?? {};
  const classSessionIds = parseSessionIdsFromMetadata(md);
  const primaryClassSessionId = md.classSessionId?.trim() || classSessionIds[0] || "";
  let classAmountCents = parseInt(md.classAmountCents ?? "0", 10);
  let serviceFeeCents = calculatePlatformServiceFeeCents(classAmountCents);
  let passThroughFeesJson: string | null = null;
  let passThroughCents = 0;
  if (md.feeSnapshotId) {
    const snap = await prisma.checkoutFeeSnapshot.findUnique({
      where: { id: md.feeSnapshotId },
    });
    if (snap && snap.classSessionId === primaryClassSessionId) {
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
        classSessionIds:
          classSessionIds.length > 0 ? classSessionIds : [primaryClassSessionId],
        primaryClassSessionId,
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
        const missing = await prisma.classSession.findMany({
          where: {
            id: {
              in:
                classSessionIds.length > 0
                  ? classSessionIds
                  : [primaryClassSessionId],
            },
          },
        });
        if (missing.length === 0 || missing.some((cs) => cs.vendorId !== md.vendorId)) {
          throw new Error("ClassSession missing");
        }
        if (missing.some((cs) => cs.enrolled >= cs.capacity)) {
          throw new Error("ClassSession full");
        }
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
      bookingId: booking.id,
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

/** Same once-only claim pattern as the student confirmation email. */
async function sendInstructorNotificationOnce(booking: PaidBooking): Promise<void> {
  const claim = await prisma.booking.updateMany({
    where: { id: booking.id, instructorNotificationSentAt: null },
    data: { instructorNotificationSentAt: new Date() },
  });
  if (claim.count !== 1) return;

  try {
    const sent = await sendInstructorBookingNotificationEmail({
      bookingId: booking.id,
    });
    if (!sent) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { instructorNotificationSentAt: null },
      });
    }
  } catch (err) {
    await prisma.booking
      .update({
        where: { id: booking.id },
        data: { instructorNotificationSentAt: null },
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
  try {
    await sendInstructorNotificationOnce(booking);
  } catch (err) {
    // Student confirmation already succeeded — don't fail fulfillment over this.
    console.warn("[fulfill-paid-booking] instructor notification failed", err);
  }
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
