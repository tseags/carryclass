import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorBySlug } from "@/lib/vendors-db";
import { getListingClaimContacts } from "@/lib/claim-contacts";
import {
  createClaimVerification,
  findClaimOwnerBySlug,
  generateClaimCode,
  recentStartTooSoon,
  type ClaimChannel,
} from "@/lib/claim-db";
import {
  isClaimEmailConfigured,
  isTwilioConfigured,
  sendClaimEmailCode,
  sendClaimSmsCode,
} from "@/lib/claim-send";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { slug?: string; channel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  const channel = (body.channel ?? "").trim() as ClaimChannel;
  if (!slug || (channel !== "email" && channel !== "phone")) {
    return NextResponse.json(
      { error: "slug and channel (email|phone) are required." },
      { status: 400 }
    );
  }

  const listing = await getVendorBySlug(slug);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const owner = await findClaimOwnerBySlug(slug);
  if (owner && owner.clerk_user_id !== userId) {
    return NextResponse.json(
      { error: "This listing has already been claimed." },
      { status: 409 }
    );
  }
  if (owner?.clerk_user_id === userId) {
    return NextResponse.json({
      alreadyClaimed: true,
      redirectTo: "/onboard",
    });
  }

  const contacts = getListingClaimContacts(listing);
  if (!contacts.channels.includes(channel)) {
    return NextResponse.json(
      {
        error:
          channel === "email"
            ? "This listing has no email on file from the sheriff/directory record."
            : "This listing has no phone on file from the sheriff/directory record.",
      },
      { status: 400 }
    );
  }

  if (channel === "email" && !isClaimEmailConfigured()) {
    return NextResponse.json(
      { error: "Email verification is not configured (RESEND_API_KEY)." },
      { status: 503 }
    );
  }
  if (channel === "phone" && !isTwilioConfigured()) {
    return NextResponse.json(
      {
        error:
          "Phone verification is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.",
      },
      { status: 503 }
    );
  }

  if (await recentStartTooSoon(userId, slug, channel)) {
    return NextResponse.json(
      { error: "Please wait a minute before requesting another code." },
      { status: 429 }
    );
  }

  // Destination ALWAYS from DB contacts — never from the request body.
  const destinationNormalized =
    channel === "email" ? contacts.email! : contacts.phoneE164!;
  const destinationMasked =
    channel === "email" ? contacts.emailMasked! : contacts.phoneMasked!;

  const code = generateClaimCode();

  try {
    if (channel === "email") {
      await sendClaimEmailCode({
        to: contacts.email!,
        code,
        listingName: listing.name,
      });
    } else {
      await sendClaimSmsCode({
        toE164: contacts.phoneE164!,
        code,
        listingName: listing.name,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send code";
    console.error("[claim/start] send failed", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const verification = await createClaimVerification({
    clerkUserId: userId,
    listing,
    channel,
    destinationNormalized,
    destinationMasked,
    code,
  });

  return NextResponse.json({
    verificationId: verification.id,
    channel,
    destinationMasked,
    expiresAt: verification.expires_at,
    listingName: listing.name,
  });
}
