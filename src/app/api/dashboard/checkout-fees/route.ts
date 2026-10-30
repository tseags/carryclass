import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { normalizeFeeDrafts } from "@/lib/instructor-catalog";
import {
  getCheckoutFees,
  getClassTypes,
  getVendorProfile,
  saveCheckoutFees,
} from "@/lib/onboarding-db";
import { revalidatePublishedVendorPaths } from "@/lib/publish-vendor-revalidate";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const classTypes = await getClassTypes(vendor.id);
  const allowed = new Set(classTypes.map((type) => type.class_type));
  const normalized = normalizeFeeDrafts(body?.checkoutFees, allowed);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  try {
    const fees = await saveCheckoutFees(vendor.id, normalized.fees);
    if (vendor.is_published) revalidatePublishedVendorPaths(vendor.slug);
    return NextResponse.json({ ok: true, fees });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save fees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  const fees = await getCheckoutFees(vendor.id);
  return NextResponse.json({ fees });
}
