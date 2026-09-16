import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, updateVendorProfile, advanceOnboardingStep } from "@/lib/onboarding-db";
import { normalizeCountiesServed } from "@/data/counties";
import { parseWebsiteInput } from "@/lib/vendor-website-url";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const body = await req.json();

  const websiteResult = parseWebsiteInput(body.website);
  if (!websiteResult.ok) {
    return NextResponse.json({ error: websiteResult.error }, { status: 400 });
  }

  await updateVendorProfile(vendor.id, {
    name: body.name ?? null,
    canonical_name: body.name ?? vendor.canonical_name,
    phone: body.phone ?? null,
    email: body.email ?? null,
    website: websiteResult.value,
    address: body.address ?? null,
    county: body.county ?? null,
    counties_served: normalizeCountiesServed(body.countiesServed),
    bio: body.bio ?? null,
    badge_tags: body.badgeTags ?? null,
    photo_url: body.photoUrl ?? null,
    gallery_urls: body.galleryUrls ?? null,
  });

  await advanceOnboardingStep(vendor.id, 2);

  return NextResponse.json({ ok: true });
}
