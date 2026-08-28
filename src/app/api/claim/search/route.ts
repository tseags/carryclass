import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryVendorsForListing } from "@/lib/vendors-db";
import { getListingClaimContacts } from "@/lib/claim-contacts";
import { findClaimOwnerBySlug } from "@/lib/claim-db";
import { getCountyDisplayName } from "@/data/counties";

export const runtime = "nodejs";

/**
 * Authenticated search of existing directory listings for claim.
 * Never returns raw email/phone — only whether channels are available.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const vendors = await queryVendorsForListing({ search: q }, "name");
  const limited = vendors.slice(0, 25);

  const results = await Promise.all(
    limited.map(async (v) => {
      const contacts = getListingClaimContacts(v);
      const owner = await findClaimOwnerBySlug(v.slug);
      return {
        slug: v.slug,
        name: v.name,
        city: v.city,
        county: v.county,
        countyLabel: getCountyDisplayName(v.county) || v.county,
        hasEmail: contacts.channels.includes("email"),
        hasPhone: contacts.channels.includes("phone"),
        claimed: Boolean(owner),
        claimedByYou: owner?.clerk_user_id === userId,
      };
    })
  );

  return NextResponse.json({ results });
}
