/**
 * Pre-flight for the instructor self-serve funnel
 * (/for-instructors → /instructors/claim → /onboard/step/1-6 → /dashboard/vendor).
 *
 * Reports, per backing store, whether the schema/env/storage the funnel needs is
 * present. Read-only: never creates or alters anything.
 *
 * Usage: npm run check:instructor-funnel
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Importing @prisma/client already loaded `.env`, which holds placeholders here.
// Re-load in Next.js precedence order (lowest first, each overriding) so this
// script sees the same values the dev server does.
for (const file of [".env", ".env.development", ".env.local", ".env.development.local"]) {
  config({ path: resolve(process.cwd(), file), override: true, quiet: true });
}

/**
 * Supabase's transaction pooler (:6543) is pgBouncer, which reuses backends across
 * connections and makes Prisma's prepared statements collide ("s0 already exists").
 * `pgbouncer=true` disables that cache.
 */
function poolerSafeUrl(raw: string | undefined): string {
  if (!raw) return "";
  if (!/pooler\.supabase\.com:6543/.test(raw) || /pgbouncer=/.test(raw)) return raw;
  return `${raw}${raw.includes("?") ? "&" : "?"}pgbouncer=true`;
}

const prisma = new PrismaClient({
  datasources: { db: { url: poolerSafeUrl(process.env.DATABASE_URL) } },
});

type Status = "ok" | "warn" | "fail";

const results: Array<{ status: Status; area: string; detail: string }> = [];

function record(status: Status, area: string, detail: string): void {
  results.push({ status, area, detail });
}

/**
 * `prisma db execute` / `prisma migrate` read `.env` only — never `.env.local`.
 * A placeholder or stale `.env` silently points migrations at the wrong project.
 */
function checkPrismaCliEnv(): void {
  const path = resolve(process.cwd(), ".env");
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    record("ok", "prisma CLI env", "No .env file — Prisma CLI needs DATABASE_URL passed inline.");
    return;
  }

  const line = raw
    .split("\n")
    .find((l) => /^\s*DATABASE_URL\s*=/.test(l));

  if (!line) {
    record("warn", "prisma CLI env", ".env has no DATABASE_URL — pass it inline for Prisma CLI commands.");
    return;
  }

  const value = line.replace(/^\s*DATABASE_URL\s*=\s*/, "").trim().replace(/^["']|["']$/g, "");
  const isPlaceholder = /\[PROJECT-REF\]|\[YOUR-PASSWORD\]|YOUR_|example\.com/.test(value);
  const realRef = projectRefFromDatabaseUrl();
  const envRef = value.match(/postgres\.([^.:]+):/)?.[1] ?? value.match(/db\.([^.]+)\.supabase\.co/)?.[1] ?? null;

  if (isPlaceholder) {
    record(
      "warn",
      "prisma CLI env",
      ".env DATABASE_URL is an unedited .env.example placeholder. Bare `npx prisma db execute --schema ...` would target a bogus host. Use `npm run migrate:sql` (resolves .env.local and prints the target), or delete the stray .env."
    );
  } else if (realRef && envRef && realRef !== envRef) {
    record(
      "warn",
      "prisma CLI env",
      `.env DATABASE_URL points at ${envRef} but .env.local points at ${realRef}. Bare Prisma CLI commands would migrate the wrong project — use \`npm run migrate:sql\`.`
    );
  } else {
    record("ok", "prisma CLI env", `.env DATABASE_URL matches .env.local (${envRef ?? "parsed"}).`);
  }
}

function projectRefFromRestUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function projectRefFromDatabaseUrl(): string | null {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname;
    const direct = host.match(/^db\.([^.]+)\.supabase\.co$/);
    if (direct) return direct[1];
    return raw.match(/postgres\.([^.]+):/)?.[1] ?? null;
  } catch {
    return null;
  }
}

// ── Claim codes: Prisma / DATABASE_URL ───────────────────────────────────────

const CLAIM_INDEXES = [
  "claim_verifications_clerk_idx",
  "claim_verifications_listing_idx",
  "claim_verifications_listing_claimed_uidx",
];

