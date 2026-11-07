import { CALIFORNIA_COUNTIES } from "@/data/counties";

/** One `carry_class_vendor_data` row, only the columns outreach reads. */
export interface OutreachSourceRow {
  id: string;
  county: string | null;
  needs_review: string | null;
  vendor_name: string | null;
  instructor_names: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  booking_capability: string | null;
  city: string | null;
  address: string | null;
  crawl_status: string | null;
  enrichment_confidence: string | null;
  confidence_notes: string | null;
  hidden_from_directory: boolean | null;
  accepts_bookings: boolean | null;
  stripe_connect_account_id: string | null;
}

export const OUTREACH_TAGS = [
  "website-no-booking",
  "website-has-booking",
  "no-website",
  "multi-county",
  "multi-location",
  "has-email",
  "no-email",
  "has-phone",
  "no-phone",
  "on-carryclass",
  "needs-review",
  "uscca",
] as const;

export type OutreachTag = (typeof OUTREACH_TAGS)[number];

/** Curated tags kept across sync when not re-derived from listing rows. */
export const PRESERVED_OUTREACH_TAGS = ["uscca"] as const satisfies readonly OutreachTag[];

export interface DedupedOutreachContact {
  dedupeKey: string;
  displayName: string;
  instructorNames: string[];
  emails: string[];
  phones: string[];
  website: string | null;
  addresses: string[];
  city: string | null;
  counties: string[];
  primaryCounty: string | null;
  bookingCapability: string | null;
  sourceListingIds: string[];
  tags: OutreachTag[];
}

const VALID_COUNTIES = new Set<string>(CALIFORNIA_COUNTIES);
const FAILED_CRAWL = new Set(["failed", "error", "blocked", "timeout"]);

/**
 * Hosts shared by many unrelated businesses. Grouping on the bare host would
 * merge every Facebook page into one contact, so the first path segment is kept.
 */
const SHARED_HOSTS = new Set([
  "facebook.com",
  "m.facebook.com",
  "instagram.com",
  "linktr.ee",
  "sites.google.com",
  "google.com",
  "yelp.com",
  "eventbrite.com",
  "linkedin.com",
  "youtube.com",
  "twitter.com",
  "x.com",
]);

function trim(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** County sheriff pages are not the instructor's site (sometimes the real host is in the path). */
function isGovernmentHost(host: string): boolean {
  return /\.gov$|\.ca\.us$|^countyof[a-z]+\.(com|org)$/.test(host);
}

/** The instructor's own site as `https://host/...`, or null when the value isn't one. */
export function cleanWebsite(website: string | null | undefined): string | null {
  const raw = trim(website);
  if (!raw) return null;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withProto);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!host.includes(".")) return null;
  if (isGovernmentHost(host.replace(/^www\./, ""))) {
    const embedded = url.pathname.match(/(www\.[a-z0-9-]+(?:\.[a-z0-9-]+)+)/i)?.[1];
    return embedded ? `https://${embedded.toLowerCase()}` : null;
  }
  return url.toString();
}

/** Website identity: host without www, or host + first path segment for shared hosts. */
export function websiteKey(website: string | null | undefined): string {
  const cleaned = cleanWebsite(website);
  if (!cleaned) return "";
  const url = new URL(cleaned);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (SHARED_HOSTS.has(host)) {
    const first = url.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    return first ? `${host}/${first}` : "";
  }
  return host;
}

/** Last 10 digits of a US number, or "" when it isn't one. */
export function phoneKey(phone: string | null | undefined): string {
  const digits = trim(phone).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.length === 10 ? digits : "";
}

export function nameKey(name: string | null | undefined): string {
  return trim(name).toLowerCase().replace(/\s+/g, " ");
}

export function countySlug(raw: string | null | undefined): string {
  const s = trim(raw).toLowerCase().replace(/\s+county$/, "").replace(/\s+/g, "-");
  return VALID_COUNTIES.has(s) ? s : "";
}

