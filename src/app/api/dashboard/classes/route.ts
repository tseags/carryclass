import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isCustomClassKey } from "@/lib/instructor-catalog";
import {
  getVendorProfile,
  createCalendarClass,
  ensureClassTypeActive,
  getClassTypes,
  normalizeDayIndex,
  normalizeGunPricing,
} from "@/lib/onboarding-db";
import { syncLiveScheduleForPublishedVendor } from "@/lib/publish-vendor-live";

export const runtime = "nodejs";

type DayPayload = {
  start_time?: string;
  end_time?: string;
  day_index?: unknown;
  title?: string | null;
};

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

  const extraDays: DayPayload[] = Array.isArray(body.days) ? body.days : [];
  const dayRows: DayPayload[] =
    extraDays.length > 0
      ? extraDays
      : [{ start_time: body.start_time, end_time: body.end_time, day_index: body.day_index, title: body.title }];

  if (dayRows.some((row) => !row.start_time || !row.end_time)) {
    return NextResponse.json(
      { error: "Date and start time are required." },
      { status: 400 }
    );
  }

  try {
    const price =
      body.price === "" || body.price == null ? null : Number(body.price);

    if (body.class_type && isCustomClassKey(body.class_type)) {
      const types = await getClassTypes(vendor.id);
      const custom = types.find((type) => type.class_type === body.class_type);
      if (!custom?.is_active) {
        return NextResponse.json(
          { error: "Turn this class on before adding it to the schedule." },
          { status: 400 }
        );
      }
    }

    const createdRows = [];
    for (const row of dayRows) {
      const created = await createCalendarClass(vendor.id, {
        class_type: body.class_type || null,
        title: row.title || body.title || null,
        description: body.description || null,
        location: body.location || null,
        range_location: body.range_location || null,
        start_time: row.start_time!,
        end_time: row.end_time!,
        max_students:
          body.max_students === "" || body.max_students == null
            ? null
            : Number(body.max_students),
        price,
        gun_pricing: normalizeGunPricing(body.gun_pricing),
        is_recurring: Boolean(body.is_recurring),
        recurrence_rule: body.recurrence_rule || null,
        day_index: normalizeDayIndex(row.day_index ?? body.day_index),
      });
      createdRows.push(created);
    }

    if (body.class_type && !isCustomClassKey(body.class_type)) {
      // Pricing for add_a_gun lives in gun_pricing, so seed its type price at 0.
      const seedPrice =
        body.class_type === "add_a_gun" ? 0 : price ?? 0;
      await ensureClassTypeActive(vendor.id, body.class_type, seedPrice);
    }

    const classTypes = await getClassTypes(vendor.id);

    try {
      await syncLiveScheduleForPublishedVendor(vendor);
    } catch (syncError) {
      console.error(
        "[api/dashboard/classes] live schedule sync failed after create:",
        syncError
      );
    }

    return NextResponse.json(
      {
        class: createdRows[0],
        classes: createdRows,
        classTypes,
      },
      { status: 201 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to add class.";
    console.error("[api/dashboard/classes] create failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
