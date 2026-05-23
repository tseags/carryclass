/**
 * One-off helper: applies the CcwTimelineSubmission migration SQL directly via
 * Prisma, without touching unrelated tables (avoids `prisma db push` wanting to
 * drop legacy `counties`/`vendors`/etc. tables that aren't part of this schema).
 *
 * Idempotent: skips creation when objects already exist.
 *
 * Usage:
 *   set -a; source .env.local; set +a; tsx scripts/apply-ccw-timeline-migration.ts
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function exists(query: string): Promise<boolean> {
  const rows = (await prisma.$queryRawUnsafe(query)) as Array<{ exists: boolean }>;
  return Boolean(rows[0]?.exists);
}

async function main() {
  const file = resolve(
    __dirname,
    "..",
    "prisma/migrations/20260522000000_add_ccw_timeline_submission/migration.sql"
  );
  const raw = await readFile(file, "utf8");

  // Strip SQL line comments first, then split on `;` at end of statement.
  const stripped = raw.replace(/^\s*--.*$/gm, "");
  const statements = stripped
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`[migrate] applying ${statements.length} statements`);

  let applied = 0;
  let skipped = 0;
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt + ";");
      applied++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already exists/i.test(msg) || /duplicate/i.test(msg)) {
        skipped++;
        continue;
      }
      console.error("[migrate] statement failed:\n", stmt.slice(0, 200), "\n", msg);
      throw e;
    }
  }
  console.log(`[migrate] applied=${applied} skipped=${skipped}`);

  const tableExists = await exists(
    "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='CcwTimelineSubmission') as exists"
  );
  console.log(`[migrate] CcwTimelineSubmission table exists: ${tableExists}`);
}

main()
  .catch((e) => {
    console.error("[migrate] FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
