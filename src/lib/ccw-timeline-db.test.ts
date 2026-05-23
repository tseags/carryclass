import { beforeEach, describe, expect, it, vi } from "vitest";

type FakeRow = {
  id: string;
  countySlug: string;
  process: "INITIAL" | "RENEWAL" | "MODIFICATION";
  displayName: string;
  body: string;
  durationDays: number | null;
  submittedAt: Date;
};

const findMany = vi.fn<(args: unknown) => Promise<FakeRow[]>>();

vi.mock("@/lib/db", () => ({
  prisma: {
    ccwTimelineSubmission: {
      findMany: (args: unknown) => findMany(args),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

import { getCcwTimelineForCounty } from "@/lib/ccw-timeline-db";

beforeEach(() => {
  findMany.mockReset();
});

function row(
  process: FakeRow["process"],
  durationDays: number,
  submittedAt: string,
  overrides: Partial<FakeRow> = {}
): FakeRow {
  return {
    id: `${process}-${durationDays}-${submittedAt}`,
    countySlug: "los-angeles",
    process,
    displayName: "Anonymous",
    body: `Body for ${process} with ${durationDays} days.`,
    durationDays,
    submittedAt: new Date(submittedAt),
    ...overrides,
  };
}

describe("getCcwTimelineForCounty", () => {
  it("returns empty metrics for every process when DB is empty", async () => {
    findMany.mockResolvedValue([]);
    const data = await getCcwTimelineForCounty("los-angeles");
    expect(data.countySlug).toBe("los-angeles");
    expect(data.countyDisplayName).toBe("Los Angeles");
    expect(data.lastTimelineSubmittedCounty).toBe(null);
    expect(data.processes.map((p) => p.process)).toEqual([
      "initial",
      "renewal",
      "modification",
    ]);
    for (const p of data.processes) {
      expect(p.avgDays).toBe(null);
      expect(p.rangeMin).toBe(null);
      expect(p.rangeMax).toBe(null);
      expect(p.submissionCount).toBe(0);
    }
  });

  it("computes median + min/max when there are 3+ rows", async () => {
    findMany.mockResolvedValue([
      row("INITIAL", 100, "2026-03-20"),
      row("INITIAL", 200, "2026-03-19"),
      row("INITIAL", 150, "2026-03-18"),
      row("INITIAL", 175, "2026-03-17"),
    ]);

    const data = await getCcwTimelineForCounty("los-angeles");
    const initial = data.processes.find((p) => p.process === "initial")!;
    expect(initial.submissionCount).toBe(4);
    // median of [100,150,175,200] -> avg(150,175) = 163
    expect(initial.avgDays).toBe(163);
    expect(initial.rangeMin).toBe(100);
    expect(initial.rangeMax).toBe(200);
    expect(initial.lastSubmittedAt).toBe(new Date("2026-03-20").toISOString());
    expect(data.lastTimelineSubmittedCounty).toBe(initial.lastSubmittedAt);
  });

  it("hides metrics when fewer than 3 approved submissions exist for a process", async () => {
    findMany.mockResolvedValue([
      row("RENEWAL", 60, "2026-03-15"),
      row("RENEWAL", 80, "2026-03-10"),
    ]);
    const data = await getCcwTimelineForCounty("los-angeles");
    const renewal = data.processes.find((p) => p.process === "renewal")!;
    expect(renewal.submissionCount).toBe(2);
    expect(renewal.avgDays).toBe(null);
    expect(renewal.rangeMin).toBe(null);
    expect(renewal.rangeMax).toBe(null);
    expect(renewal.freshnessLine.toLowerCase()).toContain("only 2");
  });

  it("groups rows by process and chooses the most recent county-wide date", async () => {
    // findMany is called with orderBy: { submittedAt: 'desc' }; mock respects that.
    findMany.mockResolvedValue([
      row("MODIFICATION", 8, "2026-03-06"),
      row("MODIFICATION", 10, "2026-03-05"),
      row("MODIFICATION", 12, "2026-03-04"),
      row("INITIAL", 120, "2026-03-03"),
      row("INITIAL", 110, "2026-03-02"),
      row("INITIAL", 100, "2026-03-01"),
    ]);
    const data = await getCcwTimelineForCounty("los-angeles");
    const initial = data.processes.find((p) => p.process === "initial")!;
    const modification = data.processes.find((p) => p.process === "modification")!;
    expect(initial.submissionCount).toBe(3);
    expect(modification.submissionCount).toBe(3);
    // most-recent across processes is 2026-03-06
    expect(data.lastTimelineSubmittedCounty).toBe(new Date("2026-03-06").toISOString());
  });

  it("passes the durationDays through to the UI submission shape", async () => {
    findMany.mockResolvedValue([row("INITIAL", 142, "2026-03-20")]);
    const data = await getCcwTimelineForCounty("los-angeles");
    const initial = data.processes.find((p) => p.process === "initial")!;
    expect(initial.submissions[0]?.durationDays).toBe(142);
    expect(initial.submissions[0]?.body).toContain("142");
  });

  it("only queries approved rows for the given county", async () => {
    findMany.mockResolvedValue([]);
    await getCcwTimelineForCounty("orange");
    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0]?.[0] as {
      where: { countySlug: string; status: string };
    };
    expect(args.where.countySlug).toBe("orange");
    expect(args.where.status).toBe("APPROVED");
  });
});
