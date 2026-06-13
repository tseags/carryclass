import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, upsertEmailTemplate } from "@/lib/onboarding-db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { type, subject, body, is_active, send_timing } = await req.json();
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  await upsertEmailTemplate(vendor.id, type, { subject, body, is_active, send_timing });

  return NextResponse.json({ ok: true });
}
