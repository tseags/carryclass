import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { isPrismaConnectionError } from "@/lib/prisma-connection-error";

export type SavedVendorListItem = {
  id: string;
  vendorId: string;
  createdAt: string;
  vendor: {
    id: string;
    slug: string;
    name: string;
    city: string;
    county: string;
    state: string;
    priceInitial: number | null;
    priceRenewal: number | null;
  };
};

type SavedListingsPage = {
  items: SavedVendorListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function isMissingSavedVendorTable(error: unknown): boolean {
  const prismaError = error as { code?: string; meta?: { table?: string; modelName?: string } };
  return (
    prismaError?.code === "P2021" &&
    (prismaError?.meta?.table === "public.SavedVendor" ||
      prismaError?.meta?.modelName === "SavedVendor")
  );
}

async function getMaybeUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUserSavedVendorIds(vendorIds?: string[]): Promise<string[]> {
  const userId = await getMaybeUserId();
  if (!userId) return [];

  let rows: Array<{ vendorId: string }>;
  try {
    rows = await prisma.savedVendor.findMany({
      where: {
        userId,
        ...(vendorIds?.length ? { vendorId: { in: vendorIds } } : {}),
      },
      select: { vendorId: true },
    });
  } catch (error) {
    if (isMissingSavedVendorTable(error) || isPrismaConnectionError(error)) {
      return [];
    }
    throw error;
  }

  return rows.map((row) => row.vendorId);
}

export async function getCurrentUserSavedListings(): Promise<SavedVendorListItem[]> {
  const userId = await getMaybeUserId();
  if (!userId) return [];

  let rows;
  try {
    rows = await prisma.savedVendor.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
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
    });
  } catch (error) {
    if (isMissingSavedVendorTable(error) || isPrismaConnectionError(error)) {
      return [];
    }
    throw error;
  }

  return rows.map((row) => ({
    id: row.id,
    vendorId: row.vendorId,
    createdAt: row.createdAt.toISOString(),
    vendor: row.vendor,
  }));
}

export async function getCurrentUserSavedListingsPage(
  page: number,
  pageSize: number
): Promise<SavedListingsPage> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 50) : 12;

  const userId = await getMaybeUserId();
  if (!userId) {
    return { items: [], totalCount: 0, page: safePage, pageSize: safePageSize, totalPages: 0 };
  }

  let totalCount: number;
  let rows;
  try {
    [totalCount, rows] = await Promise.all([
      prisma.savedVendor.count({ where: { userId } }),
      prisma.savedVendor.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
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
  } catch (error) {
    if (isMissingSavedVendorTable(error) || isPrismaConnectionError(error)) {
      return { items: [], totalCount: 0, page: safePage, pageSize: safePageSize, totalPages: 0 };
    }
    throw error;
  }

  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / safePageSize);

  return {
    items: rows.map((row) => ({
      id: row.id,
      vendorId: row.vendorId,
      createdAt: row.createdAt.toISOString(),
      vendor: row.vendor,
    })),
    totalCount,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}
