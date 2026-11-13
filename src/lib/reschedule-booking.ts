/**
 * Instructor-initiated booking reschedule: magic-link tokens + seat transfer.
 * No Stripe charge/refund — moves a PAID booking between same-type/same-price sessions.
 *
 * Seat moves use one SQL statement (same pgBouncer constraint as fulfill-paid-booking).
 */
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  canOfferRescheduleLink,
  isEligibleTargetSession,
} from "@/lib/reschedule-eligibility";

export { canOfferRescheduleLink, isEligibleTargetSession } from "@/lib/reschedule-eligibility";

export const RESCHEDULE_TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

export type RescheduleSessionSummary = {
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

export type RescheduleBookingSummary = {
  id: string;
  confirmationCode: string | null;
  customerName: string;
  customerEmail: string;
  status: string;
  classSessionId: string;
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  currentSession: RescheduleSessionSummary;
};

function tokenPepper(): string {
  return (
    process.env.RESCHEDULE_TOKEN_PEPPER?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim() ||
    "carryclass-reschedule-dev"
  );
}

export function hashRescheduleToken(rawToken: string): string {
  return createHash("sha256")
    .update(`${tokenPepper()}:${rawToken.trim()}`)
    .digest("hex");
}

export function generateRescheduleToken(): string {
  return randomBytes(32).toString("base64url");
}

function toSessionSummary(row: {
  id: string;
  startsAt: Date;
  endsAt: Date | null;
  title: string | null;
  classType: string;
  priceCents: number;
  capacity: number;
  enrolled: number;
  timezone: string;
}): RescheduleSessionSummary {
  return {
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    title: row.title,
    classType: row.classType,
    priceCents: row.priceCents,
    capacity: row.capacity,
    enrolled: row.enrolled,
    spotsLeft: Math.max(0, row.capacity - row.enrolled),
    timezone: row.timezone,
  };
}

export async function listEligibleRescheduleSessions(input: {
  vendorId: string;
  currentSessionId: string;
  classType: string;
  priceCents: number;
  now?: Date;
}): Promise<RescheduleSessionSummary[]> {
  const now = input.now ?? new Date();
  const rows = await prisma.classSession.findMany({
    where: {
      vendorId: input.vendorId,
      classType: input.classType,
      priceCents: input.priceCents,
      startsAt: { gt: now },
      id: { not: input.currentSessionId },
    },
    orderBy: { startsAt: "asc" },
  });

  return rows
    .filter((row) =>
      isEligibleTargetSession({
        session: row,
        booking: {
          vendorId: input.vendorId,
          classSessionId: input.currentSessionId,
          classType: input.classType,
          priceCents: input.priceCents,
        },
        now,
      })
    )
    .map(toSessionSummary);
}

export async function loadRescheduleBooking(
  bookingId: string
): Promise<RescheduleBookingSummary | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      vendor: { select: { id: true, slug: true, name: true } },
      classSession: true,
    },
  });
  if (!booking) return null;
  return {
    id: booking.id,
    confirmationCode: booking.confirmationCode,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    status: booking.status,
    classSessionId: booking.classSessionId,
    vendorId: booking.vendorId,
    vendorSlug: booking.vendor.slug,
    vendorName: booking.vendor.name,
    currentSession: toSessionSummary(booking.classSession),
  };
}

export type CreateRescheduleLinkResult =
  | { ok: true; rawToken: string; expiresAt: Date; sentTo: string; booking: RescheduleBookingSummary }
  | { ok: false; error: string; status: number };

