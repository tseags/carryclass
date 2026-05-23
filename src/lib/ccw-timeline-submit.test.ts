import { describe, expect, it } from "vitest";
import { validateCreateCcwTimelineInput } from "@/lib/ccw-timeline-submit";

describe("validateCreateCcwTimelineInput", () => {
  it("rejects unknown county slugs", () => {
    const r = validateCreateCcwTimelineInput({
      countySlug: "not-a-county",
      process: "initial",
      body: "I applied and waited.",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("countySlug");
  });

  it("rejects invalid process values", () => {
    const r = validateCreateCcwTimelineInput({
      countySlug: "los-angeles",
      // @ts-expect-error: testing runtime guard
      process: "noped",
      body: "I applied and waited.",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("process");
  });

  it("rejects too-short bodies", () => {
    const r = validateCreateCcwTimelineInput({
      countySlug: "los-angeles",
      process: "initial",
      body: "hi",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("body");
  });

  it("computes durationDays when both dates are present", () => {
    const r = validateCreateCcwTimelineInput({
      countySlug: "los-angeles",
      process: "initial",
      body: "I applied and waited.",
      dateStarted: "2025-01-01",
      dateFinished: "2025-04-11",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.durationDays).toBe(100);
  });

  it("rejects a finish date earlier than the start date", () => {
    const r = validateCreateCcwTimelineInput({
      countySlug: "los-angeles",
      process: "initial",
      body: "I applied and waited.",
      dateStarted: "2025-04-11",
      dateFinished: "2025-01-01",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("dateFinished");
  });

  it("defaults the displayName to Anonymous when blank", () => {
    const r = validateCreateCcwTimelineInput({
      countySlug: "los-angeles",
      process: "initial",
      body: "I applied and waited several months.",
      displayName: "  ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.displayName).toBe("Anonymous");
  });

  it("parses dollar amounts to integer cents", () => {
    const r = validateCreateCcwTimelineInput({
      countySlug: "los-angeles",
      process: "initial",
      body: "I applied and waited several months.",
      totalCost: "$757.60",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.totalCostCents).toBe(75760);
  });
});
