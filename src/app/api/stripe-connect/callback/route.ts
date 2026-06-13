import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { getVendorProfile, updateVendorProfile } from "@/lib/onboarding-db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/onboard/step/5?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || state !== userId) {
    return NextResponse.redirect(`${baseUrl}/onboard/step/5?error=invalid_state`);
  }

  const response = await stripe.oauth.token({
    grant_type: "authorization_code",
    code,
  });

  const stripeAccountId = response.stripe_user_id;
  if (!stripeAccountId) {
    return NextResponse.redirect(
      `${baseUrl}/onboard/step/5?error=no_account_id`
    );
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor) {
    return NextResponse.redirect(`${baseUrl}/onboard/step/5?error=no_vendor`);
  }

  await updateVendorProfile(vendor.id, { stripe_account_id: stripeAccountId });

  return NextResponse.redirect(`${baseUrl}/onboard/step/5?connected=1`);
}
