import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type SaveBody = {
  vendorId?: string;
};

function unauthorized() {
  return NextResponse.json({ message: "Authentication required." }, { status: 401 });
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "20") || 20, 1), 50);

  const [totalCount, savedVendors] = await Promise.all([
    prisma.savedVendor.count({ where: { userId } }),
    prisma.savedVendor.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        vendor: {
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            county: true,
            state: true,
            priceInitial: true,
            priceRenewal: true,
          },
        },
      },
    }),
  ]);

  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

  return NextResponse.json({
    message: "Saved listings retrieved.",
    count: totalCount,
    page,
    pageSize,
    totalPages,
    savedVendors,
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const limit = checkRateLimit({
    key: `saved-vendors:save:${userId}`,
    limit: 25,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "Too many save attempts. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  let body: SaveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const vendorId = body.vendorId?.trim();
  if (!vendorId) {
    return NextResponse.json({ message: "vendorId is required." }, { status: 400 });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true },
  });
  if (!vendor) {
    return NextResponse.json({ message: "Vendor not found." }, { status: 404 });
  }

  try {
    const savedVendor = await prisma.savedVendor.create({
      data: { userId, vendorId },
      select: { id: true, vendorId: true, createdAt: true },
    });
    return NextResponse.json(
      { message: "Listing saved.", savedVendor },
      { status: 201 }
    );
  } catch (error) {
    const knownError = error as { code?: string } | null;
    if (knownError?.code === "P2002") {
      return NextResponse.json(
        { message: "Listing already saved." },
        { status: 409 }
      );
    }
    throw error;
  }
}
