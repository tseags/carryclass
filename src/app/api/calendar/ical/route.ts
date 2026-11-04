import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  MAX_ICS_BYTES,
  calendarFeedFetchUrl,
  parseIcsEvents,
} from "@/lib/ical-import";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const ics = typeof body?.ics === "string" ? body.ics : "";

  if (!url && !ics.trim()) {
    return NextResponse.json(
      { error: "Paste a calendar URL or upload an .ics file." },
      { status: 400 }
    );
  }

  let icsText: string;
  if (ics.trim()) {
    if (new TextEncoder().encode(ics).byteLength > MAX_ICS_BYTES) {
      return NextResponse.json(
        { error: "Calendar file is too large (max 2 MB)." },
        { status: 400 }
      );
    }
    icsText = ics;
  } else {
    let fetchUrl: string;
    try {
      fetchUrl = calendarFeedFetchUrl(url);
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Enter a valid calendar URL (https:// or webcal://).",
        },
        { status: 400 }
      );
    }

    try {
      const res = await fetch(fetchUrl, {
        headers: { "User-Agent": "CarryClass/1.0 Calendar Sync" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch calendar (HTTP ${res.status})` },
          { status: 400 }
        );
      }
      const declared = Number(res.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > MAX_ICS_BYTES) {
        return NextResponse.json(
          { error: "Calendar file is too large (max 2 MB)." },
          { status: 400 }
        );
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_ICS_BYTES) {
        return NextResponse.json(
          { error: "Calendar file is too large (max 2 MB)." },
          { status: 400 }
        );
      }
      icsText = new TextDecoder().decode(buf);
    } catch {
      return NextResponse.json(
        { error: "Could not fetch the calendar feed. Check the URL and try again." },
        { status: 400 }
      );
    }
  }

  try {
    const events = parseIcsEvents(icsText);
    return NextResponse.json({ events, count: events.length });
  } catch {
    return NextResponse.json(
      {
        error: ics.trim()
          ? "Couldn’t read that file. Drop a valid .ics calendar export."
          : "Failed to parse calendar file. Make sure the URL points to a valid .ics feed.",
      },
      { status: 400 }
    );
  }
}
