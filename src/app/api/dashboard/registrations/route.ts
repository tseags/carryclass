import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile } from "@/lib/onboarding-db";
import { getDashboardRegistrations } from "@/lib/dashboard-db";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const registrations = await getDashboardRegistrations(vendor.slug);
  return NextResponse.json({ registrations, count: registrations.length });
}
