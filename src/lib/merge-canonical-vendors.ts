import { createHash } from "node:crypto";
import type { Vendor, VendorCountyContact } from "@/types";
import { CALIFORNIA_COUNTIES, getCountyDisplayName } from "@/data/counties";

/**
 * One row per vendor + county in the source table produces duplicate
 * directory cards and a vendor profile per county. This module collapses those
 * rows back into a single canonical vendor at the app layer.
 *
 * Approach:
 *  1. Drop obviously junk rows (failed crawl, address-as-name).
 *  2. Group rows by website host → email → normalized name → row id fallback.
 *  3. Pick a "winner" row (scored) for display fields; aggregate counties +
 *     dedupe per-county contact blocks (address/phone) across the rest.
 */

const VALID_COUNTY_SLUGS = new Set<string>(CALIFORNIA_COUNTIES);

/**
 * Optional, hand-curated overrides for cases where the automatic grouping is
 * wrong. Default file (`@/data/vendor-merge-overrides`) is empty for v1.
 */
export interface VendorMergeOverrides {
  /** Force the listed rows into a single canonical group regardless of detected key. */
  forceMerge?: Array<{
    /** Optional human-friendly label used in the group key (and debug logs). */
    label?: string;
    /** Row ids (Vendor.id values prior to merge) to lock together. */
    rowIds: string[];
    /** Override canonical pricing when winner scoring picks the wrong row. */
    priceInitial?: number;
    priceRenewal?: number;
    /** Override canonical website (e.g. main brand URL vs regional storefront). */
    website?: string;
  }>;
  /** Pin these row ids to standalone groups (never merge them with anything else). */
  forceSeparate?: string[];
}

export interface MergeCanonicalVendorsOptions {
  overrides?: VendorMergeOverrides;
}

const ADDRESS_LIKE_NAME = /^\s*\d{1,6}\s+[A-Za-z][A-Za-z0-9.\- ]*/;
const FAILED_CRAWL_STATUSES = new Set(["failed", "error", "blocked", "timeout"]);
const SANE_PRICE_MIN = 50;
const SANE_PRICE_MAX = 2500;

function trimOrEmpty(value: string | undefined | null): string {
  return (value ?? "").trim();
}

/** Strip protocol/path/www, lowercase. Returns "" on invalid input. */
export function normalizeWebsiteHost(website: string | undefined | null): string {
  const raw = trimOrEmpty(website);
  if (!raw) return "";
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const host = new URL(withProto).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function normalizeEmail(email: string | undefined | null): string {
  return trimOrEmpty(email).toLowerCase();
}

export function normalizeVendorName(name: string | undefined | null): string {
  return trimOrEmpty(name)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeAddress(address: string | undefined | null): string {
  return trimOrEmpty(address)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,]/g, "");
}

function normalizePhone(phone: string | undefined | null): string {
  return trimOrEmpty(phone).replace(/[^0-9]/g, "");
}

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 10);
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

/** Heuristic: address-style names ("123 Main St…") that slipped past the crawl mapper. */
function nameLooksLikeAddress(name: string): boolean {
  return ADDRESS_LIKE_NAME.test(name);
}

function isJunkRow(vendor: Vendor): boolean {
  if (!vendor.name || !vendor.name.trim()) return true;
  if (nameLooksLikeAddress(vendor.name)) return true;
  const status = trimOrEmpty(vendor.crawlStatus).toLowerCase();
  if (status && FAILED_CRAWL_STATUSES.has(status)) return true;
  return false;
}

/**
 * Group key for a row, in priority order:
 *   1. `website:<host>`
 *   2. `email:<lowercase email>`
 *   3. `name:<normalized name>`
 *   4. `row:<row id>` (fallback so isolated rows do not collapse together)
 *
 * Overrides short-circuit the standard priority.
 */
export function getRowGroupKey(
  vendor: Vendor,
  overrides: VendorMergeOverrides = {}
): string {
  if (overrides.forceSeparate?.includes(vendor.id)) {
    return `force-separate:${vendor.id}`;
  }
  const forced = overrides.forceMerge?.find((group) =>
    group.rowIds.includes(vendor.id)
  );
  if (forced) {
    const label = forced.label ?? forced.rowIds.slice().sort().join("+");
    return `force-merge:${label}`;
  }

  const host = normalizeWebsiteHost(vendor.website);
  if (host) return `website:${host}`;

  const email = normalizeEmail(vendor.email);
  if (email) return `email:${email}`;

  const normalizedName = normalizeVendorName(vendor.name);
  if (normalizedName) return `name:${normalizedName}`;

  return `row:${vendor.id}`;
}

