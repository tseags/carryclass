import { Resend } from "resend";
import twilio from "twilio";
import { DEFAULT_FROM_EMAIL } from "@/lib/email-from";
import type { ClaimChannel } from "@/lib/claim-db";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim()
  );
}

export function isClaimEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function maybeLogDevCode(channel: ClaimChannel, destination: string, code: string) {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.CLAIM_DEV_LOG_CODES === "1"
  ) {
    console.info(
      `[claim] ${channel} code for ${destination}: ${code} (dev/log only — never expose to clients)`
    );
  }
}

export async function sendClaimEmailCode(input: {
  to: string;
  code: string;
  listingName: string;
}): Promise<void> {
  maybeLogDevCode("email", input.to, input.code);
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: DEFAULT_FROM_EMAIL,
    to: input.to,
    subject: `Your CarryClass claim code: ${input.code}`,
    text: [
      `Use this code to claim "${input.listingName}" on CarryClass:`,
      "",
      `  ${input.code}`,
      "",
      "This code expires in 15 minutes.",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
  });
  if (error) {
    throw new Error(error.message || "Failed to send claim email");
  }
}

export async function sendClaimSmsCode(input: {
  toE164: string;
  code: string;
  listingName: string;
}): Promise<void> {
  if (!isTwilioConfigured()) {
    throw new Error(
      "Phone verification is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER."
    );
  }
  maybeLogDevCode("phone", input.toE164, input.code);

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );

  await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER!,
    to: input.toE164,
    body: `CarryClass claim code for ${input.listingName}: ${input.code}. Expires in 15 minutes.`,
  });
}
