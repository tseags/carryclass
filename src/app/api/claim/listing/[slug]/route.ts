import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorBySlug } from "@/lib/vendors-db";
import { getListingClaimContacts } from "@/lib/claim-contacts";
import { findClaimOwnerBySlug } from "@/lib/claim-db";
import { isClaimEmailConfigured, isTwilioConfigured } from "@/lib/claim-send";
import { getCountyDisplayName } from "@/data/counties";

export const runtime = "nodejs";

/** Load a single listing's claimable channels (masked contacts only). */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug: raw } = await ctx.params;
  const slug = decodeURIComponent(raw).trim();
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const listing = await getVendorBySlug(slug);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const contacts = getListingClaimContacts(listing);
  const owner = await findClaimOwnerBySlug(slug);

  return NextResponse.json({
    slug: listing.slug,
    name: listing.name,
    city: listing.city,
    county: listing.county,
    countyLabel: getCountyDisplayName(listing.county) || listing.county,
    claimed: Boolean(owner),
    claimedByYou: owner?.clerk_user_id === userId,
    emailConfigured: isClaimEmailConfigured(),
    phoneConfigured: isTwilioConfigured(),
    channels: {
      email: contacts.email
        ? {
            available: true,
            masked: contacts.emailMasked,
            ready: isClaimEmailConfigured(),
          }
        : { available: false, masked: null, ready: false },
      phone: contacts.phoneE164
        ? {
            available: true,
            masked: contacts.phoneMasked,
            ready: isTwilioConfigured(),
          }
        : { available: false, masked: null, ready: false },
    },
  });
}
