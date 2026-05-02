import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    savedVendor: {
      deleteMany: deleteManyMock,
    },
  },
}));

describe("unsave route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { DELETE } = await import("./route");

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ vendorId: "vendor_1" }),
    });

    expect(res.status).toBe(401);
  });

  it("removes saved listing for authenticated user", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    deleteManyMock.mockResolvedValue({ count: 1 });
    const { DELETE } = await import("./route");

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ vendorId: "vendor_1" }),
    });

    expect(res.status).toBe(200);
  });
});
