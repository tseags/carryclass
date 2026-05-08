import { NextResponse } from "next/server";
import { getPlaceReviewsResult, type GooglePlaceReviewsResult } from "@/lib/google-reviews";

export const runtime = "nodejs";

const CACHE_TTL_MS = 15 * 60 * 1000;
const reviewsCache = new Map<string, { expiresAt: number; data: GooglePlaceReviewsResult }>();

function getCached(placeId: string): GooglePlaceReviewsResult | null {
  const cached = reviewsCache.get(placeId);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    reviewsCache.delete(placeId);
    return null;
  }
  return cached.data;
}

function setCached(placeId: string, data: GooglePlaceReviewsResult): void {
  reviewsCache.set(placeId, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data,
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const placeId = url.searchParams.get("placeId")?.trim();

  if (!placeId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "MISSING_PLACE_ID",
          message: "A placeId query parameter is required.",
        },
      },
      { status: 400 }
    );
  }

  const cached = getCached(placeId);
  if (cached) {
    return NextResponse.json({
      ok: true,
      source: "cache",
      data: cached,
    });
  }

  const result = await getPlaceReviewsResult(placeId);
  if (!result.ok) {
    const status =
      result.reason === "missing_api_key"
        ? 503
        : result.reason === "not_found" || result.reason === "invalid_request"
          ? 404
          : 502;
    const code =
      result.reason === "missing_api_key"
        ? "GOOGLE_API_NOT_CONFIGURED"
        : result.reason === "not_found" || result.reason === "invalid_request"
          ? "PLACE_NOT_FOUND"
          : "GOOGLE_REVIEWS_UNAVAILABLE";

    if (status >= 500) {
      console.error("[google-reviews] failed to fetch place reviews", {
        placeId,
        reason: result.reason,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code,
          message: "Unable to load Google reviews right now.",
        },
      },
      { status }
    );
  }

  setCached(placeId, result.data);
  return NextResponse.json({
    ok: true,
    source: "google",
    data: result.data,
  });
}
