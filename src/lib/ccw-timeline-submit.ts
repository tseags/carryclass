import { prisma } from "@/lib/db";
import { isPrismaConnectionError } from "@/lib/prisma-connection-error";
import { isValidCountySlug } from "@/data/counties";
import type { CcwTimelineProcess } from "@/types/ccw-timeline";

const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_BODY_LENGTH = 4000;
const MAX_COST_DOLLARS = 10_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CreateCcwTimelineInput = {
  countySlug: string;
  process: CcwTimelineProcess;
  displayName?: string;
  body: string;
  dateStarted?: string;
  dateFinished?: string;
  totalCost?: string | number;
};

export type CreateCcwTimelineErrorField =
  | "countySlug"
  | "process"
  | "body"
  | "displayName"
  | "dateStarted"
  | "dateFinished"
  | "totalCost";

export type CreateCcwTimelineResult =
  | {
      ok: true;
      submission: {
        id: string;
        status: "pending" | "approved";
        countySlug: string;
        process: CcwTimelineProcess;
      };
    }
  | {
      ok: false;
      field: CreateCcwTimelineErrorField;
      message: string;
    }
  | {
      ok: false;
      field: "server";
      message: string;
    };

const PROCESS_TO_ENUM: Record<CcwTimelineProcess, "INITIAL" | "RENEWAL" | "MODIFICATION"> = {
  initial: "INITIAL",
  renewal: "RENEWAL",
  modification: "MODIFICATION",
};

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseDollarsToCents(value: unknown): number | null | "invalid" {
  if (value == null || value === "") return null;
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value.replace(/[^0-9.\-]/g, ""))
        : Number.NaN;
  if (!Number.isFinite(raw)) return "invalid";
  if (raw < 0 || raw > MAX_COST_DOLLARS) return "invalid";
  return Math.round(raw * 100);
}

export function validateCreateCcwTimelineInput(
  input: Partial<CreateCcwTimelineInput>
): { ok: true; value: Required<Pick<CreateCcwTimelineInput, "countySlug" | "process" | "body">> & {
    displayName: string;
    dateStarted: Date | null;
    dateFinished: Date | null;
    totalCostCents: number | null;
    durationDays: number | null;
  } } | { ok: false; field: CreateCcwTimelineErrorField; message: string } {
  const countySlug =
    typeof input.countySlug === "string" ? input.countySlug.trim().toLowerCase() : "";
  if (!countySlug || !isValidCountySlug(countySlug)) {
    return { ok: false, field: "countySlug", message: "Unknown county." };
  }

  const process = input.process;
  if (process !== "initial" && process !== "renewal" && process !== "modification") {
    return { ok: false, field: "process", message: "Invalid process type." };
  }

  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (body.length < 10) {
    return { ok: false, field: "body", message: "Please share at least a sentence about your experience." };
  }
  if (body.length > MAX_BODY_LENGTH) {
    return {
      ok: false,
      field: "body",
      message: `Description must be ${MAX_BODY_LENGTH} characters or fewer.`,
    };
  }

  let displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      ok: false,
      field: "displayName",
      message: `Name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`,
    };
  }
  if (!displayName) displayName = "Anonymous";

  const dateStarted = parseDate(input.dateStarted);
  if (input.dateStarted && !dateStarted) {
    return { ok: false, field: "dateStarted", message: "Invalid start date." };
  }
  const dateFinished = parseDate(input.dateFinished);
  if (input.dateFinished && !dateFinished) {
    return { ok: false, field: "dateFinished", message: "Invalid finish date." };
  }

  let durationDays: number | null = null;
  if (dateStarted && dateFinished) {
    const diff = Math.round((dateFinished.getTime() - dateStarted.getTime()) / DAY_MS);
    if (diff < 0) {
      return {
        ok: false,
        field: "dateFinished",
        message: "Finish date must be on or after start date.",
      };
    }
    if (diff > 0) durationDays = diff;
  }

  const cents = parseDollarsToCents(input.totalCost);
  if (cents === "invalid") {
    return { ok: false, field: "totalCost", message: "Invalid cost amount." };
  }

  return {
    ok: true,
    value: {
      countySlug,
      process,
      body,
      displayName,
      dateStarted,
      dateFinished,
      totalCostCents: cents,
      durationDays,
    },
  };
}

export async function createCcwTimelineSubmission(
  input: Partial<CreateCcwTimelineInput>
): Promise<CreateCcwTimelineResult> {
  const validated = validateCreateCcwTimelineInput(input);
  if (!validated.ok) return validated;

  const v = validated.value;
  try {
    const created = await prisma.ccwTimelineSubmission.create({
      data: {
        countySlug: v.countySlug,
        process: PROCESS_TO_ENUM[v.process],
        displayName: v.displayName,
        body: v.body,
        dateStarted: v.dateStarted,
        dateFinished: v.dateFinished,
        durationDays: v.durationDays,
        totalCostCents: v.totalCostCents,
        sourceType: "USER_FORM",
        status: "PENDING",
      },
      select: { id: true, status: true, countySlug: true, process: true },
    });

    return {
      ok: true,
      submission: {
        id: created.id,
        status: created.status.toLowerCase() as "pending" | "approved",
        countySlug: created.countySlug,
        process: v.process,
      },
    };
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      return {
        ok: false,
        field: "server",
        message: "We can't reach the database right now. Please try again shortly.",
      };
    }
    throw error;
  }
}

export const ccwTimelineSubmitLimits = {
  maxDisplayNameLength: MAX_DISPLAY_NAME_LENGTH,
  maxBodyLength: MAX_BODY_LENGTH,
} as const;
