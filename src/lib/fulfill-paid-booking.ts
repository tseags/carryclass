/**
 * Turn a paid Stripe Checkout session into a Booking and send the student
 * confirmation email.
 *
 * Stripe's own receipt is sent by Stripe. Our confirmation is not. Test mode
 * has no webhook endpoint, so checkout.session.completed often never reaches
 * the app. The success page fulfills the same way the webhook does. Creating
 * the row and sending the email are both safe to run twice.
 */
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

async function createPaidBooking(session: Stripe.Checkout.Session): Promise<PaidBooking> {
  const md = session.metadata ?? {};
  let classAmountCents = parseInt(md.classAmountCents ?? "0", 10);
  let serviceFeeCents = calculatePlatformServiceFeeCents(classAmountCents);
  let passThroughFees: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
  let passThroughCents = 0;
  if (md.feeSnapshotId) {
    const snap = await prisma.checkoutFeeSnapshot.findUnique({
      where: { id: md.feeSnapshotId },
    });
    if (snap && snap.classSessionId === md.classSessionId) {
      classAmountCents = snap.classAmountCents;
      serviceFeeCents = calculatePlatformServiceFeeCents(classAmountCents);
      const lines = parsePassThroughSnapshot(snap.passThroughFees);
      if (lines.length) passThroughFees = lines as Prisma.InputJsonValue;
      passThroughCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
    }
  }

  let confirmationCode = generateConfirmationCode();
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const cs = await tx.classSession.findUnique({
          where: { id: md.classSessionId },
        });
        if (!cs) throw new Error("ClassSession missing");
        if (cs.enrolled >= cs.capacity) throw new Error("ClassSession full");

        const created = await tx.booking.create({
          data: {
            vendorId: md.vendorId,
            classSessionId: md.classSessionId,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId(session),
            confirmationCode,
            customerEmail: md.customerEmail ?? session.customer_email ?? "",
            customerName: md.customerName ?? "",
            customerPhone: md.customerPhone || null,
            clerkUserId: md.clerkUserId || null,
            classAmountCents,
            serviceFeeCents,
            passThroughFees,
            passThroughCents,
            totalAmountCents:
              session.amount_total ?? classAmountCents + passThroughCents + serviceFeeCents,
            status: "PAID",
            paidAt: new Date(),
          },
        });

        await tx.classSession.update({
          where: { id: cs.id },
          data: { enrolled: { increment: 1 } },
        });

        return created;
      });
    } catch (err) {
      if (isConfirmationCodeCollision(err) && attempt < 5) {
        confirmationCode = generateConfirmationCode();
        continue;
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
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
  if (claim.count !== 1) return;

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
