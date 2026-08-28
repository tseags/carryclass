import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { getVendorBySlug } from "@/lib/vendors-db";
import {
  attachClaimedListing,
  checkClaimCode,
  markClaimVerified,
  type ClaimChannel,
} from "@/lib/claim-db";
import { VENDOR_ROLE } from "@/lib/auth/roles";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { verificationId?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const verificationId = (body.verificationId ?? "").trim();
  const code = (body.code ?? "").trim();
  if (!verificationId || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "verificationId and a 6-digit code are required." },
      { status: 400 }
    );
  }

  const result = await checkClaimCode(verificationId, userId, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const listing = await getVendorBySlug(result.verification.listing_slug);
  if (!listing) {
    return NextResponse.json(
      { error: "Listing no longer found." },
      { status: 404 }
    );
  }

  const user = await currentUser();
  try {
    await attachClaimedListing({
      clerkUserId: userId,
      listing,
      channel: result.verification.channel as ClaimChannel,
      userName:
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        undefined,
      userEmail: user?.emailAddresses[0]?.emailAddress,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not attach listing";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  await markClaimVerified(result.verification.id);

  if (user?.publicMetadata?.role !== VENDOR_ROLE) {
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { ...user?.publicMetadata, role: VENDOR_ROLE },
    });
  }

  return NextResponse.json({
    ok: true,
    slug: listing.slug,
    redirectTo: "/onboard",
  });
}
