import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { VENDOR_DATA_CACHE_TAG } from "@/lib/vendors-db";

export const runtime = "nodejs";

/**
 * Bust cached vendor directory data after CSV → Supabase loads.
 * Auth: Bearer CRON_SECRET (same as /api/sync-calendars).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag(VENDOR_DATA_CACHE_TAG, "max");
  revalidatePath("/");
  revalidatePath("/instructors");
  revalidatePath("/ca");
  revalidatePath("/sitemap.xml");

  return NextResponse.json({
    ok: true,
    revalidatedTag: VENDOR_DATA_CACHE_TAG,
  });
}
