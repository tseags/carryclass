/**
 * Pure reschedule eligibility helpers (safe for client components).
 */

/** Pure eligibility for the instructor CRM “Send reschedule link” affordance. */
export function canOfferRescheduleLink(input: {
  status: string;
  customerEmail: string | null | undefined;
  classDateIso: string | null | undefined;
  now?: Date;
}): boolean {
  if (input.status.toUpperCase() !== "PAID") return false;
  if (!input.customerEmail?.trim()) return false;
  if (!input.classDateIso) return false;
  const startsAt = new Date(input.classDateIso);
  if (Number.isNaN(startsAt.getTime())) return false;
  const now = input.now ?? new Date();
  return startsAt.getTime() > now.getTime();
}

export function isEligibleTargetSession(input: {
  session: {
    id: string;
    vendorId: string;
    classType: string;
    priceCents: number;
    capacity: number;
    enrolled: number;
    startsAt: Date;
  };
  booking: {
    vendorId: string;
    classSessionId: string;
    classType: string;
    priceCents: number;
  };
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  const { session, booking } = input;
  if (session.id === booking.classSessionId) return false;
  if (session.vendorId !== booking.vendorId) return false;
  if (session.classType !== booking.classType) return false;
  if (session.priceCents !== booking.priceCents) return false;
  if (session.startsAt.getTime() <= now.getTime()) return false;
  if (session.enrolled >= session.capacity) return false;
  return true;
}
