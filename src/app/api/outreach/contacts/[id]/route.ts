import { NextRequest, NextResponse } from "next/server";
import { getOutreachUserId, outreachNotFound } from "@/lib/outreach/auth";
import {
  isBookingTool,
  isWebsiteBookingOption,
  type BookingTool,
  type WebsiteBookingOption,
} from "@/lib/outreach/booking";
import {
  OutreachInputError,
  getOutreachContact,
  updateOutreachListing,
  updateOutreachStage,
} from "@/lib/outreach/contacts";
import { OUTREACH_STAGES, dayKeyToInstant, type OutreachStageId } from "@/lib/outreach/sequence";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!(await getOutreachUserId())) return outreachNotFound();
  const { id } = await ctx.params;
  const detail = await getOutreachContact(id);
  if (!detail) return outreachNotFound();
  return NextResponse.json(detail);
}

/**
 * Body: `{ stage?, nextActionDay?, websiteBooking?, bookingTool? }`
 * nextActionDay is "YYYY-MM-DD" or null to clear.
 * bookingTool is a known tool id or null to clear.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await getOutreachUserId())) return outreachNotFound();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    stage?: string;
    nextActionDay?: string | null;
    websiteBooking?: string;
    bookingTool?: string | null;
  };

  if (body.stage !== undefined && !OUTREACH_STAGES.includes(body.stage as OutreachStageId)) {
    return NextResponse.json({ error: "Unknown stage" }, { status: 400 });
  }
  let nextActionAt: Date | null | undefined;
  if (body.nextActionDay === null) nextActionAt = null;
  else if (typeof body.nextActionDay === "string") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.nextActionDay)) {
      return NextResponse.json({ error: "Date must be YYYY-MM-DD" }, { status: 400 });
    }
    nextActionAt = dayKeyToInstant(body.nextActionDay);
  }

  const listingPatch: {
    websiteBooking?: WebsiteBookingOption;
    bookingTool?: BookingTool | null;
  } = {};
  if (body.websiteBooking !== undefined) {
    if (!isWebsiteBookingOption(body.websiteBooking)) {
      return NextResponse.json({ error: "Unknown website booking option" }, { status: 400 });
    }
    listingPatch.websiteBooking = body.websiteBooking;
  }
  if (body.bookingTool !== undefined) {
    if (body.bookingTool !== null && !isBookingTool(body.bookingTool)) {
      return NextResponse.json({ error: "Unknown booking tool" }, { status: 400 });
    }
    listingPatch.bookingTool = body.bookingTool;
  }

  try {
    if (body.stage !== undefined || nextActionAt !== undefined) {
      await updateOutreachStage(id, {
        stage: body.stage as OutreachStageId | undefined,
        nextActionAt,
      });
    }
    if (listingPatch.websiteBooking !== undefined || listingPatch.bookingTool !== undefined) {
      await updateOutreachListing(id, listingPatch);
    }
  } catch (e) {
    if (e instanceof OutreachInputError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
  return NextResponse.json(await getOutreachContact(id));
}
