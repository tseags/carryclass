import { NextResponse } from "next/server";
import { createVendorReview } from "@/lib/vendor-reviews";

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
  let payload: {
    vendorId?: string;
    rating?: number;
    authorName?: string;
    body?: string;
    website?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BAD_JSON",
          message: "Invalid request payload.",
        },
      },
      { status: 400 }
    );
  }

  if (typeof payload.website === "string" && payload.website.trim().length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SPAM_BLOCKED",
          message: "Unable to submit review.",
        },
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
    const created = await createVendorReview({
      vendorId: payload.vendorId,
      rating: payload.rating,
      authorName: payload.authorName,
      body: payload.body,
    });

    if (!created.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            field: created.field,
            message: created.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Thanks! Your review was submitted for moderation.",
      reviewId: created.review.id,
      status: created.review.status,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to submit review right now. Please try again shortly.",
        },
      },
      { status: 500 }
    );
  }
}
