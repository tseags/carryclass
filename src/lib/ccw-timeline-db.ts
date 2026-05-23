import { prisma } from "@/lib/db";
import { isPrismaConnectionError } from "@/lib/prisma-connection-error";
import { getCountyDisplayName } from "@/data/counties";
import { median } from "@/lib/ccw-timeline-normalize";
import type {
  CcwProcessMetrics,
  CcwTimelineCountyPayload,
  CcwTimelineProcess,
  CcwTimelineSubmission as UiCcwTimelineSubmission,
} from "@/types/ccw-timeline";

/**
 * DB-backed read path for the per-county CCW timeline section.
 *
 * Only APPROVED rows are exposed. PENDING submissions stay hidden until
 * a human reviews them.
 */

const MIN_FOR_METRICS = 2;
const RECENT_SUBMISSIONS_LIMIT = 10;

const PROCESS_LABEL: Record<CcwTimelineProcess, string> = {
  initial: "Initial application",
  renewal: "Renewal",
  modification: "Add-a-gun",
};

const ALL_PROCESSES: CcwTimelineProcess[] = ["initial", "renewal", "modification"];

type DbRow = {
  id: string;
  countySlug: string;
  process: "INITIAL" | "RENEWAL" | "MODIFICATION";
  displayName: string;
  body: string;
  durationDays: number | null;
  submittedAt: Date;
};

function dbProcessToUi(p: DbRow["process"]): CcwTimelineProcess {
  switch (p) {
    case "INITIAL":
      return "initial";
    case "RENEWAL":
      return "renewal";
    case "MODIFICATION":
      return "modification";
  }
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? (error as { code?: unknown }).code : undefined;
  if (code === "P2021") return true;
  const message = "message" in error ? (error as { message?: unknown }).message : undefined;
  return typeof message === "string" && message.includes("CcwTimelineSubmission");
}

function freshnessLine(count: number, lastSubmittedAt: string | null): string {
  if (count === 0) return "No valid submissions yet for this process.";
  if (count < MIN_FOR_METRICS) {
    return `Only ${count} report${count === 1 ? "" : "s"} so far — add yours to unlock the median.`;
  }
  if (!lastSubmittedAt) return "Based on recent applicant reports.";
  const submitted = new Date(lastSubmittedAt);
  if (Number.isNaN(submitted.getTime())) return "Based on recent applicant reports.";
  const days = Math.round((Date.now() - submitted.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 14) return "Based on the latest applicant reports.";
  if (days <= 60) return `Based on applicant reports from the last ${Math.max(1, Math.round(days / 7))} weeks.`;
  return "Based on recent applicant reports (some entries may be a few months old).";
}

function emptyProcessMetrics(process: CcwTimelineProcess): CcwProcessMetrics {
  return {
    process,
    label: PROCESS_LABEL[process],
    avgDays: null,
    rangeMin: null,
    rangeMax: null,
    submissionCount: 0,
    lastSubmittedAt: null,
    freshnessLine: freshnessLine(0, null),
    submissions: [],
  };
}

function toUiSubmission(row: DbRow): UiCcwTimelineSubmission {
  return {
    id: row.id,
    displayName: row.displayName || "Anonymous",
    body: row.body,
    submittedAt: row.submittedAt.toISOString(),
    durationDays: row.durationDays ?? null,
  };
}

export async function getCcwTimelineForCounty(
  countySlug: string
): Promise<CcwTimelineCountyPayload> {
  const slug = countySlug.toLowerCase();
  const countyDisplayName = getCountyDisplayName(slug);

  let rows: DbRow[];
  try {
    rows = await prisma.ccwTimelineSubmission.findMany({
      where: { countySlug: slug, status: "APPROVED" },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        countySlug: true,
        process: true,
        displayName: true,
        body: true,
        durationDays: true,
        submittedAt: true,
      },
    });
  } catch (error) {
    if (isMissingTableError(error) || isPrismaConnectionError(error)) {
      return {
        countySlug: slug,
        countyDisplayName,
        lastTimelineSubmittedCounty: null,
        processes: ALL_PROCESSES.map(emptyProcessMetrics),
      };
    }
    throw error;
  }

  const byProcess = new Map<CcwTimelineProcess, DbRow[]>();
  for (const p of ALL_PROCESSES) byProcess.set(p, []);
  for (const row of rows) {
    const ui = dbProcessToUi(row.process);
    byProcess.get(ui)!.push(row);
  }

  const processes: CcwProcessMetrics[] = ALL_PROCESSES.map((p) => {
    const list = byProcess.get(p)!;
    if (list.length === 0) return emptyProcessMetrics(p);

    const durations = list
      .map((r) => r.durationDays)
      .filter((d): d is number => typeof d === "number" && d > 0 && d < 2000);

    const lastSubmittedAt = list[0]?.submittedAt.toISOString() ?? null;
    const hasMetrics = durations.length >= MIN_FOR_METRICS;

    return {
      process: p,
      label: PROCESS_LABEL[p],
      avgDays: hasMetrics ? median(durations) : null,
      rangeMin: hasMetrics ? Math.min(...durations) : null,
      rangeMax: hasMetrics ? Math.max(...durations) : null,
      submissionCount: list.length,
      lastSubmittedAt,
      freshnessLine: freshnessLine(list.length, lastSubmittedAt),
      submissions: list.slice(0, RECENT_SUBMISSIONS_LIMIT).map(toUiSubmission),
    };
  });

  let lastCounty: string | null = null;
  for (const m of processes) {
    if (!m.lastSubmittedAt) continue;
    if (!lastCounty || new Date(m.lastSubmittedAt) > new Date(lastCounty)) {
      lastCounty = m.lastSubmittedAt;
    }
  }

  return {
    countySlug: slug,
    countyDisplayName,
    lastTimelineSubmittedCounty: lastCounty,
    processes,
  };
}

/** Used by `/api/ccw-timeline`. Kept here so submission counts are computed in one place. */
export async function getCcwTimelineApprovedCount(countySlug: string): Promise<number> {
  try {
    return await prisma.ccwTimelineSubmission.count({
      where: { countySlug: countySlug.toLowerCase(), status: "APPROVED" },
    });
  } catch (error) {
    if (isMissingTableError(error) || isPrismaConnectionError(error)) return 0;
    throw error;
  }
}
