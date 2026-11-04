import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { toE164Us } from "@/lib/claim-contacts";
import { isOutreachUser } from "@/lib/outreach/auth";
import {
  dialTwiml,
  isValidTwilioRequest,
  isVoiceConfigured,
  rejectTwiml,
  userIdFromVoiceClient,
} from "@/lib/outreach/twilio-voice";

export const runtime = "nodejs";

function twiml(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/xml" } });
}

/** Public URL Twilio signed; behind a proxy `req.url` can differ from what Twilio called. */
function signedUrlCandidates(req: NextRequest): string[] {
  const urls = [req.url];
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) urls.push(`${proto}://${host}${req.nextUrl.pathname}`);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl) urls.push(`${appUrl}${req.nextUrl.pathname}`);
  return [...new Set(urls)];
}

/**
 * TwiML App voice URL. Twilio calls this when the browser places a call.
 * Only dials a number stored on the requested contact, for an allowlisted user.
 */
export async function POST(req: NextRequest) {
  if (!isVoiceConfigured()) return twiml(rejectTwiml("Calling is not configured."), 503);

  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });

  const signature = req.headers.get("x-twilio-signature");
  if (!signedUrlCandidates(req).some((url) => isValidTwilioRequest(signature, url, params))) {
    return twiml(rejectTwiml("Request not allowed."), 403);
  }

  const userId = userIdFromVoiceClient(params.From ?? params.Caller);
  if (!isOutreachUser(userId)) return twiml(rejectTwiml("Caller not allowed."), 403);

  const contactId = params.contactId ?? "";
  const to = toE164Us(params.To);
  if (!contactId || !to) return twiml(rejectTwiml("Missing contact or number."), 400);

  const contact = await prisma.outreachContact.findUnique({
    where: { id: contactId },
    select: { phones: true, doNotContact: true },
  });
  if (!contact || contact.doNotContact) return twiml(rejectTwiml("This contact can't be called."), 403);
  if (!contact.phones.some((p) => toE164Us(p) === to)) {
    return twiml(rejectTwiml("That number is not on this contact."), 403);
  }

  return twiml(dialTwiml(to));
}
