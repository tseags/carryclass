import { NextRequest, NextResponse } from "next/server";
import { getOutreachUserId, outreachNotFound } from "@/lib/outreach/auth";
import {
  OutreachInputError,
  addOutreachNote,
  getOutreachContact,
  logOutreachCall,
  logOutreachEmail,
} from "@/lib/outreach/contacts";
import { CALL_DISPOSITIONS, type CallDisposition } from "@/lib/outreach/sequence";
import { fetchCallDurationSeconds, isVoiceConfigured } from "@/lib/outreach/twilio-voice";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

type Body = {
  type?: "note" | "call" | "email";
  body?: string;
  disposition?: string;
  phone?: string;
  durationSeconds?: number;
  twilioCallSid?: string;
  zohoMessageId?: string;
};

function cleanText(value: unknown, max = 5000): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t.slice(0, max) : null;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  if (!(await getOutreachUserId())) return outreachNotFound();
  const { id } = await ctx.params;
  const input = (await req.json().catch(() => ({}))) as Body;

  try {
    if (input.type === "note") {
      const body = cleanText(input.body);
      if (!body) return NextResponse.json({ error: "Write a note first" }, { status: 400 });
      await addOutreachNote(id, body);
    } else if (input.type === "call") {
      if (!CALL_DISPOSITIONS.includes(input.disposition as CallDisposition)) {
        return NextResponse.json({ error: "Pick how the call went" }, { status: 400 });
      }
      const callSid = cleanText(input.twilioCallSid, 64);
      let durationSeconds =
        typeof input.durationSeconds === "number" && input.durationSeconds >= 0
          ? Math.round(input.durationSeconds)
          : null;
      if (callSid && isVoiceConfigured()) {
        durationSeconds = (await fetchCallDurationSeconds(callSid)) ?? durationSeconds;
      }
      await logOutreachCall(id, {
        disposition: input.disposition as CallDisposition,
        phone: cleanText(input.phone, 40),
        durationSeconds,
        twilioCallSid: callSid,
        body: cleanText(input.body),
      });
    } else if (input.type === "email") {
      await logOutreachEmail(id, {
        body: cleanText(input.body),
        zohoMessageId: cleanText(input.zohoMessageId, 64),
      });
    } else {
      return NextResponse.json({ error: "Unknown activity" }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof OutreachInputError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }

  return NextResponse.json(await getOutreachContact(id));
}
