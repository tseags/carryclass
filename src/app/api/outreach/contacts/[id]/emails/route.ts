import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOutreachUserId, outreachNotFound } from "@/lib/outreach/auth";
import { getZohoMessageText, searchZohoMessages, zohoMissingEnv } from "@/lib/outreach/zoho";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Zoho messages for this contact's addresses. With `?messageId=`, returns that
 * message's plain-text body (only if it belongs to this contact's thread).
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  if (!(await getOutreachUserId())) return outreachNotFound();
  const { id } = await ctx.params;
  const contact = await prisma.outreachContact.findUnique({
    where: { id },
    select: { emails: true },
  });
  if (!contact) return outreachNotFound();

  const missing = zohoMissingEnv();
  if (missing.length > 0) {
    return NextResponse.json({ connected: false, missing, messages: [] });
  }
  if (contact.emails.length === 0) {
    return NextResponse.json({ connected: true, messages: [] });
  }

  try {
    const messages = await searchZohoMessages(contact.emails);
    const messageId = req.nextUrl.searchParams.get("messageId");
    if (messageId) {
      const message = messages.find((m) => m.messageId === messageId);
      if (!message) return outreachNotFound();
      const text = await getZohoMessageText(message.folderId, message.messageId);
      return NextResponse.json({ connected: true, messageId, text });
    }
    return NextResponse.json({ connected: true, messages });
  } catch (e) {
    console.error("[outreach] zoho", e);
    return NextResponse.json(
      { connected: true, error: "Couldn't reach Zoho Mail. Try again in a minute.", messages: [] },
      { status: 502 }
    );
  }
}
