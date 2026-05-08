import { prisma } from "@/lib/db";

const MIN_RATING = 1;
const MAX_RATING = 5;
const MAX_AUTHOR_NAME_LENGTH = 80;
const MAX_BODY_LENGTH = 2000;

export type VendorReviewStatus = "pending" | "approved";

export type ApprovedVendorReview = {
  id: string;
  vendorId: string;
  rating: number;
  authorName: string;
  body: string;
  createdAt: string;
};

export type CreateVendorReviewInput = {
  vendorId: string;
  rating: number;
  authorName: string;
  body: string;
};

type ValidationResult =
  | { ok: true; value: CreateVendorReviewInput }
  | { ok: false; field: "vendorId" | "rating" | "authorName" | "body"; message: string };

function isMissingVendorReviewsTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeCode = "code" in error ? (error as { code?: unknown }).code : undefined;
  if (maybeCode === "P2021") return true;
  const maybeMessage = "message" in error ? (error as { message?: unknown }).message : undefined;
  return typeof maybeMessage === "string" && maybeMessage.includes("VendorReview");
}

export function validateCreateVendorReviewInput(
  input: Partial<CreateVendorReviewInput>
): ValidationResult {
  const vendorId = typeof input.vendorId === "string" ? input.vendorId.trim() : "";
  if (!vendorId) {
    return { ok: false, field: "vendorId", message: "Vendor is required." };
  }

  const rating =
    typeof input.rating === "number"
      ? input.rating
      : typeof input.rating === "string"
        ? Number.parseInt(input.rating, 10)
        : Number.NaN;

  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    return { ok: false, field: "rating", message: "Rating must be a whole number between 1 and 5." };
  }

  const authorName = typeof input.authorName === "string" ? input.authorName.trim() : "";
  if (!authorName) {
    return { ok: false, field: "authorName", message: "Name is required." };
  }
  if (authorName.length > MAX_AUTHOR_NAME_LENGTH) {
    return {
      ok: false,
      field: "authorName",
      message: `Name must be ${MAX_AUTHOR_NAME_LENGTH} characters or fewer.`,
    };
  }

  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!body) {
    return { ok: false, field: "body", message: "Review text is required." };
  }
  if (body.length > MAX_BODY_LENGTH) {
    return {
      ok: false,
      field: "body",
      message: `Review text must be ${MAX_BODY_LENGTH} characters or fewer.`,
    };
  }

  return {
    ok: true,
    value: {
      vendorId,
      rating,
      authorName,
      body,
    },
  };
}

export async function getApprovedVendorReviews(vendorId: string): Promise<ApprovedVendorReview[]> {
  if (!vendorId.trim()) return [];

  let rows: {
    id: string;
    vendorId: string;
    rating: number;
    authorName: string;
    body: string;
    createdAt: Date;
  }[];
  try {
    rows = await prisma.vendorReview.findMany({
      where: {
        vendorId,
        status: "APPROVED",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        vendorId: true,
        rating: true,
        authorName: true,
        body: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (isMissingVendorReviewsTableError(error)) {
      return [];
    }
    throw error;
  }

  return rows.map((row) => ({
    id: row.id,
    vendorId: row.vendorId,
    rating: row.rating,
    authorName: row.authorName,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  }));
}

export type VendorListingReviewStats = {
  averageRating: number;
  count: number;
};

/**
 * One query for listing pages: approved review count + average per vendor.
 * Vendors with no approved reviews are omitted from the returned map.
 */
export async function getApprovedReviewStatsByVendorIds(
  vendorIds: string[]
): Promise<Map<string, VendorListingReviewStats>> {
  const unique = [...new Set(vendorIds.filter((id) => id.trim()))];
  if (unique.length === 0) return new Map();

  try {
    const grouped = await prisma.vendorReview.groupBy({
      by: ["vendorId"],
      where: {
        vendorId: { in: unique },
        status: "APPROVED",
      },
      _count: { _all: true },
      _avg: { rating: true },
    });

    const map = new Map<string, VendorListingReviewStats>();
    for (const row of grouped) {
      const count = row._count._all;
      const avg = row._avg.rating;
      if (count < 1 || avg == null) continue;
      map.set(row.vendorId, { count, averageRating: avg });
    }
    return map;
  } catch (error) {
    if (isMissingVendorReviewsTableError(error)) {
      return new Map();
    }
    throw error;
  }
}

export async function createVendorReview(input: Partial<CreateVendorReviewInput>) {
  const validated = validateCreateVendorReviewInput(input);
  if (!validated.ok) {
    return validated;
  }

  let created: {
    id: string;
    vendorId: string;
    rating: number;
    authorName: string;
    body: string;
    status: "PENDING" | "APPROVED";
    createdAt: Date;
  };
  try {
    created = await prisma.vendorReview.create({
      data: {
        vendorId: validated.value.vendorId,
        rating: validated.value.rating,
        authorName: validated.value.authorName,
        body: validated.value.body,
        status: "PENDING",
      },
      select: {
        id: true,
        vendorId: true,
        rating: true,
        authorName: true,
        body: true,
        status: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (isMissingVendorReviewsTableError(error)) {
      return {
        ok: false as const,
        field: "body" as const,
        message: "Reviews are temporarily unavailable. Please try again shortly.",
      };
    }
    throw error;
  }

  return {
    ok: true as const,
    review: {
      id: created.id,
      vendorId: created.vendorId,
      rating: created.rating,
      authorName: created.authorName,
      body: created.body,
      status: created.status.toLowerCase() as VendorReviewStatus,
      createdAt: created.createdAt.toISOString(),
    },
  };
}

export const vendorReviewLimits = {
  minRating: MIN_RATING,
  maxRating: MAX_RATING,
  maxAuthorNameLength: MAX_AUTHOR_NAME_LENGTH,
  maxBodyLength: MAX_BODY_LENGTH,
} as const;
