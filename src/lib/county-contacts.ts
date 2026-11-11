/**
 * Optional per-county contact overrides collected in onboarding Step 1.
 * Empty fields inherit the instructor's primary address / phone / email.
 */
import { CALIFORNIA_COUNTIES, getCountyDisplayName } from "@/data/counties";
import type { VendorCountyContact } from "@/types";

export type CountyContactFields = {
  address?: string;
  phone?: string;
  email?: string;
};

/** Keyed by canonical California county slug. */
export type CountyContactsMap = Record<string, CountyContactFields>;

export type NormalizedCountyContacts =
  | { ok: true; contacts: CountyContactsMap }
  | { ok: false; error: string };

const VALID_COUNTY_SLUGS = new Set<string>(CALIFORNIA_COUNTIES);
const MAX_FIELD_LENGTH = 200;

function trimOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeAddressKey(address: string | undefined | null): string {
  return trimOrEmpty(address)
    .toLowerCase()
    .replace(/[.,]/g, "");
}

function normalizePhoneKey(phone: string | undefined | null): string {
  return trimOrEmpty(phone).replace(/[^0-9]/g, "");
}

function normalizeEmailKey(email: string | undefined | null): string {
  return trimOrEmpty(email).toLowerCase();
}

function cleanFields(raw: unknown): CountyContactFields | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const address = trimOrEmpty(record.address);
  const phone = trimOrEmpty(record.phone);
  const email = trimOrEmpty(record.email);
  if (!address && !phone && !email) return null;
  if (address.length > MAX_FIELD_LENGTH || phone.length > MAX_FIELD_LENGTH || email.length > MAX_FIELD_LENGTH) {
    return null;
  }
  const fields: CountyContactFields = {};
  if (address) fields.address = address;
  if (phone) fields.phone = phone;
  if (email) fields.email = email;
  return fields;
}

/**
 * Keep only non-empty overrides for selected counties. Drops blank entries.
 * `raw` may be null/undefined (no overrides yet).
 */
export function normalizeCountyContacts(
  raw: unknown,
  countiesServed: string[] | null | undefined
): NormalizedCountyContacts {
  const allowed = new Set(
    (countiesServed ?? [])
      .map((slug) => slug.trim().toLowerCase())
      .filter((slug) => VALID_COUNTY_SLUGS.has(slug))
  );

  if (raw == null) {
    return { ok: true, contacts: {} };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "County contacts must be an object." };
  }

  const contacts: CountyContactsMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const slug = key.trim().toLowerCase();
    if (!allowed.has(slug)) continue;
    const fields = cleanFields(value);
    if (!fields) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        const address = trimOrEmpty(record.address);
        const phone = trimOrEmpty(record.phone);
        const email = trimOrEmpty(record.email);
        if (
          address.length > MAX_FIELD_LENGTH ||
          phone.length > MAX_FIELD_LENGTH ||
          email.length > MAX_FIELD_LENGTH
        ) {
          return {
            ok: false,
            error: `Each ${getCountyDisplayName(slug)} contact field must be ${MAX_FIELD_LENGTH} characters or fewer.`,
          };
        }
      }
      continue;
    }
    contacts[slug] = fields;
  }

  return { ok: true, contacts };
}

/** Resolve contact for one county: override fields fall back to primary. */
export function resolveCountyContact(
  countySlug: string,
  primary: CountyContactFields,
  overrides: CountyContactsMap | null | undefined
): CountyContactFields {
  const override = overrides?.[countySlug];
  const address = trimOrEmpty(override?.address) || trimOrEmpty(primary.address) || undefined;
  const phone = trimOrEmpty(override?.phone) || trimOrEmpty(primary.phone) || undefined;
  const email = trimOrEmpty(override?.email) || trimOrEmpty(primary.email) || undefined;
  return { address, phone, email };
}

/**
 * Build Contact-card blocks for a multi-county instructor.
 * Counties that share the same address + phone + email collapse into one labeled block.
 */
export function buildContactBlocksFromOverrides(
  countiesServed: string[],
  primary: CountyContactFields & { city?: string },
  overrides: CountyContactsMap | null | undefined
): VendorCountyContact[] {
  type Block = {
    key: string;
    address?: string;
    phone?: string;
    email?: string;
    city?: string;
    counties: Set<string>;
  };

  const blocks = new Map<string, Block>();
  const city = trimOrEmpty(primary.city) || undefined;

  for (const rawSlug of countiesServed) {
    const county = rawSlug.trim().toLowerCase();
    if (!county || !VALID_COUNTY_SLUGS.has(county)) continue;

    const resolved = resolveCountyContact(county, primary, overrides);
    if (!resolved.address && !resolved.phone && !resolved.email) continue;

    const key = [
      normalizeAddressKey(resolved.address),
      normalizePhoneKey(resolved.phone),
      normalizeEmailKey(resolved.email),
    ].join("||");

    const existing = blocks.get(key);
    if (existing) {
      existing.counties.add(county);
      existing.address ??= resolved.address;
      existing.phone ??= resolved.phone;
      existing.email ??= resolved.email;
      existing.city ??= city;
    } else {
      blocks.set(key, {
        key,
        address: resolved.address,
        phone: resolved.phone,
        email: resolved.email,
        city,
        counties: new Set([county]),
      });
    }
  }

  return [...blocks.values()].map((block) => ({
    counties: [...block.counties].sort(),
    address: block.address,
    phone: block.phone,
    email: block.email,
    city: block.city,
  }));
}
