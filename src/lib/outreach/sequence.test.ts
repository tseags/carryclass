import { describe, expect, it } from "vitest";
import { pacificDayKey } from "@/lib/payments-time";
import {
  defaultNextActionForStage,
  isDue,
  stageAfterCall,
  stageAfterEmail,
  suggestedStep,
} from "./sequence";

const now = new Date("2026-10-29T22:42:00Z"); // Oct 29, 3:42pm Pacific

describe("call-first sequence", () => {
  it("starts with a call", () => {
    expect(suggestedStep("not_contacted")).toMatch(/^Call/);
  });

  it("a no-answer call is its own stage and still schedules the email on day 3", () => {
    const next = stageAfterCall({ stage: "not_contacted", nextActionAt: null }, now, "no_answer");
    expect(next.stage).toBe("called_no_answer");
    expect(pacificDayKey(next.nextActionAt!)).toBe("2026-11-01");
  });

  it("emailing after a no-answer call moves to emailed", () => {
    const next = stageAfterEmail({ stage: "called_no_answer", nextActionAt: null }, now);
    expect(next.stage).toBe("emailed");
    expect(pacificDayKey(next.nextActionAt!)).toBe("2026-11-02");
  });

  it("a call from not contacted moves to called with the email due on day 3", () => {
    const next = stageAfterCall({ stage: "not_contacted", nextActionAt: null }, now);
    expect(next.stage).toBe("called");
    expect(pacificDayKey(next.nextActionAt!)).toBe("2026-11-01");
  });

  it("the email moves to emailed with the follow-up call due 4 days later (day 7)", () => {
    const next = stageAfterEmail({ stage: "called", nextActionAt: null }, now);
    expect(next.stage).toBe("emailed");
    expect(pacificDayKey(next.nextActionAt!)).toBe("2026-11-02");
  });

  it("the follow-up call finishes the sequence", () => {
    const next = stageAfterCall({ stage: "emailed", nextActionAt: now }, now);
    expect(next).toEqual({ stage: "follow_up", nextActionAt: null });
  });

  it("another call before emailing keeps the stage and date", () => {
    const due = new Date("2026-11-01T17:00:00Z");
    expect(stageAfterCall({ stage: "called", nextActionAt: due }, now)).toEqual({
      stage: "called",
      nextActionAt: due,
    });
  });

  it("does not move later stages", () => {
    expect(stageAfterCall({ stage: "interested", nextActionAt: null }, now).stage).toBe("interested");
    expect(stageAfterEmail({ stage: "replied", nextActionAt: null }, now).stage).toBe("replied");
  });

  it("closed stages clear the next action", () => {
    expect(defaultNextActionForStage("do_not_contact", now)).toBeNull();
    expect(defaultNextActionForStage("claimed", now)).toBeNull();
  });
});

describe("isDue", () => {
  it("is due today or earlier in Pacific time", () => {
    expect(isDue("2026-10-29T17:00:00Z", now)).toBe(true);
    expect(isDue("2026-10-20T17:00:00Z", now)).toBe(true);
    expect(isDue("2026-10-30T17:00:00Z", now)).toBe(false);
    expect(isDue(null, now)).toBe(false);
  });
});
