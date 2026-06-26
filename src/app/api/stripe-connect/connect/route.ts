import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getStripeConnectConfigError,
  getStripeConnectRedirectUri,
  stripeConnectStep5Url,
} from "@/lib/stripe-connect-config";
import { beginStripeConnectOAuth } from "@/lib/stripe-connect-oauth";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in?intent=vendor", req.url));
  }

  const configError = getStripeConnectConfigError();
  if (configError) {
    return NextResponse.redirect(new URL(stripeConnectStep5Url(configError), req.url));
  }

  const clientId = process.env.STRIPE_CLIENT_ID!.trim();
  const redirectUri = getStripeConnectRedirectUri();
  const state = await beginStripeConnectOAuth(userId);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(
    `https://connect.stripe.com/oauth/authorize?${params.toString()}`
  );
}
