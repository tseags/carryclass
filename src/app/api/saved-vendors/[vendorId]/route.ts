import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ message: "Authentication required." }, { status: 401 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const limit = checkRateLimit({
    key: `saved-vendors:unsave:${userId}`,
    limit: 25,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "Too many remove attempts. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  const { vendorId: vendorIdRaw } = await params;
  const vendorId = vendorIdRaw.trim();
  if (!vendorId) {
    return NextResponse.json({ message: "vendorId is required." }, { status: 400 });
  }

  const deleted = await prisma.savedVendor.deleteMany({
    where: { userId, vendorId },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ message: "Listing was not saved." }, { status: 404 });
  }

  return NextResponse.json({ message: "Listing removed." }, { status: 200 });
}
