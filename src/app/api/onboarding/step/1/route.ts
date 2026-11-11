import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, updateVendorProfile, advanceOnboardingStep } from "@/lib/onboarding-db";
import { normalizeCountiesServed } from "@/data/counties";
import { normalizeCountyContacts } from "@/lib/county-contacts";
import { parseWebsiteInput } from "@/lib/vendor-website-url";
import { normalizeWhatToBring } from "@/lib/what-to-bring";

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

  let whatToBring: string[] | undefined;
  if (body.whatToBring !== undefined) {
    const normalized = normalizeWhatToBring(body.whatToBring);
    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error, field: "whatToBring" }, { status: 400 });
    }
    whatToBring = normalized.items;
  }

  const countiesServed = normalizeCountiesServed(body.countiesServed);
  const countyContactsNormalized = normalizeCountyContacts(
    body.countyContacts,
    countiesServed
  );
  if (!countyContactsNormalized.ok) {
    return NextResponse.json(
      { error: countyContactsNormalized.error, field: "countyContacts" },
      { status: 400 }
    );
  }

  await updateVendorProfile(vendor.id, {
    name: body.name ?? null,
    canonical_name: body.name ?? vendor.canonical_name,
    phone: body.phone ?? null,
    email: body.email ?? null,
    website: websiteResult.value,
    address: body.address ?? null,
    county: body.county ?? null,
    counties_served: countiesServed,
    county_contacts: countyContactsNormalized.contacts,
    bio: body.bio ?? null,
    badge_tags: body.badgeTags ?? null,
    photo_url: body.photoUrl ?? null,
    gallery_urls: body.galleryUrls ?? null,
    ...(whatToBring ? { what_to_bring: whatToBring } : {}),
  });

  await advanceOnboardingStep(vendor.id, 2);

  const slug = vendor.slug?.trim();
  if (slug && whatToBring) {
    revalidatePath(`/instructors/${slug}`);
  }

  return NextResponse.json({
    ok: true,
    whatToBring: whatToBring ?? null,
    countyContacts: countyContactsNormalized.contacts,
  });
}
