import { NextResponse } from "next/server";
import { getBookingConfirmation } from "@/lib/booking-confirmation";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session_id" }, { status: 400 });
  }

  const confirmation = await getBookingConfirmation(sessionId);
  if (!confirmation) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  return NextResponse.json(confirmation, { headers: { "Cache-Control": "no-store" } });
}
