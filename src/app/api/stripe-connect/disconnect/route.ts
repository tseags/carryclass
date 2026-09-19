import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getCalendarClasses,
  getClassTypes,
  getVendorProfile,
  updateVendorProfile,
} from "@/lib/onboarding-db";
import { syncPublishedVendorToLive } from "@/lib/publish-vendor-live";
import { revalidatePublishedVendorPaths } from "@/lib/publish-vendor-revalidate";
import { getStripeConnectConfigError } from "@/lib/stripe-connect-config";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Disconnect Stripe Connect for the signed-in instructor.
 * Clears `stripe_account_id` and re-syncs the live listing so Book Now turns off.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const stripeAccountId = vendor.stripe_account_id?.trim() || null;
  if (!stripeAccountId) {
    return NextResponse.json({ ok: true, disconnected: true });
  }

  const configError = getStripeConnectConfigError();
  if (!configError) {
    try {
      await getStripe().oauth.deauthorize({
        client_id: process.env.STRIPE_CLIENT_ID!.trim(),
        stripe_user_id: stripeAccountId,
      });
    } catch (error) {
      // Account may already be revoked on Stripe's side — still clear locally.
      console.error("[stripe-connect/disconnect] deauthorize failed:", error);
    }
  }

  await updateVendorProfile(vendor.id, { stripe_account_id: null });

  if (vendor.is_published) {
    try {
      const [classTypes, calendarClasses] = await Promise.all([
        getClassTypes(vendor.id),
        getCalendarClasses(vendor.id),
      ]);
      await syncPublishedVendorToLive({
        profile: { ...vendor, stripe_account_id: null },
        classTypes,
        calendarClasses,
      });
      revalidatePublishedVendorPaths(vendor.slug);
    } catch (syncError) {
      console.error("[stripe-connect/disconnect] bookings re-sync failed:", syncError);
      return NextResponse.json(
        {
          error:
            "Stripe disconnected, but we could not turn off bookings on your listing. Try publishing again or contact support.",
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ ok: true, disconnected: true });
}
