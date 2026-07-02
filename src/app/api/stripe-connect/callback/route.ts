import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, updateVendorProfile } from "@/lib/onboarding-db";
import {
  getStripeConnectConfigError,
  getStripeConnectRedirectUri,
  stripeConnectStep5Url,
} from "@/lib/stripe-connect-config";
import {
  stripeConnectOAuthErrorMessage,
  validateStripeConnectOAuth,
} from "@/lib/stripe-connect-oauth";
import { getStripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001").replace(
    /\/$/,
    ""
  );

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (!userId) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set(
      "redirect_url",
      `${req.nextUrl.pathname}${req.nextUrl.search}`
    );
    signIn.searchParams.set("intent", "vendor");
    return NextResponse.redirect(signIn);
  }

  if (error) {
    const message =
      errorDescription?.trim() ||
      (error === "access_denied"
        ? "Stripe connection was cancelled."
        : `Stripe returned an error: ${error}`);
    return NextResponse.redirect(`${baseUrl}${stripeConnectStep5Url(message)}`);
  }

  const oauth = await validateStripeConnectOAuth(code, state, userId);
  if (!oauth.ok) {
    return NextResponse.redirect(
      `${baseUrl}${stripeConnectStep5Url(stripeConnectOAuthErrorMessage(oauth.reason))}`
    );
  }

  const configError = getStripeConnectConfigError();
  if (configError) {
    return NextResponse.redirect(`${baseUrl}${stripeConnectStep5Url(configError)}`);
  }

  try {
    const response = await getStripe().oauth.token({
      grant_type: "authorization_code",
      code: code!,
    });

    const stripeAccountId = response.stripe_user_id;
    if (!stripeAccountId) {
      return NextResponse.redirect(
        `${baseUrl}${stripeConnectStep5Url("Stripe did not return a connected account ID.")}`
      );
    }

    const vendor = await getVendorProfile(oauth.userId);
    if (!vendor) {
      return NextResponse.redirect(
        `${baseUrl}${stripeConnectStep5Url("Vendor profile not found. Complete earlier onboarding steps first.")}`
      );
    }

    await updateVendorProfile(vendor.id, { stripe_account_id: stripeAccountId });

    return NextResponse.redirect(`${baseUrl}/onboard/step/5?connected=1`);
  } catch (err) {
    const redirectUri = getStripeConnectRedirectUri();
    console.error("[stripe-connect/callback]", err);

    let message = "Could not complete Stripe connection. Please try again.";
    if (err instanceof Error) {
      if (/redirect_uri/i.test(err.message)) {
        message = `Add this redirect URI in Stripe Dashboard → Connect → OAuth settings: ${redirectUri}`;
      } else if (
        /api[_ ]?key/i.test(err.message) ||
        /secret key/i.test(err.message) ||
        /no such api key/i.test(err.message)
      ) {
        message =
          "Stripe secret key is invalid or revoked. In Stripe Dashboard → Developers → API keys, copy a fresh test secret key (sk_test_...) into .env.development.local, then restart the dev server. Restricted keys (rk_) do not work.";
      } else {
        message = err.message;
      }
    }

    return NextResponse.redirect(`${baseUrl}${stripeConnectStep5Url(message)}`);
  }
}
