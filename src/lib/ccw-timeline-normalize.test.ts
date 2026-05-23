import { describe, expect, it } from "vitest";
import {
  classifyProcess,
  cleanBody,
  computeDuration,
  detectCountyFromReport,
  extractDates,
  extractExplicitDurationDays,
  median,
  normalizeCountyToSlug,
  scoreReport,
} from "@/lib/ccw-timeline-normalize";

describe("normalizeCountyToSlug", () => {
  it("returns the slug unchanged for canonical inputs", () => {
    expect(normalizeCountyToSlug("los-angeles")).toBe("los-angeles");
    expect(normalizeCountyToSlug("Orange")).toBe("orange");
  });

  it("strips the 'County' suffix", () => {
    expect(normalizeCountyToSlug("San Joaquin County")).toBe("san-joaquin");
  });

  it("maps display names regardless of case", () => {
    expect(normalizeCountyToSlug("San Luis Obispo")).toBe("san-luis-obispo");
    expect(normalizeCountyToSlug("CONTRA COSTA")).toBe("contra-costa");
  });

  it("maps common agency abbreviations to county slugs", () => {
    expect(normalizeCountyToSlug("LASD")).toBe("los-angeles");
    expect(normalizeCountyToSlug("LAPD")).toBe("los-angeles");
    expect(normalizeCountyToSlug("SFPD")).toBe("san-francisco");
    expect(normalizeCountyToSlug("ACSO")).toBe("alameda");
    expect(normalizeCountyToSlug("OCSD")).toBe("orange");
    expect(normalizeCountyToSlug("RivCo")).toBe("riverside");
  });

  it("returns null for unknown input", () => {
    expect(normalizeCountyToSlug("Nowheresville")).toBe(null);
    expect(normalizeCountyToSlug("")).toBe(null);
  });
});

