import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, upsertClassTypes, advanceOnboardingStep } from "@/lib/onboarding-db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { classTypes } = await req.json();
  if (!classTypes?.length) {
    return NextResponse.json({ error: "At least one class type required" }, { status: 400 });
  }

  await upsertClassTypes(vendor.id, classTypes);
  await advanceOnboardingStep(vendor.id, 3);

  return NextResponse.json({ ok: true });
}
