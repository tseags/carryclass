import type { CcwTimelineCountyPayload, CcwTimelineProcess } from "@/types/ccw-timeline";

/**
 * Placeholder timeline data for county pages. Replace with API / DB when ready.
 */
export function getPlaceholderCcwTimelineData(
  _countySlug: string,
  countyDisplayName: string
): CcwTimelineCountyPayload {
  const initial = {
    process: "initial" as CcwTimelineProcess,
    label: "Initial application",
    avgDays: 142,
    rangeMin: 95,
    rangeMax: 210,
    submissionCount: 24,
    lastSubmittedAt: "2026-03-20",
    freshnessLine: "Based on recent applicant reports.",
    submissions: [
      {
        id: "1",
        displayName: "Marcus T.",
        body:
          "Applied online 11/20/2025. Interview scheduled 2/1/2026. Approved 3/11/2026 — picked up permit same week.",
        submittedAt: "2026-03-18T14:00:00.000Z",
      },
      {
        id: "2",
        displayName: "Anonymous",
        body:
          "Submitted packet 10/05/2025. Long wait for interview. Permit in hand 02/28/2026.",
        submittedAt: "2026-03-01T09:30:00.000Z",
      },
    ],
  };

  const renewal = {
    process: "renewal" as CcwTimelineProcess,
    label: "Renewal",
    avgDays: 88,
    rangeMin: 45,
    rangeMax: 120,
    submissionCount: 11,
    lastSubmittedAt: "2026-03-15",
    freshnessLine: "Based on recent applicant reports.",
    submissions: [
      {
        id: "r1",
        displayName: "Sarah L.",
        body: "Renewal submitted 01/05/2026. Picked up updated license 03/10/2026.",
        submittedAt: "2026-03-12T16:00:00.000Z",
      },
    ],
  };

  const modification = {
    process: "modification" as CcwTimelineProcess,
    label: "Add-a-gun",
    avgDays: null,
    rangeMin: null,
    rangeMax: null,
    submissionCount: 0,
    lastSubmittedAt: null,
    freshnessLine: "No valid submissions yet for this process.",
    submissions: [],
  };

  return {
    countySlug: _countySlug,
    countyDisplayName,
    lastTimelineSubmittedCounty: "2026-03-20",
    processes: [initial, renewal, modification],
  };
}