describe("detectCountyFromReport", () => {
  it("uses the title to identify the county with high confidence", () => {
    const res = detectCountyFromReport("LASD CCW Renewal Timeline", "Just renewed via Permitium.");
    expect(res.slug).toBe("los-angeles");
    expect(res.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("falls back to the body when the title is generic", () => {
    const res = detectCountyFromReport(
      "CCW timeline",
      "Submitted to OCSD in December and finally got my permit."
    );
    expect(res.slug).toBe("orange");
    expect(res.confidence).toBeGreaterThan(0);
    expect(res.confidence).toBeLessThan(0.85);
  });

  it("returns null when no county can be identified", () => {
    const res = detectCountyFromReport("CCW timeline", "Just got my CCW. Hooray!");
    expect(res.slug).toBe(null);
    expect(res.confidence).toBe(0);
  });
});

describe("classifyProcess", () => {
  it("detects renewals", () => {
    expect(classifyProcess("LASD CCW Renewal Timeline", "")).toBe("renewal");
    expect(classifyProcess("CCW Timeline", "8-hour renewal class completed")).toBe("renewal");
  });

  it("detects modifications", () => {
    expect(classifyProcess("LASD CCW Modification", "")).toBe("modification");
    expect(classifyProcess("Add-a-gun timeline", "")).toBe("modification");
    expect(classifyProcess("CCW timeline", "Submitted to add a firearm")).toBe("modification");
  });

  it("defaults to initial when no hints are present", () => {
    expect(classifyProcess("LAPD CCW Timeline", "Applied in October.")).toBe("initial");
  });
});

describe("extractDates", () => {
  it("parses slash dates", () => {
    const out = extractDates("Applied 12/5/2025 and approved 3/11/2026.");
    expect(out.map((d) => d.iso)).toEqual([
      "2025-12-05T00:00:00.000Z",
      "2026-03-11T00:00:00.000Z",
    ]);
  });

  it("parses month-name dates and uses the fallback year", () => {
    const out = extractDates("Applied on December 5 and approved March 11.", 2025);
    expect(out.map((d) => d.iso)).toEqual([
      "2025-12-05T00:00:00.000Z",
      "2025-03-11T00:00:00.000Z",
    ]);
  });

  it("parses 2-digit years as 2000s", () => {
    const out = extractDates("Applied 1/5/26.");
    expect(out[0]?.iso).toBe("2026-01-05T00:00:00.000Z");
  });

  it("supports ISO dates", () => {
    const out = extractDates("Submitted 2025-12-05 via Permitium.");
    expect(out[0]?.iso).toBe("2025-12-05T00:00:00.000Z");
  });

  it("ignores invalid date-like sequences", () => {
    const out = extractDates("Price was 19/99 for the class.");
    expect(out).toHaveLength(0);
  });
});

describe("extractExplicitDurationDays", () => {
  it("matches 'Total time: 150 Days'", () => {
    expect(extractExplicitDurationDays("Total time: 150 Days")).toBe(150);
  });

  it("matches 'Total wait: 193 days'", () => {
    expect(extractExplicitDurationDays("Total wait: 193 days")).toBe(193);
  });

  it("matches '~6 day turnaround'", () => {
    expect(extractExplicitDurationDays("~6 day turnaround was a nice surprise")).toBe(6);
  });

  it("returns null when no explicit duration is present", () => {
    expect(extractExplicitDurationDays("Took a while to get the permit.")).toBe(null);
  });
});

describe("computeDuration", () => {
  it("prefers an explicit duration over date math", () => {
    const r = computeDuration(
      "Applied 1/1/2025. Permit 5/1/2025. Total wait: 100 days"
    );
    expect(r.durationDays).toBe(100);
    expect(r.source).toBe("explicit");
  });

  it("falls back to first-date / last-date math", () => {
    const r = computeDuration("Applied 1/5/2026. Permit picked up 3/10/2026.");
    expect(r.source).toBe("date-span");
    expect(r.durationDays).toBe(64);
  });

  it("returns null when there is no usable signal", () => {
    const r = computeDuration("Just a paragraph with no dates.");
    expect(r.durationDays).toBe(null);
    expect(r.source).toBe("none");
  });

  it("warns about unusually large date spans", () => {
    const r = computeDuration("Applied 1/1/2020. Picked up 1/1/2024.");
    expect(r.warnings.some((w) => w.includes("unusually large"))).toBe(true);
  });
});

describe("scoreReport", () => {
  it("flags high confidence when county + duration + body are all strong", () => {
    const res = scoreReport({
      countyConfidence: 0.95,
      process: "initial",
      duration: {
        durationDays: 120,
        dateStarted: new Date(),
        dateFinished: new Date(),
        source: "explicit",
        warnings: [],
      },
      body: "x".repeat(120),
    });
    expect(res.highConfidence).toBe(true);
    expect(res.score).toBeGreaterThan(0.8);
  });

  it("does not flag high confidence without a duration", () => {
    const res = scoreReport({
      countyConfidence: 0.95,
      process: "initial",
      duration: {
        durationDays: null,
        dateStarted: null,
        dateFinished: null,
        source: "none",
        warnings: [],
      },
      body: "x".repeat(120),
    });
    expect(res.highConfidence).toBe(false);
  });

  it("does not flag high confidence for implausibly long durations", () => {
    const res = scoreReport({
      countyConfidence: 0.95,
      process: "initial",
      duration: {
        durationDays: 1500,
        dateStarted: new Date(),
        dateFinished: new Date(),
        source: "date-span",
        warnings: ["date-span unusually large (1500 days)"],
      },
      body: "x".repeat(200),
    });
    expect(res.highConfidence).toBe(false);
  });
});

describe("cleanBody", () => {
  it("splits glued bullet lists", () => {
    const cleaned = cleanBody("Steps: • One• Two• Three");
    expect(cleaned).toContain("\n• One");
    expect(cleaned).toContain("\n• Two");
    expect(cleaned).toContain("\n• Three");
  });

  it("splits glued slash dates", () => {
    const cleaned = cleanBody("Renewal: 5/3/26Application: 5/5/26Approval: 5/11/26");
    expect(cleaned.split("\n").length).toBeGreaterThanOrEqual(3);
  });
});

describe("median", () => {
  it("returns the middle of odd-length arrays", () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it("rounds the average of even-length arrays", () => {
    expect(median([2, 4])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(3);
  });

  it("returns null for empty arrays", () => {
    expect(median([])).toBe(null);
  });
});
