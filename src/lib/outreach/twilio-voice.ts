import twilio from "twilio";

const REQUIRED_ENV = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "TWILIO_API_KEY",
  "TWILIO_API_SECRET",
  "TWILIO_TWIML_APP_SID",
] as const;

export function voiceMissingEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
}

export function isVoiceConfigured(): boolean {
  return voiceMissingEnv().length === 0;
}

const IDENTITY_PREFIX = "outreach-";

export function voiceIdentityForUser(userId: string): string {
  return `${IDENTITY_PREFIX}${userId}`;
}

/** Clerk user id from a Twilio `From` value like `client:outreach-user_123`. */
export function userIdFromVoiceClient(from: string | null | undefined): string | null {
  const identity = (from ?? "").replace(/^client:/, "");
  return identity.startsWith(IDENTITY_PREFIX) ? identity.slice(IDENTITY_PREFIX.length) : null;
}

/** Outbound-only Voice token for the browser; expires in 1 hour. */
export function createVoiceAccessToken(userId: string): string {
  const { AccessToken } = twilio.jwt;
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!.trim(),
    process.env.TWILIO_API_KEY!.trim(),
    process.env.TWILIO_API_SECRET!.trim(),
    { identity: voiceIdentityForUser(userId), ttl: 3600 }
  );
  token.addGrant(
    new AccessToken.VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID!.trim(),
      incomingAllow: false,
    })
  );
  return token.toJwt();
}

export function isValidTwilioRequest(
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!signature) return false;
  return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!.trim(), signature, url, params);
}

export function dialTwiml(toE164: string): string {
  const response = new twilio.twiml.VoiceResponse();
  const dial = response.dial({ callerId: process.env.TWILIO_FROM_NUMBER!.trim(), record: "do-not-record" });
  dial.number(toE164);
  return response.toString();
}

export function rejectTwiml(message: string): string {
  const response = new twilio.twiml.VoiceResponse();
  response.say(message);
  response.hangup();
  return response.toString();
}

/** Duration in seconds of the browser leg, once Twilio has it. */
export async function fetchCallDurationSeconds(callSid: string): Promise<number | null> {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!.trim(), process.env.TWILIO_AUTH_TOKEN!.trim());
    const call = await client.calls(callSid).fetch();
    const seconds = Number(call.duration);
    return Number.isFinite(seconds) ? seconds : null;
  } catch {
    return null;
  }
}
