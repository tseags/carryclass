import { PAYMENTS_TIME_ZONE, addDays, pacificDayKey } from "@/lib/payments-time";

export const OUTREACH_STAGES = [
  "not_contacted",
  "called",
  "emailed",
  "follow_up",
  "replied",
  "interested",
  "not_interested",
  "claimed",
  "do_not_contact",
] as const;

export type OutreachStageId = (typeof OUTREACH_STAGES)[number];

export const STAGE_LABELS: Record<OutreachStageId, string> = {
  not_contacted: "Not contacted",
  called: "Called",
  emailed: "Emailed",
  follow_up: "Follow-up called",
  replied: "Replied",
  interested: "Interested",
  not_interested: "Not interested",
  claimed: "Claimed",
  do_not_contact: "Do not contact",
};

export const CALL_DISPOSITIONS = ["no_answer", "voicemail", "connected", "bad_number"] as const;
export type CallDisposition = (typeof CALL_DISPOSITIONS)[number];

export const DISPOSITION_LABELS: Record<CallDisposition, string> = {
  no_answer: "No answer",
  voicemail: "Left voicemail",
  connected: "Connected",
  bad_number: "Bad number",
};

/** Day 0 call → day 3 email → day 7 follow-up call. */
export const DAYS_CALL_TO_EMAIL = 3;
export const DAYS_EMAIL_TO_FOLLOW_UP = 4;

const CLOSED_STAGES = new Set<OutreachStageId>(["not_interested", "claimed", "do_not_contact"]);

/**
 * A Pacific calendar day stored as 17:00 UTC (9–10am Pacific), so the instant
 * reads as the same day in Pacific year-round.
 */
export function dayKeyToInstant(dayKey: string): Date {
  return new Date(`${dayKey}T17:00:00.000Z`);
}

export function daysFromToday(days: number, now: Date = new Date()): Date {
  return dayKeyToInstant(addDays(pacificDayKey(now), days));
}

export function todayKey(now: Date = new Date()): string {
  return pacificDayKey(now);
}

export function isDue(nextActionAt: Date | string | null, now: Date = new Date()): boolean {
  if (!nextActionAt) return false;
  return pacificDayKey(nextActionAt) <= pacificDayKey(now);
}

export interface StageState {
  stage: OutreachStageId;
  nextActionAt: Date | null;
}

/** Result of logging a call, before any date I pick by hand. */
export function stageAfterCall(current: StageState, now: Date = new Date()): StageState {
  if (current.stage === "not_contacted") {
    return { stage: "called", nextActionAt: daysFromToday(DAYS_CALL_TO_EMAIL, now) };
  }
  if (current.stage === "emailed") {
    return { stage: "follow_up", nextActionAt: null };
  }
  return current;
}

/** Result of logging an email I sent. */
export function stageAfterEmail(current: StageState, now: Date = new Date()): StageState {
  if (current.stage === "not_contacted" || current.stage === "called") {
    return { stage: "emailed", nextActionAt: daysFromToday(DAYS_EMAIL_TO_FOLLOW_UP, now) };
  }
  return current;
}

/** Next-action date when I move the stage by hand and don't pick a date. */
export function defaultNextActionForStage(
  stage: OutreachStageId,
  now: Date = new Date()
): Date | null {
  if (stage === "called") return daysFromToday(DAYS_CALL_TO_EMAIL, now);
  if (stage === "emailed") return daysFromToday(DAYS_EMAIL_TO_FOLLOW_UP, now);
  return null;
}

export function isClosedStage(stage: OutreachStageId): boolean {
  return CLOSED_STAGES.has(stage);
}

/** What to do next, in the call → email → follow-up call order. */
export function suggestedStep(stage: OutreachStageId): string {
  switch (stage) {
    case "not_contacted":
      return "Call them (day 0)";
    case "called":
      return "Send the intro email (day 3)";
    case "emailed":
      return "Follow-up call (day 7)";
    case "follow_up":
      return "Sequence done. Wait for a reply or set a next step";
    case "replied":
      return "Reply to them";
    case "interested":
      return "Help them claim their listing";
    case "not_interested":
    case "claimed":
    case "do_not_contact":
      return "No further outreach";
  }
}

/** Short label for the table's next-action column. */
export function nextActionLabel(stage: OutreachStageId): string {
  switch (stage) {
    case "not_contacted":
      return "Call";
    case "called":
      return "Email";
    case "emailed":
      return "Follow-up call";
    case "replied":
      return "Reply";
    case "interested":
      return "Help claim";
    default:
      return "—";
  }
}

const shortDate = new Intl.DateTimeFormat("en-US", {
  timeZone: PAYMENTS_TIME_ZONE,
  month: "short",
  day: "numeric",
});

export function formatDayShort(at: Date | string): string {
  return shortDate.format(new Date(at));
}