function formatPhone(ten: string): string {
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function addressKey(address: string): string {
  return address.toLowerCase().replace(/[.,#]/g, "").replace(/\s+/g, " ").trim();
}

function rowCompleteness(row: OutreachSourceRow): number {
  let score = 0;
  if (phoneKey(row.phone)) score += 4;
  if (trim(row.email)) score += 4;
  if (websiteKey(row.website_url)) score += 2;
  if (trim(row.address)) score += 1;
  if (trim(row.instructor_names)) score += 1;
  return score;
}

/** Usable website = parses to a real host. */
function hasWebsite(row: OutreachSourceRow): boolean {
  return websiteKey(row.website_url) !== "";
}

class UnionFind {
  private parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

/**
 * Collapse per-county listing rows into one contact per business. Rows that
 * share a website or a normalized name are the same business. Phone only links
 * rows that have no website: sheriff lists often pair a phone with the wrong
 * business, and linking on it chains unrelated instructors together.
 */
export function dedupeOutreachRows(rows: OutreachSourceRow[]): DedupedOutreachContact[] {
  const usable = rows.filter((r) => nameKey(r.vendor_name));
  const uf = new UnionFind(usable.length);
  const firstByKey = new Map<string, number>();

  const link = (kind: string, value: string, index: number) => {
    if (!value) return;
    const key = `${kind}:${value}`;
    const seen = firstByKey.get(key);
    if (seen === undefined) firstByKey.set(key, index);
    else uf.union(seen, index);
  };

  usable.forEach((row, i) => {
    const web = websiteKey(row.website_url);
    link("web", web, i);
    if (!web) link("tel", phoneKey(row.phone), i);
    link("name", nameKey(row.vendor_name), i);
  });

  const groups = new Map<number, OutreachSourceRow[]>();
  usable.forEach((row, i) => {
    const root = uf.find(i);
    const bucket = groups.get(root);
    if (bucket) bucket.push(row);
    else groups.set(root, [row]);
  });

  return [...groups.values()].map(buildContact).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function groupDedupeKey(group: OutreachSourceRow[]): string {
  const hosts = sortedUnique(group.map((r) => websiteKey(r.website_url)).filter(Boolean));
  if (hosts.length) return `web:${hosts[0]}`;
  const phones = sortedUnique(group.map((r) => phoneKey(r.phone)).filter(Boolean));
  if (phones.length) return `tel:${phones[0]}`;
  return `name:${sortedUnique(group.map((r) => nameKey(r.vendor_name)))[0]}`;
}

function buildContact(group: OutreachSourceRow[]): DedupedOutreachContact {
  const ranked = [...group].sort((a, b) => rowCompleteness(b) - rowCompleteness(a));
  const best = ranked[0];

  const emails = sortedUnique(
    group
      .flatMap((r) => trim(r.email).split(/[,;\s]+/))
      .map((e) => e.toLowerCase())
      .filter((e) => e.includes("@"))
  );
  const phones = sortedUnique(group.map((r) => phoneKey(r.phone)).filter(Boolean)).map(formatPhone);

  const addressByKey = new Map<string, string>();
  for (const r of group) {
    const a = trim(r.address);
    if (a && !addressByKey.has(addressKey(a))) addressByKey.set(addressKey(a), a);
  }
  const addresses = [...addressByKey.values()];

  const counties = sortedUnique(group.map((r) => countySlug(r.county)).filter(Boolean));
  const primaryCounty =
    ranked.map((r) => countySlug(r.county)).find(Boolean) ?? counties[0] ?? null;

  const instructorNames = sortedUnique(
    group
      .flatMap((r) => trim(r.instructor_names).split(/\s*[,;|]\s*|\s+and\s+/i))
      .map((n) => n.trim())
      .filter(Boolean)
  );

  const websiteRow = ranked.find(hasWebsite);
  const website = websiteRow ? cleanWebsite(websiteRow.website_url) : null;

  const capabilities = group.map((r) => trim(r.booking_capability).toLowerCase()).filter(Boolean);
  const bookingCapability = capabilities.includes("direct_booking")
    ? "direct_booking"
    : (["inquiry_only", "none", "unclear"].find((c) => capabilities.includes(c)) ?? null);

  const tags: OutreachTag[] = [];
  if (website) {
    tags.push(bookingCapability === "direct_booking" ? "website-has-booking" : "website-no-booking");
  } else {
    tags.push("no-website");
  }
  if (counties.length > 1) tags.push("multi-county");
  if (addresses.length > 1) tags.push("multi-location");
  tags.push(emails.length ? "has-email" : "no-email");
  tags.push(phones.length ? "has-phone" : "no-phone");
  if (group.some((r) => r.accepts_bookings === true || trim(r.stripe_connect_account_id))) {
    tags.push("on-carryclass");
  }
  if (
    group.some(
      (r) =>
        trim(r.needs_review) ||
        trim(r.enrichment_confidence).toLowerCase() === "low" ||
        FAILED_CRAWL.has(trim(r.crawl_status).toLowerCase())
    )
  ) {
    tags.push("needs-review");
  }
  if (group.some((r) => /\buscca\b/i.test(trim(r.confidence_notes)))) {
    tags.push("uscca");
  }

  const nameVotes = new Map<string, number>();
  for (const r of ranked) {
    const n = trim(r.vendor_name);
    nameVotes.set(n, (nameVotes.get(n) ?? 0) + 1);
  }
  const displayName = [...nameVotes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? trim(best.vendor_name);

  return {
    dedupeKey: groupDedupeKey(group),
    displayName,
    instructorNames,
    emails,
    phones,
    website,
    addresses,
    city: trim(best.city) || group.map((r) => trim(r.city)).find(Boolean) || null,
    counties,
    primaryCounty,
    bookingCapability,
    sourceListingIds: sortedUnique(group.map((r) => r.id)),
    tags,
  };
}

export function countTags(contacts: DedupedOutreachContact[]): Record<OutreachTag, number> {
  const counts = Object.fromEntries(OUTREACH_TAGS.map((t) => [t, 0])) as Record<OutreachTag, number>;
  for (const c of contacts) for (const t of c.tags) counts[t] += 1;
  return counts;
}

/** Keep curated tags (e.g. uscca) that sync would otherwise wipe. */
export function mergePreservedTags(
  derived: string[],
  existing: string[] | null | undefined
): string[] {
  const out = [...derived];
  for (const tag of PRESERVED_OUTREACH_TAGS) {
    if (existing?.includes(tag) && !out.includes(tag)) out.push(tag);
  }
  return out;
}
