import { describe, expect, it, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const savedVendorFindManyMock = vi.fn();
const savedVendorCreateMock = vi.fn();
const savedVendorCountMock = vi.fn();
const vendorFindUniqueMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    savedVendor: {
      findMany: savedVendorFindManyMock,
      create: savedVendorCreateMock,
      count: savedVendorCountMock,
    },
    vendor: {
      findUnique: vendorFindUniqueMock,
    },
  },
}));

describe("saved-vendors route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated on save", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/saved-vendors", {
        method: "POST",
        body: JSON.stringify({ vendorId: "vendor_1" }),
      })
    );

    expect(res.status).toBe(401);
  });

  it("returns 409 for duplicate saves", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    vendorFindUniqueMock.mockResolvedValue({ id: "vendor_1" });
    savedVendorCreateMock.mockRejectedValue({ code: "P2002" });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/saved-vendors", {
        method: "POST",
        body: JSON.stringify({ vendorId: "vendor_1" }),
      })
    );

    expect(res.status).toBe(409);
  });

  it("returns saved listings for current user", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    savedVendorCountMock.mockResolvedValue(1);
    savedVendorFindManyMock.mockResolvedValue([
      {
        id: "sv_1",
        userId: "user_1",
        vendorId: "vendor_1",
        createdAt: new Date(),
        vendor: {
          id: "vendor_1",
          slug: "acme",
          name: "Acme",
          city: "San Diego",
          county: "san-diego",
          state: "CA",
          priceInitial: 199,
          priceRenewal: 99,
        },
      },
    ]);
    const { GET } = await import("./route");

    const res = await GET(new Request("http://localhost/api/saved-vendors"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.savedVendors[0].vendor.slug).toBe("acme");
  });
});
