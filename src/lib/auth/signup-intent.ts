/** Short-lived cookie set when starting instructor sign-up (survives Clerk email verification). */
export const VENDOR_SIGNUP_INTENT_COOKIE = "ccw_signup_intent";

export function setVendorSignupIntentCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${VENDOR_SIGNUP_INTENT_COOKIE}=vendor; path=/; max-age=3600; samesite=lax`;
}
