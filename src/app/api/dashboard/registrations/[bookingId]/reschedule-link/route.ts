import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile } from "@/lib/onboarding-db";
import { createRescheduleLink } from "@/lib/reschedule-booking";
import { sendRescheduleInviteEmail } from "@/lib/reschedule-emails";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ bookingId: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const { bookingId } = await context.params;
  if (!bookingId?.trim()) {
    return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
  }

  const created = await createRescheduleLink({
    bookingId: bookingId.trim(),
    vendorSlug: vendor.slug,
    createdByUserId: userId,
  });
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: created.status });
  }

  try {
    const sent = await sendRescheduleInviteEmail({
      booking: created.booking,
      rawToken: created.rawToken,
      expiresAt: created.expiresAt,
    });
    if (!sent) {
      return NextResponse.json(
        {
          error:
            "Could not send the email (email delivery is not configured). Try again later.",
        },
        { status: 503 }
      );
    }
  } catch (err) {
    console.error("[reschedule-link] invite email failed", err);
    return NextResponse.json(
      { error: "Failed to send reschedule email. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    sentTo: created.sentTo,
    expiresAt: created.expiresAt.toISOString(),
  });
}
