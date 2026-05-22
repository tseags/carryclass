import { createHash } from "node:crypto";
import { cache } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Vendor, VendorFilters } from "@/types";
import { CALIFORNIA_COUNTIES, COUNTY_DISPLAY_NAMES } from "@/data/counties";
import { filterVendors } from "@/lib/filter-vendors";
import { applyListingSort } from "@/lib/vendor-listing-sort";
import { prisma } from "@/lib/db";
import { supabaseForVendorReads } from "@/lib/supabase";

const VENDOR_DB_TABLES = new Set([
  "carry_class_vendor_data",
  "enriched_vendor_county_listings",
]);

function supabaseProjectRef(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function databaseProjectRef(): string | null {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname;
    const direct = host.match(/^db\.([^.]+)\.supabase\.co$/);
    if (direct) return direct[1];
    const pooler = raw.match(/postgres\.([^.]+):/);
    return pooler?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Use Postgres when Supabase REST URL/key do not match DATABASE_URL (e.g. after project migration). */
function shouldFetchVendorsViaDatabase(): boolean {
  if (process.env.VENDORS_FETCH_VIA_DATABASE === "1") return true;
  const dbRef = databaseProjectRef();
  const sbRef = supabaseProjectRef();
  if (!dbRef) return false;
  if (!sbRef) return true;
  return sbRef !== dbRef;
}

function vendorDbTable(): string {
  const table = vendorTable();
  return VENDOR_DB_TABLES.has(table) ? table : "carry_class_vendor_data";
}

function sb() {
  return supabaseForVendorReads();
}

/** Supabase table name (spaces allowed). Override via env. */
function vendorTable(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_VENDORS_TABLE?.trim() || "CarryClass Vendor Data"
  );
}

function logSupabaseSelectStart(label: string, tableName: string, filters: unknown): void {
  console.log("🔍 SUPABASE QUERY START");
  console.log("Label:", label);
  console.log("Table name:", tableName);
  console.log("Query filters:", filters);
}

function logSupabaseSelectResult(
  label: string,
  result: {
    error: PostgrestError | null;
    count?: number | null;
    data: unknown[] | null | undefined;
  }
): void {
  const { data, error, count } = result;
  console.log("📦 SUPABASE QUERY RESULT:", label);
  console.log("Error:", error);
  console.log("Count:", count ?? "(not requested)");
  console.log("Data length:", data?.length);
  console.log("First row:", data?.[0]);
  console.log("All column names:", data?.[0] ? Object.keys(data[0] as object) : "no data");

  if (error) {
    console.error("❌ SUPABASE ERROR DETAILS:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }
}

/** When table name doesn’t include “CarryClass”, set NEXT_PUBLIC_SUPABASE_VENDORS_SHAPE=carryclass */
function isCarryClassVendorShape(): boolean {
  const shape = process.env.NEXT_PUBLIC_SUPABASE_VENDORS_SHAPE?.trim().toLowerCase();
  if (shape === "carryclass" || shape === "carry-class") return true;
  if (shape === "legacy" || shape === "prisma" || shape === "vendor") return false;
  return /carryclass/i.test(vendorTable());
}

const DISPLAY_NAME_TO_SLUG: Record<string, string> = {};
for (const [slug, display] of Object.entries(COUNTY_DISPLAY_NAMES)) {
  DISPLAY_NAME_TO_SLUG[display.toLowerCase()] = slug;
}

let loggedCarryClassSample = false;

function logCarryClassSampleOnce(rows: Record<string, unknown>[]): void {
  if (process.env.NODE_ENV !== "development" || loggedCarryClassSample || rows.length === 0) return;
  loggedCarryClassSample = true;
  const first = rows[0];
  console.log("[vendors-db] FIRST ROW KEYS:", Object.keys(first));
  console.log("[vendors-db] FIRST ROW (raw JSON):", JSON.stringify(first, null, 2));
}

function pick(row: Record<string, unknown>, camel: string, snake: string): unknown {
  const v = row[camel];
  if (v !== undefined && v !== null) return v;
  return row[snake];
}

function firstNonEmptyString(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function optionalString(row: Record<string, unknown>, keys: string[]): string | undefined {
  const s = firstNonEmptyString(row, keys);
  return s || undefined;
}

/** When spreadsheet/API column labels don’t match our known keys. */
function inferVendorNameFromRow(row: Record<string, unknown>): string {
  const keys = Object.keys(row);
  const ranked = keys.filter((k) =>
    /vendor[\s_]*name|business[\s_]*name|company[\s_]*name|^name$/i.test(k)
  );
  ranked.sort((a, b) => a.length - b.length);
  for (const k of ranked) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return "";
}

/** Map DB county text (display name, slug, multiples) to canonical slugs. */
function normalizeCountyToSlug(raw: string): string {
  let s = raw.trim().toLowerCase();
  if (!s) return "";
  if ((CALIFORNIA_COUNTIES as readonly string[]).includes(s)) return s;
  s = s.replace(/\s+county\s*$/i, "").trim().toLowerCase();
  const mapped = DISPLAY_NAME_TO_SLUG[s];
  if (mapped) return mapped;
  const hyphenated = s.replace(/\s+/g, "-");
  if ((CALIFORNIA_COUNTIES as readonly string[]).includes(hyphenated)) return hyphenated;
  return hyphenated;
}

function countiesFromDbCountyField(raw: unknown): string[] {
  if (raw == null) return [];
  const s = String(raw).trim();
  if (!s) return [];
  const parts = s.split(/[,;/|]/).map((p) => p.trim()).filter(Boolean);
  const slugs = parts.map((p) => normalizeCountyToSlug(p)).filter(Boolean);
  return [...new Set(slugs)];
}

function slugifySegment(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function stableFingerprint(row: Record<string, unknown>, name: string, countySlugs: string[]): string {
  const email = optionalString(row, ["email", "Email", "contact_email"]) ?? "";
  const phone = optionalString(row, ["phone", "telephone", "phone_number", "Phone"]) ?? "";
  const payload = JSON.stringify({
    name,
    counties: countySlugs.slice().sort(),
    email: email.toLowerCase(),
    phone,
  });
  return createHash("sha256").update(payload).digest("hex");
}

function parseStringArray(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    } catch {
      /* comma-separated */
    }
    return t.split(/[,;/]/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function parseClassTypes(row: Record<string, unknown>): Vendor["classTypes"] {
  const buckets = [
    parseStringArray(pick(row, "classTypes", "class_types")),
    parseStringArray(row["class_type"]),
    parseStringArray(row["Class Types"]),
  ];
  const fromCols = buckets.find((b) => b.length > 0) ?? [];
  const allowed = fromCols.filter((x): x is Vendor["classTypes"][number] =>
    x === "initial" || x === "renewal" || x === "both"
  );
  if (allowed.length) return allowed;
  return ["initial", "renewal", "both"];
}

function parseFormats(row: Record<string, unknown>): Vendor["formats"] {
  const buckets = [
    parseStringArray(pick(row, "formats", "formats")),
    parseStringArray(row["format"]),
    parseStringArray(row["Format"]),
  ];
  const fromCols = buckets.find((b) => b.length > 0) ?? [];
  const allowed = fromCols.filter((x): x is Vendor["formats"][number] =>
    x === "in-person" || x === "online" || x === "hybrid"
  );
  if (allowed.length) return allowed;
  return ["in-person", "online", "hybrid"];
}

/** Parses spreadsheet/currency strings ("$199", "1,250.00", "199 USD") into a finite number. */
function parseMoneyLikeNumber(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  const cleaned = t.replace(/[^0-9.-]/g, "");
  if (!cleaned || /^[.-]+$/.test(cleaned)) return undefined;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function numFromRow(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v === undefined || v === null) continue;
    const n = parseMoneyLikeNumber(v);
    if (n !== undefined) return n;
  }
  return undefined;
}

/** Last resort when headers don’t match our explicit key list (e.g. “16hr Initial — Price”). */
function numFromFirstColumnMatching(row: Record<string, unknown>, keyPattern: RegExp): number | undefined {
  for (const [k, v] of Object.entries(row)) {
    if (!keyPattern.test(k)) continue;
    const n = parseMoneyLikeNumber(v);
    if (n !== undefined) return n;
  }
  return undefined;
}

function boolFromRow(row: Record<string, unknown>, keys: string[]): boolean {
  for (const k of keys) {
    const v = row[k];
    if (v === true || v === "true") return true;
  }
  return false;
}

const VENDOR_DESCRIPTION_COLUMN_KEYS = [
  "vendor_description",
  "Vendor Description",
  "vendor description",
  "vendorDescription",
] as const;

const INSTRUCTOR_NAME_COLUMN_KEYS = [
  "instructor_names",
  "instructor_name",
  "Instructor Names",
  "instructors",
] as const;

function listingCardTextFromVendorFields(
  vendorDescription: string | undefined,
  instructorLine: string | undefined
): string | undefined {
  if (vendorDescription) return vendorDescription;
  if (instructorLine) return `Instructors: ${instructorLine}`;
  return undefined;
}

function mapLegacyVendorRow(row: Record<string, unknown>): Vendor | null {
  const id = pick(row, "id", "id");
  const slug = pick(row, "slug", "slug");
  const name = pick(row, "name", "name");
  if (typeof id !== "string" || typeof slug !== "string" || typeof name !== "string") {
    return null;
  }

  const typeRaw = pick(row, "type", "type");
  const type = typeRaw === "company" || typeRaw === "instructor" ? typeRaw : "instructor";

  const countiesServed = pick(row, "countiesServed", "counties_served");
  const classTypes = pick(row, "classTypes", "class_types");
  const formats = pick(row, "formats", "formats");

  const bool = (v: unknown): boolean => v === true || v === "true";

  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const createdRaw = pick(row, "createdAt", "created_at");
  let createdAt: string;
  if (typeof createdRaw === "string") {
    createdAt = createdRaw.slice(0, 10);
  } else if (createdRaw instanceof Date) {
    createdAt = createdRaw.toISOString().slice(0, 10);
  } else {
    createdAt = new Date().toISOString().slice(0, 10);
  }

  const photosRaw = pick(row, "photos", "photos");
  const photosList = strArr(photosRaw);

  const stripeRaw = pick(row, "stripeConnectAccountId", "stripe_connect_account_id");

  const vendorDesc = optionalString(row, [...VENDOR_DESCRIPTION_COLUMN_KEYS]);
  const instructorLine = optionalString(row, [...INSTRUCTOR_NAME_COLUMN_KEYS]);
  const listingCardText = listingCardTextFromVendorFields(vendorDesc, instructorLine);

  return {
    id,
    slug,
    name,
    type,
    city: String(pick(row, "city", "city") ?? ""),
    county: String(pick(row, "county", "county") ?? "").toLowerCase(),
    state: String(pick(row, "state", "state") ?? "CA"),
    countiesServed: strArr(countiesServed).map((c) => c.toLowerCase()),
    classTypes: strArr(classTypes) as Vendor["classTypes"],
    formats: strArr(formats) as Vendor["formats"],
    priceMin: numFromRow(row, [
      "priceMin",
      "price_min",
      "price",
      "Price",
      "cost",
      "Cost",
      "low_price",
      "min_price",
    ]),
    priceMax: numFromRow(row, ["priceMax", "price_max", "max_price", "high_price"]),
    priceInitial: numFromRow(row, [
      "priceInitial",
      "price_initial",
      "price_16hr_full",
      "price16hr_full",
      "initial_price",
      "initial_class_price",
    ]),
    priceRenewal: numFromRow(row, [
      "priceRenewal",
      "price_renewal",
      "price_8hr_renewal",
      "price8hr_renewal",
      "renewal_price",
      "renewal_class_price",
    ]),
    priceAddGun: numFromRow(row, [
      "priceAddGun",
      "price_add_gun",
      "price_add_a_gun",
      "add_gun_price",
    ]),
    address: (pick(row, "address", "address") as string | null) ?? undefined,
    discountInfo: (pick(row, "discountInfo", "discount_info") as string | null) ?? undefined,
    website: optionalString(row, ["website", "website_url", "url", "URL", "web_site", "Website"]),
    phone: (pick(row, "phone", "phone") as string | null) ?? undefined,
    email: (pick(row, "email", "email") as string | null) ?? undefined,
    description: optionalString(row, [
      ...VENDOR_DESCRIPTION_COLUMN_KEYS,
      "description",
      "notes",
      "bio",
      "Details",
    ]),
    listingCardText,
    imageUrl: (pick(row, "imageUrl", "image_url") as string | null) ?? undefined,
    photos: photosList.length ? photosList : undefined,
    googleReviewsUrl: (pick(row, "googleReviewsUrl", "google_reviews_url") as string | null) ?? undefined,
    googlePlaceId: (pick(row, "googlePlaceId", "google_place_id") as string | null) ?? undefined,
    featured: bool(pick(row, "featured", "featured")),
    acceptsBookings: bool(pick(row, "acceptsBookings", "accepts_bookings")),
    stripeConnectAccountId:
      typeof stripeRaw === "string" && stripeRaw.trim() ? stripeRaw.trim() : undefined,
    createdAt,
  };
}

function mapCarryClassVendorRow(row: Record<string, unknown>): Vendor | null {
  const name =
    firstNonEmptyString(row, [
      "vendor_name",
      "Vendor Name",
      "vendor name",
      "Vendor_Name",
      "NAME",
      "name",
      "business_name",
      "company_name",
      "org_name",
      "training_provider",
      "school_name",
    ]) || inferVendorNameFromRow(row);
  if (!name) return null;

  const countiesFromMulti = countiesFromDbCountyField(
    pick(row, "countiesServed", "counties_served") ?? row["county"] ?? row["County"]
  );
  const countiesServed =
    countiesFromMulti.length > 0
      ? countiesFromMulti
      : [normalizeCountyToSlug(String(pick(row, "county", "county") ?? row["County"] ?? ""))].filter(
          Boolean
        );

  const primaryCounty = countiesServed[0] ?? "";

  const rawPk = row["id"] ?? row["uuid"] ?? row["vendor_id"] ?? row["Vendor ID"];
  const explicitId =
    rawPk !== undefined && rawPk !== null && String(rawPk).trim() !== ""
      ? String(rawPk).trim()
      : undefined;
  const fingerprint = stableFingerprint(row, name, countiesServed);
  const id = explicitId ?? `ccvd-${fingerprint.slice(0, 24)}`;

  const slugBase = slugifySegment(`${name}-${primaryCounty || "ca"}`);
  const slugSuffix = fingerprint.slice(0, 10);
  const slug = slugBase ? `${slugBase}-${slugSuffix}` : `vendor-${slugSuffix}`;

  const instructorLine = optionalString(row, [...INSTRUCTOR_NAME_COLUMN_KEYS]);
  const vendorDesc = optionalString(row, [...VENDOR_DESCRIPTION_COLUMN_KEYS]);
  const descExtra = optionalString(row, ["description", "notes", "bio", "Details"]);
  const listingCardText = listingCardTextFromVendorFields(vendorDesc, instructorLine);

  const bodyForProfile = vendorDesc || descExtra;
  const description =
    [bodyForProfile, instructorLine ? `Instructors: ${instructorLine}` : ""].filter(Boolean).join("\n\n") ||
    undefined;

  const typeRaw = pick(row, "type", "type");
  const type = typeRaw === "company" || typeRaw === "instructor" ? typeRaw : "instructor";

  const createdRaw =
    pick(row, "createdAt", "created_at") ?? row["created"] ?? row["import_date"];
  let createdAt: string;
  if (typeof createdRaw === "string") {
    createdAt = createdRaw.slice(0, 10);
  } else if (createdRaw instanceof Date) {
    createdAt = createdRaw.toISOString().slice(0, 10);
  } else {
    createdAt = new Date().toISOString().slice(0, 10);
  }

  const photosRaw = pick(row, "photos", "photos") ?? row["photo_urls"];
  const photosList = parseStringArray(photosRaw);

  return {
    id,
    slug,
    name,
    type,
    city: firstNonEmptyString(row, ["city", "City", "location", "Location"]),
    county: primaryCounty,
    state: firstNonEmptyString(row, ["state", "State"]) || "CA",
    countiesServed: countiesServed.length ? countiesServed : primaryCounty ? [primaryCounty] : [],
    classTypes: parseClassTypes(row),
    formats: parseFormats(row),
    priceMin: numFromRow(row, [
      "priceMin",
      "price_min",
      "price",
      "Price",
      "cost",
      "Cost",
      "low_price",
      "min_price",
      "course_price",
      "class_price",
    ]),
    priceMax: numFromRow(row, ["priceMax", "price_max", "max_price", "high_price"]),
    priceInitial:
      numFromRow(row, [
        "priceInitial",
        "price_initial",
        "price_16hr_full",
        "price16hr_full",
        "initial_price",
        "initial_class_price",
        "initial_class_cost",
        "Initial Price",
        "initial price",
        "16_hour_initial",
        "16_hour_initial_price",
        "16 Hour Initial Price",
        "16hr Initial Price",
        "16-Hour Initial Price",
        "Initial Class Price",
        "Initial Class Price (16hr)",
        "Initial Class Price (16 hr)",
        "CCW Initial Price",
        "New Applicant Price",
      ]) ??
      numFromFirstColumnMatching(
        row,
        /initial.*(price|cost|fee|rate)|(price|cost|fee|rate).*initial|16\s*-?\s*h(?:our|r).*initial|initial.*16\s*-?\s*h(?:our|r)/i
      ),
    priceRenewal:
      numFromRow(row, [
        "priceRenewal",
        "price_renewal",
        "price_8hr_renewal",
        "price8hr_renewal",
        "renewal_price",
        "renewal_class_price",
        "Renewal Price",
        "renewal price",
        "8_hour_renewal",
        "8_hour_renewal_price",
        "8 Hour Renewal Price",
        "8hr Renewal Price",
        "8-Hour Renewal Price",
        "Renewal Class Price",
        "Renewal Class Price (8hr)",
        "Renewal Class Price (8 hr)",
      ]) ??
      numFromFirstColumnMatching(
        row,
        /renewal.*(price|cost|fee|rate)|(price|cost|fee|rate).*renewal|8\s*-?\s*h(?:our|r).*renewal|renewal.*8\s*-?\s*h(?:our|r)/i
      ),
    priceAddGun:
      numFromRow(row, [
        "priceAddGun",
        "price_add_gun",
        "price_add_a_gun",
        "add_gun_price",
        "Add Gun Price",
        "add gun price",
        "Additional Gun Price",
        "extra_firearm_price",
      ]) ?? numFromFirstColumnMatching(row, /add[\s_-]*gun.*(price|cost|fee)|(price|cost|fee).*add[\s_-]*gun/i),
    address: optionalString(row, ["address", "Address", "street", "full_address"]),
    discountInfo: optionalString(row, ["discountInfo", "discount_info", "discounts"]),
    website: optionalString(row, ["website", "website_url", "url", "URL", "web_site", "Website"]),
    phone: optionalString(row, ["phone", "Phone", "telephone", "phone_number"]),
    email: optionalString(row, ["email", "Email", "contact_email"]),
    description,
    listingCardText,
    imageUrl: optionalString(row, ["imageUrl", "image_url", "photo", "logo_url", "logo_path"]),
    photos: photosList.length ? photosList : undefined,
    googleReviewsUrl: optionalString(row, ["googleReviewsUrl", "google_reviews_url"]),
    googlePlaceId: optionalString(row, ["googlePlaceId", "google_place_id"]),
    featured: boolFromRow(row, ["featured", "Featured"]),
    acceptsBookings: boolFromRow(row, ["acceptsBookings", "accepts_bookings"]),
    stripeConnectAccountId: optionalString(row, ["stripeConnectAccountId", "stripe_connect_account_id"]),
    createdAt,
  };
}

function mapRow(row: Record<string, unknown>): Vendor | null {
  return isCarryClassVendorShape() ? mapCarryClassVendorRow(row) : mapLegacyVendorRow(row);
}

async function fetchRawVendorRowsViaDatabase(): Promise<Record<string, unknown>[]> {
  const table = vendorDbTable();
  console.log("[vendors-db] fetchRawVendorRowsViaDatabase", { table, dbRef: databaseProjectRef() });
  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM public."${table.replace(/"/g, "")}" LIMIT 12000`
    );
    console.log("[vendors-db] fetchRawVendorRowsViaDatabase", { rawRowCount: rows.length });
    if (isCarryClassVendorShape()) logCarryClassSampleOnce(rows);
    return rows;
  } catch (e) {
    console.error("[vendors-db] fetchRawVendorRowsViaDatabase failed", e);
    return [];
  }
}

async function fetchRawVendorRows(): Promise<Record<string, unknown>[]> {
  if (shouldFetchVendorsViaDatabase()) {
    return fetchRawVendorRowsViaDatabase();
  }

  const table = vendorTable();
  logSupabaseSelectStart("fetchRawVendorRows", table, "(none — full table select)");
  const { data, error, count } = await sb()
    .from(table)
    .select("*", { count: "exact" })
    .limit(12_000);

  logSupabaseSelectResult("fetchRawVendorRows", { data: data ?? [], error, count });

  if (error) {
    console.error("[vendors-db] fetchRawVendorRows", {
      table,
      carryClassShape: isCarryClassVendorShape(),
      ...error,
    });
    if (databaseProjectRef()) {
      console.warn("[vendors-db] Supabase REST failed — falling back to DATABASE_URL");
      return fetchRawVendorRowsViaDatabase();
    }
    return [];
  }

  const rows = (data ?? []) as Record<string, unknown>[];

  if (process.env.NODE_ENV === "development") {
    if (/^vendor$/i.test(table)) {
      console.warn(
        '[vendors-db] NEXT_PUBLIC_SUPABASE_VENDORS_TABLE is "Vendor" — if rows live in "CarryClass Vendor Data", set that env value (and NEXT_PUBLIC_SUPABASE_VENDORS_SHAPE=carryclass if the name has no "CarryClass").'
      );
    }
    console.log("[vendors-db] fetchRawVendorRows", {
      table,
      carryClassShape: isCarryClassVendorShape(),
      rawRowCount: rows.length,
      auth: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? "service_role" : "anon",
    });
  }

  if (rows.length === 0) {
    console.warn(
      "[vendors-db] 0 rows from Supabase — confirm table name matches Postgres/PostgREST, data exists, and either allow anon SELECT via RLS or set SUPABASE_SERVICE_ROLE_KEY for server reads."
    );
  }

  if (isCarryClassVendorShape()) logCarryClassSampleOnce(rows);
  return rows;
}

/** One bulk fetch per request for CarryClass-shaped tables (no native slug / mixed columns). */
const getCarryClassVendorsCached = cache(async (): Promise<Vendor[]> => {
  const rows = await fetchRawVendorRows();
  const mapped = rows.map(mapRow).filter((v): v is Vendor => v != null);
  console.log("📋 getCarryClassVendorsCached:", {
    rawRows: rows.length,
    mappedVendors: mapped.length,
    droppedByMapper: rows.length - mapped.length,
  });
  if (
    process.env.NODE_ENV === "development" &&
    rows.length > 0 &&
    mapped.length === 0
  ) {
    console.warn(
      "[vendors-db] Every row was dropped by the mapper (missing display name?). First row keys:",
      Object.keys(rows[0] ?? {})
    );
  }
  if (process.env.NODE_ENV === "development" && mapped.length > 0) {
    console.log("[vendors-db] mapped vendor count:", mapped.length);
  }
  return mapped;
});

function sortByName(vendors: Vendor[]): Vendor[] {
  return [...vendors].sort((a, b) => a.name.localeCompare(b.name));
}

function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST chain type from createClient()
function applyVendorFiltersToSupabaseQuery(query: any, filters: VendorFilters): any {
  let q = query;

  if (filters.county) {
    q = q.contains("countiesServed", [filters.county.toLowerCase()]);
  }

  if (filters.city) {
    q = q.ilike("city", filters.city);
  }

  if (filters.classType) {
    if (filters.classType === "both") {
      q = q.contains("classTypes", ["both"]);
    } else {
      q = q.or(`classTypes.cs.{${filters.classType}},classTypes.cs.{both}`);
    }
  }

  if (filters.format) {
    q = q.contains("formats", [filters.format]);
  }

  if (filters.category) {
    switch (filters.category) {
      case "initial":
        q = q.or("classTypes.cs.{initial},classTypes.cs.{both}");
        break;
      case "renewal":
        q = q.or("classTypes.cs.{renewal},classTypes.cs.{both}");
        break;
      case "add-gun":
        q = q.not("priceAddGun", "is", null);
        break;
      case "online":
        q = q.contains("formats", ["online"]);
        break;
    }
  }

  if (filters.search?.trim()) {
    const raw = filters.search.trim();
    const pat = `%${escapeIlikePattern(raw)}%`;
    q = q.or(
      `name.ilike.${pat},city.ilike.${pat},description.ilike.${pat},vendor_description.ilike.${pat}`
    );
  }

  return q;
}

export async function queryVendorsForListing(
  filters: VendorFilters,
  sort: string | undefined
): Promise<Vendor[]> {
  if (!isSupabaseConfigured()) {
    console.error("[vendors-db] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return [];
  }

  if (isCarryClassVendorShape()) {
    logSupabaseSelectStart(
      "queryVendorsForListing (CarryClass — in-memory filter after bulk fetch)",
      vendorTable(),
      filters
    );
    const mapped = await getCarryClassVendorsCached();
    const refined = filterVendors(mapped, filters);
    console.log("📦 queryVendorsForListing CarryClass path:", {
      mappedCount: mapped.length,
      afterFilterCount: refined.length,
      sort,
    });
    return applyListingSort(refined, sort);
  }

  logSupabaseSelectStart("queryVendorsForListing (legacy PostgREST filters)", vendorTable(), filters);
  let query = sb().from(vendorTable()).select("*", { count: "exact" });
  query = applyVendorFiltersToSupabaseQuery(query, filters);

  const { data, error, count } = await query.limit(10_000);

  logSupabaseSelectResult("queryVendorsForListing (legacy)", {
    data: data ?? [],
    error,
    count,
  });

  if (error) {
    console.error("[vendors-db] queryVendorsForListing", error);
    return [];
  }

  const mapped = (data ?? [])
    .map((row) => mapRow(row as Record<string, unknown>))
    .filter((v): v is Vendor => v != null);

  const refined = filterVendors(mapped, filters);
  return applyListingSort(refined, sort);
}

export async function getCitiesForCountyFilter(countySlug?: string): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    console.error("[vendors-db] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return [];
  }

  if (isCarryClassVendorShape()) {
    logSupabaseSelectStart(
      "getCitiesForCountyFilter (CarryClass — derived from cache)",
      vendorTable(),
      { countySlug }
    );
    const vendors = await getCarryClassVendorsCached();
    const slug = countySlug?.toLowerCase();
    const cities = vendors
      .filter((v) => !slug || v.countiesServed.some((c) => c.toLowerCase() === slug))
      .map((v) => v.city)
      .filter(Boolean);
    console.log("📦 getCitiesForCountyFilter CarryClass:", {
      vendorPool: vendors.length,
      cityCount: [...new Set(cities)].length,
    });
    return [...new Set(cities)].sort((a, b) => a.localeCompare(b));
  }

  logSupabaseSelectStart("getCitiesForCountyFilter (legacy)", vendorTable(), { countySlug });
  const { data, error, count } = await sb()
    .from(vendorTable())
    .select("city,countiesServed", { count: "exact" })
    .limit(10_000);

  logSupabaseSelectResult("getCitiesForCountyFilter (legacy)", { data: data ?? [], error, count });

  if (error) {
    console.error("[vendors-db] getCitiesForCountyFilter", error);
    return [];
  }

  const slug = countySlug?.toLowerCase();
  const cities = (data ?? [])
    .filter((row) => {
      if (!slug) return true;
      const rec = row as Record<string, unknown>;
      const served =
        (rec.countiesServed as string[] | null | undefined) ??
        (rec.counties_served as string[] | null | undefined) ??
        [];
      return served.some((c) => c.toLowerCase() === slug);
    })
    .map((row) => String((row as Record<string, unknown>).city ?? ""))
    .filter(Boolean);

  return [...new Set(cities)].sort((a, b) => a.localeCompare(b));
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  if (!isSupabaseConfigured()) {
    console.error("[vendors-db] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return null;
  }

  if (isCarryClassVendorShape()) {
    logSupabaseSelectStart("getVendorBySlug (CarryClass — scan cached vendors)", vendorTable(), {
      slug,
    });
    const vendors = await getCarryClassVendorsCached();
    const hit = vendors.find((v) => v.slug === slug) ?? null;
    console.log("📦 getVendorBySlug CarryClass:", { pool: vendors.length, hit: Boolean(hit) });
    return hit;
  }

  logSupabaseSelectStart("getVendorBySlug (legacy)", vendorTable(), { slug });
  const { data, error } = await sb().from(vendorTable()).select("*").eq("slug", slug).maybeSingle();

  logSupabaseSelectResult("getVendorBySlug (legacy)", { data: data ? [data] : [], error });

  if (error) {
    console.error("[vendors-db] getVendorBySlug", error);
    return null;
  }

  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getAllVendors(): Promise<Vendor[]> {
  if (!isSupabaseConfigured()) {
    console.error("[vendors-db] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return [];
  }

  if (isCarryClassVendorShape()) {
    logSupabaseSelectStart("getAllVendors (CarryClass — cache)", vendorTable(), "(none)");
    const list = sortByName(await getCarryClassVendorsCached());
    console.log("📦 getAllVendors CarryClass:", { count: list.length });
    return list;
  }

  logSupabaseSelectStart("getAllVendors (legacy)", vendorTable(), "(none)");
  const { data, error, count } = await sb()
    .from(vendorTable())
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .limit(10_000);

  logSupabaseSelectResult("getAllVendors (legacy)", { data: data ?? [], error, count });

  if (error) {
    console.error("[vendors-db] getAllVendors", error);
    return [];
  }

  return sortByName(
    (data ?? [])
      .map((row) => mapRow(row as Record<string, unknown>))
      .filter((v): v is Vendor => v != null)
  );
}

export async function getVendorCountsByCounty(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  if (!isSupabaseConfigured()) {
    console.error("[vendors-db] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return counts;
  }

  if (isCarryClassVendorShape()) {
    logSupabaseSelectStart("getVendorCountsByCounty (CarryClass — cache)", vendorTable(), "(none)");
    const vendors = await getCarryClassVendorsCached();
    for (const v of vendors) {
      for (const raw of v.countiesServed.length ? v.countiesServed : [v.county]) {
        const s = raw.toLowerCase();
        if (!s) continue;
        counts[s] = (counts[s] ?? 0) + 1;
      }
    }
    console.log("📦 getVendorCountsByCounty CarryClass:", {
      vendors: vendors.length,
      countyKeys: Object.keys(counts).length,
    });
    return counts;
  }

  logSupabaseSelectStart("getVendorCountsByCounty (legacy)", vendorTable(), "(none)");
  const { data, error, count } = await sb()
    .from(vendorTable())
    .select("countiesServed", { count: "exact" })
    .limit(10_000);

  logSupabaseSelectResult("getVendorCountsByCounty (legacy)", { data: data ?? [], error, count });

  if (error) {
    console.error("[vendors-db] getVendorCountsByCounty", error);
    return counts;
  }

  for (const row of data ?? []) {
    const served = (row.countiesServed as string[] | null) ?? [];
    for (const raw of served) {
      const s = raw.toLowerCase();
      counts[s] = (counts[s] ?? 0) + 1;
    }
  }

  return counts;
}

export async function getVendorsByCounty(countySlug: string): Promise<Vendor[]> {
  const slug = countySlug.toLowerCase();

  if (!isSupabaseConfigured()) {
    console.error("[vendors-db] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return [];
  }

  if (isCarryClassVendorShape()) {
    logSupabaseSelectStart("getVendorsByCounty (CarryClass — cache)", vendorTable(), { countySlug });
    const vendors = await getCarryClassVendorsCached();
    const list = sortByName(
      vendors.filter(
        (v) =>
          v.countiesServed.some((c) => c.toLowerCase() === slug) || v.county.toLowerCase() === slug
      )
    );
    console.log("📦 getVendorsByCounty CarryClass:", {
      pool: vendors.length,
      matched: list.length,
      countySlug,
    });
    return list;
  }

  logSupabaseSelectStart("getVendorsByCounty (legacy)", vendorTable(), { countySlug });
  const { data, error, count } = await sb()
    .from(vendorTable())
    .select("*", { count: "exact" })
    .contains("countiesServed", [slug])
    .order("name", { ascending: true })
    .limit(10_000);

  logSupabaseSelectResult("getVendorsByCounty (legacy)", { data: data ?? [], error, count });

  if (error) {
    console.error("[vendors-db] getVendorsByCounty", error);
    return [];
  }

  return sortByName(
    (data ?? [])
      .map((row) => mapRow(row as Record<string, unknown>))
      .filter((v): v is Vendor => v != null)
  );
}

export async function getVendorsByCity(city: string, countySlug?: string): Promise<Vendor[]> {
  if (!isSupabaseConfigured()) {
    console.error("[vendors-db] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return [];
  }

  if (isCarryClassVendorShape()) {
    logSupabaseSelectStart("getVendorsByCity (CarryClass — cache)", vendorTable(), { city, countySlug });
    const vendors = await getCarryClassVendorsCached();
    const cityLower = city.toLowerCase();
    const list = sortByName(
      vendors.filter((v) => {
        const cityOk = v.city.toLowerCase() === cityLower;
        const countyOk =
          !countySlug ||
          v.countiesServed.some((c) => c.toLowerCase() === countySlug.toLowerCase()) ||
          v.county.toLowerCase() === countySlug.toLowerCase();
        return cityOk && countyOk;
      })
    );
    console.log("📦 getVendorsByCity CarryClass:", { pool: vendors.length, matched: list.length });
    return list;
  }

  logSupabaseSelectStart("getVendorsByCity (legacy)", vendorTable(), { city, countySlug });
  let query = sb().from(vendorTable()).select("*", { count: "exact" }).ilike("city", city);

  if (countySlug) {
    query = query.contains("countiesServed", [countySlug.toLowerCase()]);
  }

  const { data, error, count } = await query.order("name", { ascending: true }).limit(10_000);

  logSupabaseSelectResult("getVendorsByCity (legacy)", { data: data ?? [], error, count });

  if (error) {
    console.error("[vendors-db] getVendorsByCity", error);
    return [];
  }

  return sortByName(
    (data ?? [])
      .map((row) => mapRow(row as Record<string, unknown>))
      .filter((v): v is Vendor => v != null)
  );
}

export async function getUniqueCitiesInCounty(countySlug: string): Promise<string[]> {
  const vendors = await getVendorsByCounty(countySlug);
  return [...new Set(vendors.map((v) => v.city))].sort();
}

export async function getAllUniqueCities(): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    console.error("[vendors-db] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return [];
  }

  if (isCarryClassVendorShape()) {
    logSupabaseSelectStart("getAllUniqueCities (CarryClass — cache)", vendorTable(), "(none)");
    const vendors = await getCarryClassVendorsCached();
    const cities = vendors.map((v) => v.city).filter(Boolean);
    const unique = [...new Set(cities)].sort();
    console.log("📦 getAllUniqueCities CarryClass:", { vendors: vendors.length, uniqueCities: unique.length });
    return unique;
  }

  logSupabaseSelectStart("getAllUniqueCities (legacy)", vendorTable(), "(none)");
  const { data, error, count } = await sb()
    .from(vendorTable())
    .select("city", { count: "exact" })
    .limit(10_000);

  logSupabaseSelectResult("getAllUniqueCities (legacy)", { data: data ?? [], error, count });

  if (error) {
    console.error("[vendors-db] getAllUniqueCities", error);
    return [];
  }

  const cities = (data ?? []).map((r) => r.city as string).filter(Boolean);
  return [...new Set(cities)].sort();
}
