import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, upsertEmailTemplate } from "@/lib/onboarding-db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { type, subject, body, is_active, send_timing, send_mode, scheduled_at, from_email } =
    await req.json();
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  // Only persist fields that were actually provided so partial updates (e.g. a
  // toggle-only request) don't clobber existing content.
  const fields: Record<string, unknown> = {};
  if (subject !== undefined) fields.subject = subject;
  if (body !== undefined) fields.body = body;
  if (is_active !== undefined) fields.is_active = is_active;
  if (send_timing !== undefined) fields.send_timing = send_timing;
  if (send_mode !== undefined) fields.send_mode = send_mode;
  if (scheduled_at !== undefined) fields.scheduled_at = scheduled_at;
  if (from_email !== undefined) fields.from_email = from_email;

  await upsertEmailTemplate(vendor.id, type, fields);

  return NextResponse.json({ ok: true });
}
