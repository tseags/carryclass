/**
 * Diff the live onboarding schema (Supabase REST project) against what
 * migrations/onboarding.sql expects. Read-only.
 *
 * Onboarding profile data lives on NEXT_PUBLIC_SUPABASE_URL, which may be a
 * different Supabase project than DATABASE_URL — see .cursor/rules/vendor-data.mdc.
 *
 * Usage: tsx scripts/inspect-onboarding-schema.ts
 */

import { config } from "dotenv";
import { resolve } from "node:path";

for (const file of [".env", ".env.development", ".env.local", ".env.development.local"]) {
  config({ path: resolve(process.cwd(), file), override: true, quiet: true });
}

const EXPECTED: Record<string, string[]> = {
  vendors: [
    "id",
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
  ],
  vendor_class_types: ["id", "vendor_id", "class_type", "price", "is_active", "created_at"],
  vendor_calendar_classes: [
    "id",
    "vendor_id",
    "external_event_id",
    "class_type",
    "title",
    "description",
    "location",
    "range_location",
    "start_time",
    "end_time",
    "is_recurring",
    "recurrence_rule",
    "max_students",
    "price",
    "gun_pricing",
    "is_active",
    "last_synced_at",
    "created_at",
  ],
  vendor_email_templates: [
    "id",
    "vendor_id",
    "type",
    "subject",
    "body",
    "is_active",
    "send_timing",
    "send_mode",
    "scheduled_at",
    "from_email",
    "created_at",
  ],
  vendor_email_events: [
    "id",
    "vendor_id",
    "template_type",
    "recipient",
    "subject",
    "status",
    "is_test",
    "resend_id",
    "opened_at",
    "created_at",
  ],
};

interface OpenApiSpec {
  definitions?: Record<string, { properties?: Record<string, unknown> }>;
}

async function main(): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!baseUrl || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and a Supabase key first.");
    process.exitCode = 1;
    return;
  }

  const ref = new URL(baseUrl).hostname.split(".")[0];
  console.log(`Onboarding schema diff — Supabase project ${ref}`);
  console.log("═".repeat(50));

  const res = await fetch(`${baseUrl}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" },
  });
  if (!res.ok) {
    console.error(`PostgREST spec fetch failed: ${res.status} ${await res.text()}`);
    process.exitCode = 1;
    return;
  }

  const spec = (await res.json()) as OpenApiSpec;
  const definitions = spec.definitions ?? {};

  let drift = 0;

  for (const [table, expectedColumns] of Object.entries(EXPECTED)) {
    const definition = definitions[table];
    if (!definition) {
      drift++;
      console.log(`\n✗ ${table}: TABLE MISSING`);
      continue;
    }
    const live = new Set(Object.keys(definition.properties ?? {}));
    const missing = expectedColumns.filter((c) => !live.has(c));
    const extra = [...live].filter((c) => !expectedColumns.includes(c));

    if (missing.length === 0) {
      console.log(`\n✓ ${table}: all ${expectedColumns.length} expected columns present`);
    } else {
      drift++;
      console.log(`\n✗ ${table}: missing ${missing.length} column(s)`);
      for (const c of missing) console.log(`    - ${c}`);
    }
    if (extra.length) {
      console.log(`  (extra columns not in onboarding.sql: ${extra.join(", ")})`);
    }
  }

  console.log("");
  console.log(
    drift === 0
      ? "Schema matches migrations/onboarding.sql."
      : `${drift} table(s) drifted — apply migrations/onboarding.sql on project ${ref}.`
  );
  process.exitCode = drift === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
