import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getVendorProfile,
  createCalendarClass,
  ensureClassTypeActive,
  getClassTypes,
  normalizeGunPricing,
} from "@/lib/onboarding-db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const body = await req.json();

  if (!body.start_time || !body.end_time) {
    return NextResponse.json(
      { error: "Date and start time are required." },
      { status: 400 }
    );
  }

  try {
    const price =
      body.price === "" || body.price == null ? null : Number(body.price);

    const created = await createCalendarClass(vendor.id, {
      class_type: body.class_type || null,
      title: body.title || null,
      description: body.description || null,
      location: body.location || null,
      range_location: body.range_location || null,
      start_time: body.start_time,
      end_time: body.end_time,
      max_students:
        body.max_students === "" || body.max_students == null
          ? null
          : Number(body.max_students),
      price,
      gun_pricing: normalizeGunPricing(body.gun_pricing),
      is_recurring: Boolean(body.is_recurring),
      recurrence_rule: body.recurrence_rule || null,
    });

    // Make sure the chosen class type is offered + active on the profile, so an
    // instructor can add any type even if they didn't enable it during onboarding.
    if (body.class_type) {
      // Pricing for add_a_gun lives in gun_pricing, so seed its type price at 0.
      const seedPrice =
        body.class_type === "add_a_gun" ? 0 : price ?? 0;
      await ensureClassTypeActive(vendor.id, body.class_type, seedPrice);
    }

    const classTypes = await getClassTypes(vendor.id);

    return NextResponse.json({ class: created, classTypes }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to add class.";
    console.error("[api/dashboard/classes] create failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
