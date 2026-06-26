/** Redirect URI registered in Stripe Connect → OAuth settings. */
export function getStripeConnectRedirectUri(): string {
  if (process.env.STRIPE_CONNECT_REDIRECT_URI?.trim()) {
    return process.env.STRIPE_CONNECT_REDIRECT_URI.trim();
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  return `${baseUrl.replace(/\/$/, "")}/api/stripe-connect/callback`;
}

/** Returns a user-facing message when Connect cannot run, or null if OK. */
export function getStripeConnectConfigError(): string | null {
  if (!process.env.STRIPE_CLIENT_ID?.trim()) {
    return "Stripe Connect is not configured (missing STRIPE_CLIENT_ID).";
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return "Stripe secret key is missing (STRIPE_SECRET_KEY).";
  }
  if (!secretKey.startsWith("sk_")) {
    return "STRIPE_SECRET_KEY must be a secret key (sk_test_ or sk_live_), not a restricted key (rk_).";
  }

  return null;
}

export function stripeConnectStep5Url(error: string): string {
  return `/onboard/step/5?error=${encodeURIComponent(error)}`;
}
