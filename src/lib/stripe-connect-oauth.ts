import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const STATE_COOKIE = "stripe_connect_state";
const USER_COOKIE = "stripe_connect_user";
const COOKIE_MAX_AGE = 60 * 15; // 15 minutes

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

/** Begin OAuth: store CSRF state + user id in cookies, return value for Stripe `state` param. */
export async function beginStripeConnectOAuth(userId: string): Promise<string> {
  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, cookieOptions());
  cookieStore.set(USER_COOKIE, userId, cookieOptions());
  return state;
}

export type StripeConnectOAuthValidation =
  | { ok: true; userId: string }
  | { ok: false; reason: "missing_code" | "missing_state" | "invalid_state" | "session_mismatch" };

/** Validate Stripe callback against cookies + current Clerk session. */
export async function validateStripeConnectOAuth(
  code: string | null,
  state: string | null,
  sessionUserId: string | null
): Promise<StripeConnectOAuthValidation> {
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const storedUserId = cookieStore.get(USER_COOKIE)?.value;

  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(USER_COOKIE);

  if (!code) return { ok: false, reason: "missing_code" };
  if (!state || !expectedState || state !== expectedState) {
    return { ok: false, reason: !state ? "missing_state" : "invalid_state" };
  }
  if (!sessionUserId || !storedUserId || sessionUserId !== storedUserId) {
    return { ok: false, reason: "session_mismatch" };
  }

  return { ok: true, userId: storedUserId };
}

export function stripeConnectOAuthErrorMessage(
  reason: Exclude<StripeConnectOAuthValidation, { ok: true }>["reason"]
): string {
  switch (reason) {
    case "missing_code":
      return "Stripe did not return an authorization code. Complete the Connect flow or try again.";
    case "missing_state":
    case "invalid_state":
      return "Stripe session expired or was interrupted. Click Connect with Stripe again.";
    case "session_mismatch":
      return "Sign-in changed during Stripe Connect. Stay signed in as the same user and try again.";
  }
}
