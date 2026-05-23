import { NextResponse } from "next/server";
import {
  createCcwTimelineSubmission,
  type CreateCcwTimelineInput,
} from "@/lib/ccw-timeline-submit";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_SUBMISSIONS_PER_WINDOW = 3;
const ipSubmissionWindow = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function checkThrottle(ip: string): boolean {
  const now = Date.now();
  const recent = (ipSubmissionWindow.get(ip) ?? []).filter((ts) => now - ts < WINDOW_MS);
  if (recent.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    ipSubmissionWindow.set(ip, recent);
    return false;
  }
  recent.push(now);
  ipSubmissionWindow.set(ip, recent);
  return true;
}

export async function POST(req: Request) {
  let payload: Partial<CreateCcwTimelineInput> & { website?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "BAD_JSON", message: "Invalid request payload." },
      },
      { status: 400 }
    );
  }

  // Honeypot.
  if (typeof payload.website === "string" && payload.website.trim().length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "SPAM_BLOCKED", message: "Unable to submit timeline." },
      },
      { status: 400 }
    );
  }

  const ip = getClientIp(req);
  if (!checkThrottle(ip)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many submissions. Please wait a minute and try again.",
        },
      },
      { status: 429 }
    );
  }

  try {
    const result = await createCcwTimelineSubmission({
      countySlug: payload.countySlug,
      process: payload.process,
      displayName: payload.displayName,
      body: payload.body,
      dateStarted: payload.dateStarted,
      dateFinished: payload.dateFinished,
      totalCost: payload.totalCost,
    });

    if (!result.ok) {
      const status = result.field === "server" ? 503 : 400;
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: result.field === "server" ? "SERVER_ERROR" : "VALIDATION_ERROR",
            field: result.field,
            message: result.message,
          },
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Thanks - your timeline was submitted for review.",
      submissionId: result.submission.id,
      status: result.submission.status,
    });
  } catch (error) {
    console.error("[/api/ccw-timeline] failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to submit timeline right now. Please try again shortly.",
        },
      },
      { status: 500 }
    );
  }
}
