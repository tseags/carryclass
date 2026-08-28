import type { Vendor } from "@/types";
import { normalizeEmail } from "@/lib/merge-canonical-vendors";

/** Digits-only phone (US-friendly). */
export function digitsOnlyPhone(phone: string | undefined | null): string {
  return String(phone ?? "").replace(/\D/g, "");
}

/**
 * Normalize a listing phone for storage/compare.
 * Keeps last 10 digits when longer (strips leading country code 1).
 */
export function normalizeListingPhone(phone: string | undefined | null): string {
  const digits = digitsOnlyPhone(phone);
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return digits;
}

/** E.164 for Twilio US sends. Returns null if not a usable 10-digit US number. */
export function toE164Us(phone: string | undefined | null): string | null {
  const ten = normalizeListingPhone(phone);
  if (ten.length !== 10) return null;
  return `+1${ten}`;
}

export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.indexOf("@");
  if (at <= 0) return "***";
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function maskPhone(phone: string): string {
  const ten = normalizeListingPhone(phone);
  if (ten.length < 4) return "(***) ***-****";
  return `(***) ***-${ten.slice(-4)}`;
}

export interface ListingClaimContacts {
  email: string | null;
  emailMasked: string | null;
  phone: string | null;
  phoneMasked: string | null;
  phoneE164: string | null;
  channels: Array<"email" | "phone">;
}

/**
 * Contacts eligible for claim verification — taken only from the directory Vendor.
 * Includes primary phone plus any countyContacts phones.
 */
export function getListingClaimContacts(vendor: Vendor): ListingClaimContacts {
  const emailRaw = vendor.email?.trim() || null;
  const email = emailRaw ? normalizeEmail(emailRaw) : null;

  const phoneCandidates = [
    vendor.phone,
    ...(vendor.countyContacts ?? []).map((c) => c.phone),
  ]
    .map((p) => normalizeListingPhone(p))
    .filter((p) => p.length === 10);

  const phone = phoneCandidates[0] ?? null;
  const phoneE164 = phone ? toE164Us(phone) : null;

  const channels: Array<"email" | "phone"> = [];
  if (email) channels.push("email");
  if (phoneE164) channels.push("phone");

  return {
    email,
    emailMasked: email ? maskEmail(email) : null,
    phone,
    phoneMasked: phone ? maskPhone(phone) : null,
    phoneE164,
    channels,
  };
}
