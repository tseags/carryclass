import { NextResponse } from "next/server";
import { getOutreachUserId, outreachNotFound } from "@/lib/outreach/auth";
import { createVoiceAccessToken, voiceMissingEnv } from "@/lib/outreach/twilio-voice";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getOutreachUserId();
  if (!userId) return outreachNotFound();
  const missing = voiceMissingEnv();
  if (missing.length > 0) {
    return NextResponse.json({ error: "Twilio Voice is not configured", missing }, { status: 503 });
  }
  return NextResponse.json({ token: createVoiceAccessToken(userId) });
}
