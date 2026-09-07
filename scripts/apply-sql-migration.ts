/**
 * Apply a SQL migration to the correct Supabase project.
 *
 * This repo talks to TWO Supabase projects (see .cursor/rules/vendor-data.mdc):
 *   --target listings   → DATABASE_URL             vendor listings + claim_verifications
 *   --target onboarding → ONBOARDING_DATABASE_URL  the `vendors` profile table read over REST
 *                         (falls back to DATABASE_URL when both refs match)
 *
 * Why not plain `npx prisma db execute --schema prisma/schema.prisma`? The Prisma
 * CLI reads `.env` only — never `.env.local` — so it silently targets whatever is
 * in `.env`. This resolves the URL the same way Next.js does and passes it via
 * `--url`, so the project being written is always printed and explicit.
 *
 * Usage:
 *   npm run migrate:sql -- --file migrations/claim-verifications.sql --target listings
 *   npm run migrate:sql -- --file migrations/onboarding.sql --target onboarding
 *   npm run migrate:sql -- --file migrations/onboarding.sql --target onboarding --dry-run
 */

import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

for (const file of [".env", ".env.development", ".env.local", ".env.development.local"]) {
  config({ path: resolve(process.cwd(), file), override: true, quiet: true });
}

type Target = "listings" | "onboarding";

function parseArgs(): { file: string; target: Target; dryRun: boolean } {
  const args = process.argv.slice(2);
  const valueFor = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };

  const file = valueFor("--file");
  const target = valueFor("--target");

  if (!file) throw new Error("Missing --file <path to .sql>");
  if (target !== "listings" && target !== "onboarding") {
    throw new Error("Missing or invalid --target (expected 'listings' or 'onboarding')");
  }
  if (!existsSync(resolve(process.cwd(), file))) {
    throw new Error(`SQL file not found: ${file}`);
  }

  return { file, target, dryRun: args.includes("--dry-run") };
}

/**
 * Supabase's transaction pooler (:6543) is pgBouncer in transaction mode, where
 * `prisma db execute` hangs forever instead of erroring. The same host serves
 * session mode on :5432, which handles DDL correctly. App runtime keeps :6543.
 */
function toDdlSafeUrl(raw: string): { url: string; rewritten: boolean } {
  if (!/pooler\.supabase\.com:6543/.test(raw)) return { url: raw, rewritten: false };
  return { url: raw.replace(":6543", ":5432"), rewritten: true };
}

function refFromPostgresUrl(raw: string): string | null {
  try {
    const host = new URL(raw).hostname;
    const direct = host.match(/^db\.([^.]+)\.supabase\.co$/);
    if (direct) return direct[1];
    return raw.match(/postgres\.([^.]+):/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function refFromRestUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function resolveUrl(target: Target): { url: string; ref: string | null; source: string } {
  const listingsUrl = process.env.DATABASE_URL?.trim();

  if (target === "listings") {
    if (!listingsUrl) throw new Error("DATABASE_URL is not set.");
    return { url: listingsUrl, ref: refFromPostgresUrl(listingsUrl), source: "DATABASE_URL" };
  }

  const onboardingUrl = process.env.ONBOARDING_DATABASE_URL?.trim();
  if (onboardingUrl) {
    return {
      url: onboardingUrl,
      ref: refFromPostgresUrl(onboardingUrl),
      source: "ONBOARDING_DATABASE_URL",
    };
  }

  const restRef = refFromRestUrl();
  const listingsRef = listingsUrl ? refFromPostgresUrl(listingsUrl) : null;

  if (listingsUrl && restRef && listingsRef === restRef) {
    return {
      url: listingsUrl,
      ref: listingsRef,
      source: "DATABASE_URL (same project as REST)",
    };
  }

  throw new Error(
    [
      "ONBOARDING_DATABASE_URL is not set, and DATABASE_URL points at a different project",
      `than NEXT_PUBLIC_SUPABASE_URL (${listingsRef ?? "?"} vs ${restRef ?? "?"}).`,
      "",
      "Onboarding profile data is read over REST from the project above, so its schema",
      "must be migrated there — applying it to DATABASE_URL would create tables the app",
      "never reads.",
      "",
      `Fix: add the Postgres connection string for project ${restRef ?? "<rest-project>"} to .env.local as`,
      "ONBOARDING_DATABASE_URL (Supabase Dashboard → that project → Settings → Database →",
      "Connection string → URI). Or paste the SQL into that project's SQL Editor.",
    ].join("\n")
  );
}

function main(): void {
  const { file, target, dryRun } = parseArgs();
  const { url, ref, source } = resolveUrl(target);

  if (/\[PROJECT-REF\]|\[YOUR-PASSWORD\]/.test(url)) {
    throw new Error(
      `${source} still contains .env.example placeholders — refusing to run. Set a real connection string.`
    );
  }

  const { url: ddlUrl, rewritten } = toDdlSafeUrl(url);

  console.log(`Applying ${file}`);
  console.log(`  target:  ${target}`);
  console.log(`  via:     ${source}`);
  console.log(`  project: ${ref ?? "(unparseable ref)"}`);
  if (rewritten) {
    console.log("  port:    6543 → 5432 (session mode; DDL hangs on the transaction pooler)");
  }
  console.log("");

  if (dryRun) {
    console.log("--dry-run: resolved successfully, nothing executed.");
    return;
  }

  const result = spawnSync(
    "npx",
    ["prisma", "db", "execute", "--file", file, "--url", ddlUrl],
    { stdio: "inherit", env: process.env }
  );

  if (result.status !== 0) {
    console.error(`\nMigration failed (exit ${result.status}).`);
    process.exitCode = result.status ?? 1;
    return;
  }

  console.log("\n✓ Applied. Re-run the pre-flight to confirm: npm run check:instructor-funnel");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