export async function createRescheduleLink(input: {
  bookingId: string;
  vendorSlug: string;
  createdByUserId: string;
}): Promise<CreateRescheduleLinkResult> {
  const booking = await loadRescheduleBooking(input.bookingId);
  if (!booking || booking.vendorSlug !== input.vendorSlug) {
    return { ok: false, error: "Registration not found.", status: 404 };
  }
  if (
    !canOfferRescheduleLink({
      status: booking.status,
      customerEmail: booking.customerEmail,
      classDateIso: booking.currentSession.startsAt.toISOString(),
    })
  ) {
    return {
      ok: false,
      error: "Only paid upcoming registrations with an email can be rescheduled.",
      status: 400,
    };
  }

  const rawToken = generateRescheduleToken();
  const tokenHash = hashRescheduleToken(rawToken);
  const expiresAt = new Date(Date.now() + RESCHEDULE_TOKEN_TTL_MS);

  // Avoid interactive Prisma transactions (pgBouncer). Invalidate then insert.
  await prisma.bookingRescheduleToken.updateMany({
    where: { bookingId: booking.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.bookingRescheduleToken.create({
    data: {
      bookingId: booking.id,
      tokenHash,
      expiresAt,
      createdByUserId: input.createdByUserId,
    },
  });

  return {
    ok: true,
    rawToken,
    expiresAt,
    sentTo: booking.customerEmail.trim().toLowerCase(),
    booking,
  };
}

export type RescheduleTokenLookup =
  | {
      ok: true;
      tokenId: string;
      booking: RescheduleBookingSummary;
      eligibleSessions: RescheduleSessionSummary[];
    }
  | { ok: false; error: "invalid" | "expired" | "used" | "ineligible"; message: string };

export async function lookupRescheduleToken(rawToken: string): Promise<RescheduleTokenLookup> {
  const tokenHash = hashRescheduleToken(rawToken);
  const row = await prisma.bookingRescheduleToken.findUnique({
    where: { tokenHash },
  });
  if (!row) {
    return {
      ok: false,
      error: "invalid",
      message: "This reschedule link is invalid.",
    };
  }
  if (row.usedAt) {
    return {
      ok: false,
      error: "used",
      message: "This reschedule link has already been used.",
    };
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return {
      ok: false,
      error: "expired",
      message: "This reschedule link has expired. Ask your instructor to send a new one.",
    };
  }

  const booking = await loadRescheduleBooking(row.bookingId);
  if (
    !booking ||
    !canOfferRescheduleLink({
      status: booking.status,
      customerEmail: booking.customerEmail,
      classDateIso: booking.currentSession.startsAt.toISOString(),
    })
  ) {
    return {
      ok: false,
      error: "ineligible",
      message: "This booking can no longer be rescheduled. Contact your instructor.",
    };
  }

  const eligibleSessions = await listEligibleRescheduleSessions({
    vendorId: booking.vendorId,
    currentSessionId: booking.classSessionId,
    classType: booking.currentSession.classType,
    priceCents: booking.currentSession.priceCents,
  });

  return {
    ok: true,
    tokenId: row.id,
    booking,
    eligibleSessions,
  };
}

type TransferRow = {
  booking_id: string;
  old_session_id: string;
  new_session_id: string;
};

/**
 * Atomically: reserve a seat on the new session (capacity-checked), move the
 * booking, then free a seat on the old session. Returns null when the target
 * is full/ineligible or the booking cannot move.
 */
export async function transferBookingToSession(input: {
  bookingId: string;
  vendorId: string;
  oldSessionId: string;
  newSessionId: string;
}): Promise<{ bookingId: string; oldSessionId: string; newSessionId: string } | null> {
  const rows = await prisma.$queryRaw<TransferRow[]>`
    WITH booking_src AS (
      SELECT
        b.id,
        b."vendorId",
        b."classSessionId" AS old_id,
        old."classType",
        old."priceCents"
      FROM "Booking" b
      JOIN "ClassSession" old ON old.id = b."classSessionId"
      WHERE b.id = ${input.bookingId}
        AND b.status = 'PAID'
        AND b."classSessionId" = ${input.oldSessionId}
        AND b."vendorId" = ${input.vendorId}
    ),
    seat AS (
      UPDATE "ClassSession" cs
      SET enrolled = enrolled + 1
      FROM booking_src bs
      WHERE cs.id = ${input.newSessionId}
        AND cs."vendorId" = bs."vendorId"
        AND cs.enrolled < cs.capacity
        AND cs."startsAt" > NOW()
        AND cs."classType" = bs."classType"
        AND cs."priceCents" = bs."priceCents"
        AND cs.id <> bs.old_id
      RETURNING cs.id, bs.id AS booking_id, bs.old_id
    ),
    moved AS (
      UPDATE "Booking" b
      SET
        "classSessionId" = seat.id,
        "previousClassSessionId" = seat.old_id,
        "rescheduledAt" = NOW()
      FROM seat
      WHERE b.id = seat.booking_id
      RETURNING b.id AS booking_id, seat.old_id AS old_session_id, seat.id AS new_session_id
    ),
    dec AS (
      UPDATE "ClassSession" cs
      SET enrolled = GREATEST(cs.enrolled - 1, 0)
      FROM moved m
      WHERE cs.id = m.old_session_id
      RETURNING cs.id
    )
    SELECT booking_id, old_session_id, new_session_id FROM moved
  `;

  const row = rows[0];
  if (!row) return null;
  return {
    bookingId: row.booking_id,
    oldSessionId: row.old_session_id,
    newSessionId: row.new_session_id,
  };
}

export type ApplyRescheduleResult =
  | {
      ok: true;
      booking: RescheduleBookingSummary;
      previousSession: RescheduleSessionSummary;
      newSession: RescheduleSessionSummary;
    }
  | { ok: false; error: string; code: "token" | "full" | "not_found" | "invalid_session" };

export async function applyRescheduleWithToken(input: {
  rawToken: string;
  classSessionId: string;
}): Promise<ApplyRescheduleResult> {
  const lookup = await lookupRescheduleToken(input.rawToken);
  if (!lookup.ok) {
    return { ok: false, error: lookup.message, code: "token" };
  }

  const targetId = input.classSessionId.trim();
  if (!targetId) {
    return { ok: false, error: "Choose a class time.", code: "invalid_session" };
  }
  if (!lookup.eligibleSessions.some((s) => s.id === targetId)) {
    return {
      ok: false,
      error:
        "That class is no longer available. Pick another open time, or ask your instructor for a new link.",
      code: "full",
    };
  }

  const previousSession = lookup.booking.currentSession;
  const moved = await transferBookingToSession({
    bookingId: lookup.booking.id,
    vendorId: lookup.booking.vendorId,
    oldSessionId: lookup.booking.classSessionId,
    newSessionId: targetId,
  });
  if (!moved) {
    return {
      ok: false,
      error:
        "That class just filled up. Pick another open time, or ask your instructor for a new link.",
      code: "full",
    };
  }

  await prisma.bookingRescheduleToken.update({
    where: { id: lookup.tokenId },
    data: { usedAt: new Date() },
  });

  const booking = await loadRescheduleBooking(moved.bookingId);
  if (!booking) {
    return { ok: false, error: "Booking not found after reschedule.", code: "not_found" };
  }

  return {
    ok: true,
    booking,
    previousSession,
    newSession: booking.currentSession,
  };
}
