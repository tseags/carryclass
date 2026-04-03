/** Process types for CCW timeline reporting (v1 placeholder; swap with API later). */
export type CcwTimelineProcess = "initial" | "renewal" | "modification";

export type CcwTimelineSubmission = {
  id: string;
  /** Privacy-safe: "Anonymous" or "FirstName L." */
  displayName: string;
  /** User-visible narrative (dates, milestones). */
  body: string;
  submittedAt: string;
};

export type CcwProcessMetrics = {
  process: CcwTimelineProcess;
  label: string;
  /** Average days when enough valid submissions exist; null = no data. */
  avgDays: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
  submissionCount: number;
  lastSubmittedAt: string | null;
  freshnessLine: string;
  submissions: CcwTimelineSubmission[];
};

export type CcwTimelineCountyPayload = {
  countySlug: string;
  countyDisplayName: string;
  /** Latest submission across all processes in this county (ISO date or null). */
  lastTimelineSubmittedCounty: string | null;
  processes: CcwProcessMetrics[];
};
