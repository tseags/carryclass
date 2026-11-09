/**
 * Instructor prefs for “someone just booked” emails.
 * Empty recipient list means fall back to the profile / listing email at send time.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_BOOKING_NOTIFICATION_EMAILS = 5;

export function normalizeBookingNotificationEmails(
  raw: unknown
): { ok: true; emails: string[] } | { ok: false; error: string } {
  const parts: string[] = [];
  if (typeof raw === "string") {
    parts.push(...raw.split(/[\s,;]+/));
  } else if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") parts.push(...item.split(/[\s,;]+/));
      else if (item != null) {
        return { ok: false, error: "Each notification email must be a string." };
      }
    }
  } else if (raw != null) {
    return { ok: false, error: "Notification emails must be a list or comma-separated string." };
  }

  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of parts) {
    const email = part.trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_RE.test(email)) {
      return { ok: false, error: `Invalid email address: ${part.trim()}` };
    }
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  if (emails.length > MAX_BOOKING_NOTIFICATION_EMAILS) {
    return {
      ok: false,
      error: `Add at most ${MAX_BOOKING_NOTIFICATION_EMAILS} notification emails.`,
    };
  }

  return { ok: true, emails };
}

/** Recipients for a new booking, or [] when notifications are off / no address. */
export function resolveBookingNotificationRecipients(input: {
  enabled?: boolean | null;
  notificationEmails?: string[] | null;
  profileEmail?: string | null;
  listingEmail?: string | null;
}): string[] {
  if (input.enabled === false) return [];

  const custom = (input.notificationEmails ?? [])
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (custom.length) {
    const seen = new Set<string>();
    return custom.filter((e) => {
      if (!EMAIL_RE.test(e) || seen.has(e)) return false;
      seen.add(e);
      return true;
    });
  }

  const fallback =
    input.profileEmail?.trim().toLowerCase() ||
    input.listingEmail?.trim().toLowerCase() ||
    "";
  return fallback && EMAIL_RE.test(fallback) ? [fallback] : [];
}
