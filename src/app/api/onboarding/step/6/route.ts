import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, updateVendorProfile } from "@/lib/onboarding-db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { publish } = await req.json();

  if (publish) {
    await updateVendorProfile(vendor.id, {
      is_published: true,
      onboarding_step: 7,
    });
  }

  return NextResponse.json({ ok: true });
}
