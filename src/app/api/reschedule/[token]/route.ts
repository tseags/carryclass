import { NextResponse } from "next/server";
import {
  applyRescheduleWithToken,
  lookupRescheduleToken,
  type RescheduleSessionSummary,
} from "@/lib/reschedule-booking";
import { sendRescheduleConfirmationEmails } from "@/lib/reschedule-emails";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

function serializeSession(session: RescheduleSessionSummary) {
  return {
    id: session.id,
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt?.toISOString() ?? null,
    title: session.title,
    classType: session.classType,
    priceCents: session.priceCents,
    spotsLeft: session.spotsLeft,
    timezone: session.timezone,
  };
}

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  const rawToken = decodeURIComponent(token ?? "").trim();
  if (!rawToken) {
    return NextResponse.json({ error: "invalid", message: "Missing link." }, { status: 400 });
  }

  const lookup = await lookupRescheduleToken(rawToken);
  if (!lookup.ok) {
    const status = lookup.error === "invalid" ? 404 : 410;
    return NextResponse.json(
      { error: lookup.error, message: lookup.message },
      { status }
    );
  }

  const { booking, eligibleSessions } = lookup;
  return NextResponse.json({
    booking: {
      id: booking.id,
      confirmationCode: booking.confirmationCode,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      vendorName: booking.vendorName,
      vendorSlug: booking.vendorSlug,
      currentSession: serializeSession(booking.currentSession),
    },
    eligibleSessions: eligibleSessions.map(serializeSession),
  });
}

export async function POST(req: Request, context: RouteContext) {
  const { token } = await context.params;
  const rawToken = decodeURIComponent(token ?? "").trim();
  if (!rawToken) {
    return NextResponse.json({ error: "invalid", message: "Missing link." }, { status: 400 });
  }

  let body: { classSessionId?: string };
  try {
    body = (await req.json()) as { classSessionId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await applyRescheduleWithToken({
    rawToken,
    classSessionId: body.classSessionId ?? "",
  });

  if (!result.ok) {
    const status =
      result.code === "token"
        ? 410
        : result.code === "full" || result.code === "invalid_session"
          ? 409
          : 404;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  try {
    await sendRescheduleConfirmationEmails({
      booking: result.booking,
      previousSession: result.previousSession,
      newSession: result.newSession,
    });
  } catch (err) {
    console.error("[reschedule] confirmation emails failed", err);
  }

  return NextResponse.json({
    ok: true,
    booking: {
      id: result.booking.id,
      confirmationCode: result.booking.confirmationCode,
      customerName: result.booking.customerName,
      vendorName: result.booking.vendorName,
      currentSession: serializeSession(result.newSession),
      previousSession: serializeSession(result.previousSession),
    },
  });
}
