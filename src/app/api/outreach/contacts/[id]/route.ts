import { NextRequest, NextResponse } from "next/server";
import { getOutreachUserId, outreachNotFound } from "@/lib/outreach/auth";
import {
  OutreachInputError,
  getOutreachContact,
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

/** Body: `{ stage?, nextActionDay? }` where nextActionDay is "YYYY-MM-DD" or null to clear. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await getOutreachUserId())) return outreachNotFound();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    stage?: string;
    nextActionDay?: string | null;
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

  try {
    await updateOutreachStage(id, {
      stage: body.stage as OutreachStageId | undefined,
      nextActionAt,
    });
  } catch (e) {
    if (e instanceof OutreachInputError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
  return NextResponse.json(await getOutreachContact(id));
}
