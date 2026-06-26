import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getVendorProfile,
  updateCalendarClass,
  cancelCalendarClass,
} from "@/lib/onboarding-db";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const { id } = await params;
  const body = await req.json();

  const fields: {
    title?: string | null;
    start_time?: string;
    end_time?: string;
    max_students?: number | null;
    price?: number | null;
  } = {};

  if ("title" in body) fields.title = body.title || null;
  if ("start_time" in body) fields.start_time = body.start_time;
  if ("end_time" in body) fields.end_time = body.end_time;
  if ("max_students" in body) {
    fields.max_students =
      body.max_students === "" || body.max_students == null
        ? null
        : Number(body.max_students);
  }
  if ("price" in body) {
    fields.price =
      body.price === "" || body.price == null ? null : Number(body.price);
  }

  const updated = await updateCalendarClass(id, vendor.id, fields);
  if (!updated) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  return NextResponse.json({ class: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const { id } = await params;
  await cancelCalendarClass(id, vendor.id);

  return NextResponse.json({ ok: true });
}
