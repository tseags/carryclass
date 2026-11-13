/**
 * Whole-cart refund helpers: free every linked ClassSession seat and mark REFUNDED.
 * Cancellation windows key off the earliest session in the booking.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  earliestSessionStart,
  isWithinCancellationWindow,
} from "@/lib/booking-cart";

export async function getBookingSessionStarts(bookingId: string): Promise<Date[]> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      classSession: { select: { startsAt: true } },
      bookingSessions: {
        select: { classSession: { select: { startsAt: true } } },
      },
    },
  });
  if (!booking) return [];
  const starts = [
    booking.classSession.startsAt,
    ...booking.bookingSessions.map((row) => row.classSession.startsAt),
  ];
  return [...new Map(starts.map((d) => [d.getTime(), d])).values()];
}

export async function bookingRefundDeadlineAllows(
  bookingId: string,
  cancellationHours: number | null | undefined,
  now = new Date()
): Promise<boolean> {
  const starts = await getBookingSessionStarts(bookingId);
  const earliest = earliestSessionStart(starts.map((startsAt) => ({ startsAt })));
  if (!earliest) return false;
  return isWithinCancellationWindow(earliest, cancellationHours, now);
}

/**
 * Mark booking REFUNDED and free seats on every linked session (primary + join rows).
 * Idempotent when already REFUNDED.
 */
export async function markBookingRefundedAndFreeSeats(bookingId: string): Promise<boolean> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      classSessionId: true,
      bookingSessions: { select: { classSessionId: true } },
    },
  });
  if (!booking) return false;
  if (booking.status === "REFUNDED") return true;
  if (booking.status !== "PAID") return false;

  const sessionIds = [
    ...new Set([
      booking.classSessionId,
      ...booking.bookingSessions.map((row) => row.classSessionId),
    ]),
  ];

  const updated = await prisma.booking.updateMany({
    where: { id: bookingId, status: "PAID" },
    data: { status: "REFUNDED" },
  });
  if (updated.count === 0) return false;

  if (sessionIds.length > 0) {
    const idList = Prisma.join(sessionIds.map((id) => Prisma.sql`${id}`));
    await prisma.$executeRaw`
      UPDATE "ClassSession"
      SET enrolled = GREATEST(enrolled - 1, 0)
      WHERE id IN (${idList})
    `;
  }

  return true;
}
