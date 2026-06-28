/**
 * Sender-address resolution for outbound email.
 *
 * Deliverability constraint: Resend only lets you send "from" an address on a
 * domain you have verified. Our single verified domain is getcarryclass.com, so
 * an instructor cannot literally send as jane@hergym.com even though that's her
 * profile email. To stay deliverable while still honoring the instructor's
 * choice, we:
 *   - send FROM the chosen address only when it's on the verified domain;
 *   - otherwise send FROM the default verified address and set REPLY-TO to the
 *     instructor's address so student replies still reach them.
 */

export const DEFAULT_FROM_EMAIL = "bookings@getcarryclass.com";
export const VERIFIED_SENDING_DOMAIN = "getcarryclass.com";

function isVerifiedAddress(address: string): boolean {
  const at = address.lastIndexOf("@");
  if (at === -1) return false;
  return address.slice(at + 1).toLowerCase() === VERIFIED_SENDING_DOMAIN;
}

export interface ResolvedFrom {
  /** Address safe to pass to Resend's `from`. */
  from: string;
  /** Reply-to to set so replies reach the instructor (undefined when not needed). */
  replyTo?: string;
}

/**
 * Decide the safe `from` (and optional `reply-to`) for an instructor email.
 *
 * @param chosen   Instructor-selected from-address (template `from_email`).
 * @param fallback Instructor profile email used when no explicit choice is set.
 */
export function resolveFromAddress(
  chosen: string | null | undefined,
  fallback: string | null | undefined
): ResolvedFrom {
  const preferred = (chosen?.trim() || fallback?.trim() || "").trim();

  if (preferred && isVerifiedAddress(preferred)) {
    return { from: preferred };
  }

  // Not on a verified domain — send from the default but route replies back.
  return {
    from: DEFAULT_FROM_EMAIL,
    replyTo: preferred || undefined,
  };
}
