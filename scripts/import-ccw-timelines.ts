/**
 * Import CCW Timelines from the canonical `CCW Timelines.docx`.
 *
 * Steps:
 *   1. Extract paragraphs from the .docx archive.
 *   2. Segment into individual reports based on title-styled paragraphs.
 *   3. Normalize each report (county slug, process, dates, durationDays, body).
 *   4. Score each report for auto-approval confidence.
 *   5. Write `data/timeline-import/review.json` for human review and reuse.
 *
 * Re-run safely. The output JSON is stable per run (same hashes given same input)
 * so you can diff revisions and re-seed without dup'ing rows
 * (`scripts/seed-ccw-timelines.ts` upserts on `sourceRef`).
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  extractDocxParagraphs,
  segmentReports,
} from "./lib/docx-extract";
import {
  classifyProcess,
  cleanBody,
  computeDuration,
  detectCountyFromReport,
  extractDates,
  scoreReport,
  type CcwTimelineProcess,
} from "../src/lib/ccw-timeline-normalize";

const ROOT = resolve(__dirname, "..");
const DEFAULT_SOURCE = resolve(ROOT, "CCW Timelines.docx");
const OUTPUT_DIR = resolve(ROOT, "data/timeline-import");
const OUTPUT_FILE = resolve(OUTPUT_DIR, "review.json");

export type ImportedReport = {
  sourceRef: string;
  title: string;
  body: string;
  rawText: string;
  countySlug: string | null;
  countyConfidence: number;
  countyMatches: string[];
  process: CcwTimelineProcess;
  dateStarted: string | null;
  dateFinished: string | null;
  durationDays: number | null;
  durationSource: "explicit" | "date-span" | "none";
  totalCostCents: number | null;
  confidence: number;
  highConfidence: boolean;
  warnings: string[];
  decision: "auto-approve" | "pending" | "skip";
  skipReason?: string;
};

export type ImportSummary = {
  totalSegments: number;
  reports: number;
  skipped: number;
  autoApprove: number;
  pending: number;
  byCounty: Record<string, number>;
  byProcess: Record<CcwTimelineProcess, number>;
  topWarnings: Array<{ warning: string; count: number }>;
};

const COST_PATTERNS = [
  /total\s*cost[:\s]+\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /cost[:\s]+\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
];

function extractTotalCostCents(text: string): number | null {
  for (const re of COST_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const cleaned = m[1].replace(/,/g, "");
    const n = Number.parseFloat(cleaned);
    if (Number.isFinite(n) && n > 0 && n < 100_000) {
      return Math.round(n * 100);
    }
  }
  return null;
}

function isLikelyQuestion(title: string, body: string): boolean {
  const t = title.toLowerCase();
  if (/\b(question|advice|help|how long|anyone|what to expect)\b/.test(t) && !/timeline/i.test(t)) {
    // borderline; only skip if body lacks any dates AND looks asky
    if (/\?\s*$/.test(body.trim()) && extractDates(body).length < 2) return true;
  }
  // pure questions with no dates at all
  if (extractDates(body).length === 0 && body.length < 200 && /\?/.test(body)) {
    return true;
  }
  return false;
}

function hashReport(title: string, rawText: string): string {
  return createHash("sha256")
    .update(`${title}\n---\n${rawText}`)
    .digest("hex")
    .slice(0, 24);
}

async function importDocx(sourcePath: string): Promise<{ rows: ImportedReport[]; summary: ImportSummary }> {
  const paragraphs = await extractDocxParagraphs(sourcePath);
  const segments = segmentReports(paragraphs);
  console.log(`[import] parsed ${paragraphs.length} paragraphs into ${segments.length} segments`);

  const rows: ImportedReport[] = [];
  let skipped = 0;

  for (const seg of segments) {
    const rawText = `${seg.title}\n\n${seg.body}`.trim();
    const cleaned = cleanBody(seg.body);

    const county = detectCountyFromReport(seg.title, cleaned);
    const process = classifyProcess(seg.title, cleaned);
    const titleDates = extractDates(seg.title);
    const duration = computeDuration(cleaned, { titleDates });
    const totalCostCents = extractTotalCostCents(cleaned);
    const confidence = scoreReport({
      countyConfidence: county.confidence,
      process,
      duration,
      body: cleaned,
    });

    let decision: ImportedReport["decision"];
    let skipReason: string | undefined;
    if (cleaned.length < 40 && duration.durationDays == null) {
      decision = "skip";
      skipReason = "fragment-no-dates";
    } else if (!county.slug) {
      decision = "pending";
      confidence.warnings.push("no-county-match");
    } else if (isLikelyQuestion(seg.title, cleaned)) {
      decision = "skip";
      skipReason = "question-not-timeline";
    } else if (confidence.highConfidence) {
      decision = "auto-approve";
    } else {
      decision = "pending";
    }

    const sourceRef = `docx:${hashReport(seg.title, rawText)}`;

    const row: ImportedReport = {
      sourceRef,
      title: seg.title,
      body: cleaned,
      rawText,
      countySlug: county.slug,
      countyConfidence: county.confidence,
      countyMatches: county.matches,
      process,
      dateStarted: duration.dateStarted?.toISOString() ?? null,
      dateFinished: duration.dateFinished?.toISOString() ?? null,
      durationDays: duration.durationDays,
      durationSource: duration.source,
      totalCostCents,
      confidence: confidence.score,
      highConfidence: confidence.highConfidence,
      warnings: confidence.warnings,
      decision,
      skipReason,
    };

    if (decision === "skip") {
      skipped++;
    }

    rows.push(row);
  }

  const byCounty: Record<string, number> = {};
  const byProcess: Record<CcwTimelineProcess, number> = { initial: 0, renewal: 0, modification: 0 };
  const warningCounts = new Map<string, number>();
  let autoApprove = 0;
  let pending = 0;
  for (const r of rows) {
    if (r.decision === "skip") continue;
    if (r.decision === "auto-approve") autoApprove++;
    else pending++;
    const key = r.countySlug ?? "(unknown)";
    byCounty[key] = (byCounty[key] ?? 0) + 1;
    byProcess[r.process] = (byProcess[r.process] ?? 0) + 1;
    for (const w of r.warnings) {
      warningCounts.set(w, (warningCounts.get(w) ?? 0) + 1);
    }
  }
  const topWarnings = [...warningCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([warning, count]) => ({ warning, count }));

  const summary: ImportSummary = {
    totalSegments: segments.length,
    reports: rows.length - skipped,
    skipped,
    autoApprove,
    pending,
    byCounty,
    byProcess,
    topWarnings,
  };

  return { rows, summary };
}

function printSummary(summary: ImportSummary): void {
  console.log("\n=== CCW Timeline Import Summary ===");
  console.log(`Total parsed segments : ${summary.totalSegments}`);
  console.log(`Importable reports    : ${summary.reports}`);
  console.log(`  Auto-approved       : ${summary.autoApprove}`);
  console.log(`  Pending review      : ${summary.pending}`);
  console.log(`Skipped (non-timelines): ${summary.skipped}`);
  console.log("\nBy process:");
  for (const [proc, count] of Object.entries(summary.byProcess)) {
    console.log(`  ${proc.padEnd(13)} ${count}`);
  }
  console.log("\nTop counties:");
  const top = Object.entries(summary.byCounty).sort((a, b) => b[1] - a[1]).slice(0, 12);
  for (const [county, count] of top) {
    console.log(`  ${county.padEnd(20)} ${count}`);
  }
  console.log("\nTop parse warnings:");
  for (const { warning, count } of summary.topWarnings) {
    console.log(`  ${String(count).padStart(4)}x ${warning}`);
  }
  console.log("");
}

async function main() {
  const source = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : DEFAULT_SOURCE;
  console.log(`[import] source: ${source}`);

  const { rows, summary } = await importDocx(source);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    OUTPUT_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), source, summary, rows }, null, 2)
  );
  console.log(`[import] wrote ${rows.length} rows -> ${OUTPUT_FILE}`);
  printSummary(summary);
}

main().catch((e) => {
  console.error("[import] FAILED:", e);
  process.exit(1);
});