async function checkClaimSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    record("fail", "claim schema", "DATABASE_URL is not set — cannot check claim_verifications.");
    return;
  }

  let columns: Array<{ column_name: string }>;
  try {
    columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'claim_verifications'`
    );
  } catch (error) {
    record(
      "fail",
      "claim schema",
      `Could not query DATABASE_URL: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }

  if (columns.length === 0) {
    record(
      "fail",
      "claim schema",
      "Table claim_verifications is missing. Run: npx prisma db execute --file migrations/claim-verifications.sql --schema prisma/schema.prisma"
    );
    return;
  }

  const present = new Set(columns.map((r) => r.column_name));
  const required = [
    "id",
    "clerk_user_id",
    "listing_slug",
    "channel",
    "destination_normalized",
    "destination_masked",
    "code_hash",
    "attempts",
    "max_attempts",
    "expires_at",
    "verified_at",
    "consumed_at",
  ];
  const missing = required.filter((c) => !present.has(c));
  if (missing.length) {
    record("fail", "claim schema", `claim_verifications is missing columns: ${missing.join(", ")}`);
  } else {
    record("ok", "claim schema", `claim_verifications present with ${columns.length} columns.`);
  }

  const idx = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = 'claim_verifications'`
  );
  const idxNames = new Set(idx.map((r) => r.indexname));
  const missingIdx = CLAIM_INDEXES.filter((n) => !idxNames.has(n));
  if (missingIdx.length) {
    record("warn", "claim indexes", `Missing index(es): ${missingIdx.join(", ")}`);
  } else {
    record("ok", "claim indexes", "All 3 claim_verifications indexes present.");
  }
}

/** Listing lookup during claim reads vendor rows from the same Postgres. */
async function checkListingSource(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;

  const table =
    process.env.NEXT_PUBLIC_SUPABASE_VENDORS_TABLE?.trim() || "CarryClass Vendor Data";

  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*) AS count FROM public."${table.replace(/"/g, "")}"`
    );
    const count = Number(rows[0]?.count ?? 0);
    if (count === 0) {
      record("fail", "listing source", `Table "${table}" exists but has 0 rows — nothing to claim.`);
    } else {
      record("ok", "listing source", `"${table}" has ${count} rows on DATABASE_URL.`);
    }
  } catch (error) {
    record(
      "fail",
      "listing source",
      `Cannot read "${table}" on DATABASE_URL: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ── Onboarding profile: Supabase REST ───────────────────────────────────────

function restHeaders(): Record<string, string> | null {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) return null;
  return { apikey: key, Authorization: `Bearer ${key}` };
}

const ONBOARDING_VENDOR_COLUMNS = [
  "clerk_user_id",
  "canonical_name",
  "normalized_name",
  "name",
  "phone",
  "email",
  "website",
  "address",
  "county",
  "counties_served",
  "slug",
  "bio",
  "photo_url",
  "gallery_urls",
  "badge_tags",
  "cancellation_policy",
  "cancellation_hours",
  "cancellation_refund_percent",
  "stripe_account_id",
  "is_published",
  "onboarding_step",
  "calendar_type",
  "ical_feed_url",
  "google_calendar_id",
  "google_refresh_token",
];

const ONBOARDING_TABLES = [
  "vendors",
  "vendor_class_types",
  "vendor_calendar_classes",
  "vendor_email_templates",
  "vendor_email_events",
];

async function checkOnboardingSchema(): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const headers = restHeaders();

  if (!baseUrl) {
    record("fail", "onboarding schema", "NEXT_PUBLIC_SUPABASE_URL is not set.");
    return;
  }
  if (!headers) {
    record(
      "fail",
      "onboarding schema",
      "No SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY — cannot query REST."
    );
    return;
  }

  for (const table of ONBOARDING_TABLES) {
    const res = await fetch(`${baseUrl}/rest/v1/${table}?select=*&limit=0`, { headers });
    if (res.ok) {
      record("ok", `onboarding table ${table}`, "Exists and is readable over REST.");
      continue;
    }
    const body = await res.text();
    record(
      "fail",
      `onboarding table ${table}`,
      `REST ${res.status}: ${body.slice(0, 160)} — apply migrations/onboarding.sql on this project.`
    );
  }

  // Column-level check on vendors: PostgREST rejects unknown columns in select.
  const missing: string[] = [];
  for (const column of ONBOARDING_VENDOR_COLUMNS) {
    const res = await fetch(`${baseUrl}/rest/v1/vendors?select=${column}&limit=0`, { headers });
    if (!res.ok) missing.push(column);
  }
  if (missing.length) {
    record(
      "fail",
      "onboarding vendors columns",
      `Missing/unreadable on vendors: ${missing.join(", ")} — apply migrations/onboarding.sql.`
    );
  } else {
    record(
      "ok",
      "onboarding vendors columns",
      `All ${ONBOARDING_VENDOR_COLUMNS.length} onboarding columns readable on vendors.`
    );
  }
}

async function checkStorageBucket(): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!baseUrl) return;
  if (!serviceKey) {
    record(
      "warn",
      "storage vendor-assets",
      "SUPABASE_SERVICE_ROLE_KEY not set — cannot verify bucket (uploads need it anyway)."
    );
    return;
  }

  const res = await fetch(`${baseUrl}/storage/v1/bucket/vendor-assets`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });

  if (res.status === 404) {
    record(
      "fail",
      "storage vendor-assets",
      "Bucket does not exist. Create it (public) — profile/gallery uploads will 500 without it."
    );
    return;
  }
  if (!res.ok) {
    record("fail", "storage vendor-assets", `Storage API ${res.status}: ${(await res.text()).slice(0, 160)}`);
    return;
  }

  const bucket = (await res.json()) as { public?: boolean };
  if (bucket.public) {
    record("ok", "storage vendor-assets", "Bucket exists and is public (getPublicUrl will resolve).");
  } else {
    record(
      "warn",
      "storage vendor-assets",
      "Bucket exists but is PRIVATE — getPublicUrl() returns URLs that 400. Make it public."
    );
  }
}

// ── Env vars ────────────────────────────────────────────────────────────────

function checkEnv(): void {
  const required: Array<{ name: string; why: string }> = [
    { name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", why: "sign-up / sign-in" },
    { name: "CLERK_SECRET_KEY", why: "server auth on /onboard and /dashboard" },
    { name: "NEXT_PUBLIC_SUPABASE_URL", why: "onboarding profile REST" },
    { name: "SUPABASE_SERVICE_ROLE_KEY", why: "onboarding writes + storage uploads (bypasses RLS)" },
    { name: "DATABASE_URL", why: "claim codes + listing lookup" },
    { name: "RESEND_API_KEY", why: "email claim codes" },
    { name: "NEXT_PUBLIC_APP_URL", why: "absolute redirects" },
  ];

  for (const { name, why } of required) {
    if (process.env[name]?.trim()) {
      record("ok", `env ${name}`, `Set (${why}).`);
    } else {
      record("fail", `env ${name}`, `Missing — needed for ${why}.`);
    }
  }

  // On Supabase's transaction pooler, Prisma's prepared statements collide
  // across reused backends (42P05 "prepared statement s0 already exists"),
  // which surfaces as flaky claim start/verify since those run raw queries.
  // poolSafeDatabaseUrl() in src/lib/db.ts appends ?pgbouncer=true at runtime.
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (/pooler\.supabase\.com:6543/.test(dbUrl)) {
    const normalized = poolerSafeUrl(dbUrl);
    record(
      normalized.includes("pgbouncer=true") ? "ok" : "warn",
      "env DATABASE_URL pooling",
      normalized.includes("pgbouncer=true")
        ? "Transaction pooler (:6543); src/lib/db.ts adds ?pgbouncer=true at runtime, so raw queries won't hit 42P05."
        : "Transaction pooler (:6543) without ?pgbouncer=true — Prisma can intermittently fail with 42P05 'prepared statement already exists'."
    );
  }

  const twilio = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"];
  const twilioSet = twilio.filter((n) => process.env[n]?.trim());
  if (twilioSet.length === twilio.length) {
    record("ok", "env twilio", "Phone (SMS) claim channel configured.");
  } else if (twilioSet.length === 0) {
    record("warn", "env twilio", "Not configured — phone claim channel unavailable; use email codes.");
  } else {
    record("warn", "env twilio", `Partially set (${twilioSet.join(", ")}) — SMS claims will fail.`);
  }

  // Step 5 is skippable: instructors finish onboarding, publish, and edit their
  // listing without Connect. Missing Stripe config only costs them bookings
  // (accepts_bookings stays false), so it is a warning, not a funnel blocker.
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  const stripeClientId = process.env.STRIPE_CLIENT_ID?.trim();
  if (!stripeSecret || !stripeClientId) {
    const missing = [
      !stripeSecret ? "STRIPE_SECRET_KEY" : null,
      !stripeClientId ? "STRIPE_CLIENT_ID" : null,
    ].filter(Boolean);
    record(
      "warn",
      "env stripe connect",
      `Missing ${missing.join(" + ")} — claim → onboard → publish → dashboard still works, but nobody can connect Stripe, so every listing stays bookings-off.`
    );
  } else if (!stripeSecret.startsWith("sk_")) {
    record(
      "warn",
      "env stripe connect",
      "STRIPE_SECRET_KEY must be a full secret key (sk_test_/sk_live_) — restricted keys (rk_) cannot complete Connect OAuth, so bookings can never be enabled."
    );
  } else {
    record(
      "ok",
      "env stripe connect",
      `Configured (${stripeSecret.includes("_live_") ? "live" : "test"} mode). Run npm run check:stripe-connect to verify the OAuth redirect URI.`
    );
  }

  if (!process.env.CLAIM_CODE_PEPPER?.trim()) {
    const fallback = process.env.CRON_SECRET?.trim()
      ? "CRON_SECRET"
      : process.env.CLERK_SECRET_KEY?.trim()
        ? "CLERK_SECRET_KEY"
        : "the hardcoded dev default";
    record(
      "warn",
      "env CLAIM_CODE_PEPPER",
      `Unset — code hashes fall back to ${fallback}. Rotating it invalidates pending codes.`
    );
  } else {
    record("ok", "env CLAIM_CODE_PEPPER", "Set.");
  }

  // Publish → live hedge: non-empty allowlist means only listed claimed slugs
  // get listing UPDATE + Prisma Vendor/ClassSession sync. Easy to forget in prod.
  const allowlistRaw = process.env.PUBLISH_LIVE_SLUG_ALLOWLIST;
  const allowlistSlugs = (allowlistRaw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowlistSlugs.length === 0) {
    record(
      "ok",
      "env PUBLISH_LIVE_SLUG_ALLOWLIST",
      "Unset/empty — full go-live (every publish syncs to directory + booking)."
    );
  } else {
    record(
      "warn",
      "env PUBLISH_LIVE_SLUG_ALLOWLIST",
      `NOT FULLY LIVE — allowlist active (${allowlistSlugs.length} slug(s): ${allowlistSlugs.join(", ")}). Other publishes set is_published but skip live sync. Clear this env for full go-live.`
    );
  }
}

// ── Report ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const restRef = projectRefFromRestUrl();
  const dbRef = projectRefFromDatabaseUrl();

  console.log("Instructor funnel pre-flight");
  console.log("════════════════════════════");
  console.log(`Supabase REST project (onboarding profile): ${restRef ?? "(unset)"}`);
  console.log(`DATABASE_URL project (claim + listings):    ${dbRef ?? "(unset)"}`);
  console.log(
    `Same project: ${restRef && dbRef ? (restRef === dbRef ? "yes" : "NO — migrations are split") : "n/a"}`
  );
  console.log("");

  if (restRef && dbRef && restRef !== dbRef) {
    console.log("Split-brain layout — apply each migration to its own project:");
    console.log(`  migrations/claim-verifications.sql → DATABASE_URL      (${dbRef})`);
    console.log(`  migrations/onboarding.sql          → REST project SQL  (${restRef})`);
    console.log("");
  }

  checkEnv();
  checkPrismaCliEnv();
  await checkClaimSchema();
  await checkListingSource();
  await checkOnboardingSchema();
  await checkStorageBucket();

  const allowlistActive = results.some(
    (r) =>
      r.area === "env PUBLISH_LIVE_SLUG_ALLOWLIST" && r.status === "warn"
  );
  if (allowlistActive) {
    console.log("");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("!  PUBLISH_LIVE_SLUG_ALLOWLIST is set — NOT FULL GO-LIVE.    !");
    console.log("!  Only allowlisted claimed slugs sync listing + booking.    !");
    console.log("!  Clear PUBLISH_LIVE_SLUG_ALLOWLIST for full go-live.       !");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("");
  }

  const icon: Record<Status, string> = { ok: "✓", warn: "!", fail: "✗" };
  for (const r of results) {
    console.log(`${icon[r.status]} ${r.area}: ${r.detail}`);
  }

  const fails = results.filter((r) => r.status === "fail").length;
  const warns = results.filter((r) => r.status === "warn").length;
  console.log("");
  console.log(`${results.length - fails - warns} ok · ${warns} warning · ${fails} blocking`);

  process.exitCode = fails > 0 ? 1 : 0;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
