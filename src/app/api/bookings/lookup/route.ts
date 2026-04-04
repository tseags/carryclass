import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Row = {
  vendorName: string;
  vendorSlug: string;
  classTitle: string | null;
  startsAt: string;
  timezone: string;
  customerName: string;
  customerEmail: string;
  classAmountCents: number;
  serviceFeeCents: number;
  totalAmountCents: number;
  status: string;
};

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session_id" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    include: {
      vendor: { select: { name: true, slug: true } },
      classSession: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found yet." }, { status: 404 });
  }

  const payload: Row = {
    vendorName: booking.vendor.name,
    vendorSlug: booking.vendor.slug,
    classTitle: booking.classSession.title,
    startsAt: booking.classSession.startsAt.toISOString(),
    timezone: booking.classSession.timezone,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    classAmountCents: booking.classAmountCents,
    serviceFeeCents: booking.serviceFeeCents,
    totalAmountCents: booking.totalAmountCents,
    status: booking.status,
  };

  return NextResponse.json(payload);
}
