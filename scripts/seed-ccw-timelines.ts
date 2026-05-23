/**
 * Seed CcwTimelineSubmission rows from `data/timeline-import/review.json`.
 *
 * The import script is the parsing pipeline; this script just translates the
 * review JSON into Prisma upserts. Rows are upserted on `sourceRef`, so it is
 * safe to re-run after re-importing (existing rows update body/dates/duration;
 * status flips to APPROVED only if currently PENDING and the new row is
 * high-confidence — manual REJECTED/APPROVED choices made in Studio are
 * preserved).
 *
 * Usage:
 *   tsx scripts/seed-ccw-timelines.ts          # seed both approved + pending
 *   tsx scripts/seed-ccw-timelines.ts --dry    # print what would happen
 *   tsx scripts/seed-ccw-timelines.ts --approved-only
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import type { ImportedReport, ImportSummary } from "./import-ccw-timelines";

const REVIEW_FILE = resolve(__dirname, "..", "data/timeline-import/review.json");
const prisma = new PrismaClient();

type Args = { dryRun: boolean; approvedOnly: boolean };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry") || args.includes("--dry-run"),
    approvedOnly: args.includes("--approved-only"),
  };
}

function processToEnum(p: ImportedReport["process"]): "INITIAL" | "RENEWAL" | "MODIFICATION" {
  switch (p) {
    case "initial":
      return "INITIAL";
    case "renewal":
      return "RENEWAL";
    case "modification":
      return "MODIFICATION";
  }
}

async function main() {
  const args = parseArgs();

  const raw = await readFile(REVIEW_FILE, "utf8");
  const parsed = JSON.parse(raw) as {
    summary: ImportSummary;
    rows: ImportedReport[];
  };

  const candidates = parsed.rows.filter((r) => {
    if (r.decision === "skip") return false;
    if (!r.countySlug) return false;
    if (args.approvedOnly && r.decision !== "auto-approve") return false;
    return true;
  });

  console.log(`[seed] candidates: ${candidates.length} (of ${parsed.rows.length})`);

  if (args.dryRun) {
    const byCounty: Record<string, number> = {};
    for (const r of candidates) {
      const key = r.countySlug ?? "(unknown)";
      byCounty[key] = (byCounty[key] ?? 0) + 1;
    }
    console.log("[seed] DRY RUN — would upsert by county:");
    for (const [c, n] of Object.entries(byCounty).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${c.padEnd(20)} ${n}`);
    }
    return;
  }

  let created = 0;
  let updated = 0;
  let approvedNow = 0;
  let stayedPending = 0;

  for (const r of candidates) {
    if (!r.sourceRef || !r.countySlug) continue;

    const wantStatus: "APPROVED" | "PENDING" =
      r.decision === "auto-approve" ? "APPROVED" : "PENDING";

    const baseData = {
      countySlug: r.countySlug,
      process: processToEnum(r.process),
      displayName: "Anonymous",
      body: r.body,
      dateStarted: r.dateStarted ? new Date(r.dateStarted) : null,
      dateFinished: r.dateFinished ? new Date(r.dateFinished) : null,
      durationDays: r.durationDays ?? null,
      totalCostCents: r.totalCostCents ?? null,
      sourceType: "DOCX_IMPORT",
      rawText: r.rawText,
      parseConfidence: r.confidence,
      parseWarnings: r.warnings,
    } satisfies Prisma.CcwTimelineSubmissionUncheckedCreateInput;

    const existing = await prisma.ccwTimelineSubmission.findUnique({
      where: { sourceRef: r.sourceRef },
      select: { id: true, status: true },
    });

    if (!existing) {
      await prisma.ccwTimelineSubmission.create({
        data: {
          ...baseData,
          sourceRef: r.sourceRef,
          status: wantStatus,
          reviewedAt: wantStatus === "APPROVED" ? new Date() : null,
        },
      });
      created++;
      if (wantStatus === "APPROVED") approvedNow++;
      else stayedPending++;
      continue;
    }

    // Preserve manual review decisions: only flip PENDING -> APPROVED if the
    // re-import is now high-confidence. Never auto-downgrade.
    const nextStatus =
      existing.status === "PENDING" && wantStatus === "APPROVED"
        ? "APPROVED"
        : existing.status;

    await prisma.ccwTimelineSubmission.update({
      where: { id: existing.id },
      data: {
        ...baseData,
        status: nextStatus,
        reviewedAt:
          nextStatus === "APPROVED" && existing.status !== "APPROVED" ? new Date() : undefined,
      },
    });
    updated++;
    if (nextStatus === "APPROVED" && existing.status !== "APPROVED") approvedNow++;
  }

  console.log(`[seed] created: ${created}, updated: ${updated}`);
  console.log(`[seed]   flipped to APPROVED: ${approvedNow}`);
  console.log(`[seed]   stayed pending     : ${stayedPending}`);

  const total = await prisma.ccwTimelineSubmission.count();
  const approved = await prisma.ccwTimelineSubmission.count({ where: { status: "APPROVED" } });
  const pending = await prisma.ccwTimelineSubmission.count({ where: { status: "PENDING" } });
  console.log(`[seed] DB state — total: ${total}, approved: ${approved}, pending: ${pending}`);
}

main()
  .catch((e) => {
    console.error("[seed] FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