function priceInSaneRange(price: number | undefined): boolean {
  return typeof price === "number" && price >= SANE_PRICE_MIN && price <= SANE_PRICE_MAX;
}

function confidenceScore(confidence: Vendor["enrichmentConfidence"]): number {
  switch (confidence) {
    case "high":
      return 50;
    case "medium":
      return 30;
    case "low":
      return 10;
    default:
      return 0;
  }
}

/** Higher = better candidate for the canonical winner row. */
export function scoreCandidateRow(vendor: Vendor): number {
  let score = 0;
  if (priceInSaneRange(vendor.priceInitial)) score += 30;
  if (priceInSaneRange(vendor.priceRenewal)) score += 30;
  if (priceInSaneRange(vendor.priceAddGun)) score += 10;
  score += confidenceScore(vendor.enrichmentConfidence);
  if (trimOrEmpty(vendor.website)) score += 25;
  if (trimOrEmpty(vendor.description).length >= 40) score += 25;
  if (vendor.imageUrl || (vendor.photos && vendor.photos.length > 0)) score += 20;
  if (trimOrEmpty(vendor.address)) score += 10;
  if (trimOrEmpty(vendor.phone)) score += 5;
  if (trimOrEmpty(vendor.email)) score += 3;
  return score;
}

function updatedAtTime(vendor: Vendor): number {
  const raw = vendor.updatedAt;
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function pickWinner(group: Vendor[]): Vendor {
  return [...group].sort((a, b) => {
    const sa = scoreCandidateRow(a);
    const sb = scoreCandidateRow(b);
    if (sa !== sb) return sb - sa;
    const ua = updatedAtTime(a);
    const ub = updatedAtTime(b);
    if (ua !== ub) return ub - ua;
    return a.id.localeCompare(b.id);
  })[0];
}

function unionCountiesServed(group: Vendor[]): string[] {
  const seen = new Set<string>();
  for (const vendor of group) {
    const candidates = [
      ...(vendor.countiesServed ?? []),
      vendor.county,
    ];
    for (const slug of candidates) {
      const s = trimOrEmpty(slug).toLowerCase();
      if (!s) continue;
      if (!VALID_COUNTY_SLUGS.has(s)) continue;
      seen.add(s);
    }
  }
  return [...seen].sort();
}

function unionStringArray<T extends string>(group: Vendor[], pick: (v: Vendor) => T[] | undefined): T[] {
  const seen = new Set<T>();
  for (const vendor of group) {
    for (const value of pick(vendor) ?? []) seen.add(value);
  }
  return [...seen];
}

function buildCountyContacts(group: Vendor[]): VendorCountyContact[] {
  type Block = {
    addressKey: string;
    phoneKey: string;
    address?: string;
    phone?: string;
    city?: string;
    counties: Set<string>;
  };

  const blocks = new Map<string, Block>();

  for (const vendor of group) {
    const county = trimOrEmpty(vendor.county).toLowerCase();
    if (!county || !VALID_COUNTY_SLUGS.has(county)) continue;

    const address = trimOrEmpty(vendor.address) || undefined;
    const phone = trimOrEmpty(vendor.phone) || undefined;
    const city = trimOrEmpty(vendor.city) || undefined;

    if (!address && !phone) continue;

    const addressKey = normalizeAddress(address);
    const phoneKey = normalizePhone(phone);
    const blockKey = `${addressKey}||${phoneKey}`;

    const existing = blocks.get(blockKey);
    if (existing) {
      existing.counties.add(county);
      existing.address ??= address;
      existing.phone ??= phone;
      existing.city ??= city;
    } else {
      blocks.set(blockKey, {
        addressKey,
        phoneKey,
        address,
        phone,
        city,
        counties: new Set([county]),
      });
    }
  }

  return [...blocks.values()].map((block) => ({
    counties: [...block.counties].sort(),
    address: block.address,
    phone: block.phone,
    city: block.city,
  }));
}

/**
 * Stable canonical slug derived from the group key, not the winner row.
 * Winner-derived slugs flip whenever a tie-break flips, which breaks SEO and
 * saved links; this keeps the slug constant across deploys as long as the
 * vendor's website/email/name doesn't change.
 */
function canonicalSlug(name: string, groupKey: string): string {
  const base = slugifyName(name) || "vendor";
  return `${base}-${shortHash(groupKey)}`;
}

function canonicalId(groupKey: string): string {
  return `ccvd-${shortHash(`canonical:${groupKey}`)}`;
}

type ForceMergeConfig = NonNullable<VendorMergeOverrides["forceMerge"]>[number];

function findForceMergeForGroup(
  group: Vendor[],
  overrides: VendorMergeOverrides
): ForceMergeConfig | undefined {
  return overrides.forceMerge?.find((config) =>
    group.some((v) => config.rowIds.includes(v.id))
  );
}

function applyForceMergeFieldOverrides(
  vendor: Vendor,
  forceConfig: ForceMergeConfig | undefined
): Vendor {
  if (!forceConfig) return vendor;
  return {
    ...vendor,
    ...(forceConfig.priceInitial != null ? { priceInitial: forceConfig.priceInitial } : {}),
    ...(forceConfig.priceRenewal != null ? { priceRenewal: forceConfig.priceRenewal } : {}),
    ...(trimOrEmpty(forceConfig.website) ? { website: trimOrEmpty(forceConfig.website) } : {}),
  };
}

function mergeGroup(
  groupKey: string,
  group: Vendor[],
  overrides: VendorMergeOverrides = {}
): Vendor {
  const forceConfig = findForceMergeForGroup(group, overrides);

  if (group.length === 1) {
    const only = group[0];
    const contacts = buildCountyContacts(group);
    const countiesServed = unionCountiesServed(group);
    return applyForceMergeFieldOverrides(
      {
        ...only,
        id: canonicalId(groupKey),
        slug: canonicalSlug(only.name, groupKey),
        countiesServed: countiesServed.length > 0 ? countiesServed : only.countiesServed,
        countyContacts: contacts.length > 0 ? contacts : undefined,
      },
      forceConfig
    );
  }

  const winner = pickWinner(group);
  const countiesServed = unionCountiesServed(group);
  const contacts = buildCountyContacts(group);

  const classTypes = unionStringArray(group, (v) => v.classTypes);
  const formats = unionStringArray(group, (v) => v.formats);

  const featured = group.some((v) => v.featured === true);
  const acceptsBookings = group.some((v) => v.acceptsBookings === true);
  const stripeConnectAccountId =
    winner.stripeConnectAccountId ??
    group.find((v) => trimOrEmpty(v.stripeConnectAccountId))?.stripeConnectAccountId;

  return applyForceMergeFieldOverrides(
    {
      ...winner,
      id: canonicalId(groupKey),
      slug: canonicalSlug(winner.name, groupKey),
      countiesServed: countiesServed.length > 0 ? countiesServed : winner.countiesServed,
      classTypes: classTypes.length > 0
        ? (classTypes as Vendor["classTypes"])
        : winner.classTypes,
      formats: formats.length > 0
        ? (formats as Vendor["formats"])
        : winner.formats,
      featured,
      acceptsBookings,
      stripeConnectAccountId,
      countyContacts: contacts.length > 0 ? contacts : undefined,
    },
    forceConfig
  );
}

/**
 * Collapse per-county source rows into a single canonical vendor per business.
 *
 * Input: one Vendor per source row (as produced by `vendors-db.mapRow`).
 * Output: one Vendor per canonical group, with:
 *   - canonical, stable `id` and `slug`
 *   - `countiesServed` = union of all rows' counties (CA slugs only)
 *   - `countyContacts` = deduped per-county address/phone blocks
 *   - other display fields from the highest-scoring "winner" row
 */
export function mergeCanonicalVendors(
  vendors: Vendor[],
  options: MergeCanonicalVendorsOptions = {}
): Vendor[] {
  const overrides = options.overrides ?? {};
  const cleaned = vendors.filter((v) => !isJunkRow(v));

  const groups = new Map<string, Vendor[]>();
  for (const vendor of cleaned) {
    const key = getRowGroupKey(vendor, overrides);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(vendor);
    } else {
      groups.set(key, [vendor]);
    }
  }

  const merged: Vendor[] = [];
  for (const [key, group] of groups.entries()) {
    merged.push(mergeGroup(key, group, overrides));
  }

  merged.sort((a, b) => a.name.localeCompare(b.name));
  return merged;
}

/**
 * Human label for a deduped contact block, using the singular "County" word per
 * the design spec (e.g. "San Diego & Orange County", "San Diego, Orange & LA County").
 * Returns "" when the block has no counties (shouldn't happen post-merge).
 */
export function formatCountyContactLabel(counties: string[]): string {
  const names = counties.map((slug) => getCountyDisplayName(slug)).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} County`;
  if (names.length === 2) return `${names[0]} & ${names[1]} County`;
  const head = names.slice(0, -1).join(", ");
  return `${head} & ${names[names.length - 1]} County`;
}

/** Sort contact blocks for stable rendering: alphabetic by first county display name. */
export function sortVendorCountyContacts(
  contacts: VendorCountyContact[]
): VendorCountyContact[] {
  return [...contacts].sort((a, b) => {
    const al = getCountyDisplayName(a.counties[0] ?? "");
    const bl = getCountyDisplayName(b.counties[0] ?? "");
    return al.localeCompare(bl);
  });
}
