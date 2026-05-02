import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type StatusBody = {
  vendorIds?: string[];
};

function unauthorized() {
  return NextResponse.json({ message: "Authentication required." }, { status: 401 });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  let body: StatusBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const vendorIds = Array.isArray(body.vendorIds)
    ? body.vendorIds.map((id) => id.trim()).filter(Boolean)
    : [];

  if (vendorIds.length === 0) {
    return NextResponse.json({ message: "vendorIds must be a non-empty array." }, { status: 400 });
  }

  const rows = await prisma.savedVendor.findMany({
    where: {
      userId,
      vendorId: { in: vendorIds },
    },
    select: { vendorId: true },
  });

  return NextResponse.json({
    message: "Saved status retrieved.",
    savedVendorIds: rows.map((row) => row.vendorId),
  });
}
