import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, updateVendorProfile, advanceOnboardingStep } from "@/lib/onboarding-db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const body = await req.json();

  await updateVendorProfile(vendor.id, {
    name: body.name ?? null,
    canonical_name: body.name ?? vendor.canonical_name,
    phone: body.phone ?? null,
    email: body.email ?? null,
    website: body.website ?? null,
    address: body.address ?? null,
    county: body.county ?? null,
    bio: body.bio ?? null,
    badge_tags: body.badgeTags ?? null,
    photo_url: body.photoUrl ?? null,
    gallery_urls: body.galleryUrls ?? null,
  });

  await advanceOnboardingStep(vendor.id, 2);

  return NextResponse.json({ ok: true });
}
