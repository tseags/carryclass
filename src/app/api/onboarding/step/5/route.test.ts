import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const getVendorProfileMock = vi.fn();
const advanceOnboardingStepMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/onboarding-db", () => ({
  getVendorProfile: getVendorProfileMock,
  advanceOnboardingStep: advanceOnboardingStepMock,
}));

function post() {
  return new NextRequest("http://localhost/api/onboarding/step/5", { method: "POST" });
}

describe("onboarding step 5 (Stripe Connect is optional)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_1" });
  });

  it("advances to step 6 without a connected Stripe account", async () => {
    getVendorProfileMock.mockResolvedValue({ id: "v1", stripe_account_id: null });
    const { POST } = await import("./route");

    const res = await POST(post());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, acceptsBookings: false });
    expect(advanceOnboardingStepMock).toHaveBeenCalledWith("v1", 6);
  });

  it("reports bookings enabled when Stripe is connected", async () => {
    getVendorProfileMock.mockResolvedValue({ id: "v1", stripe_account_id: "acct_123" });
    const { POST } = await import("./route");

    const res = await POST(post());

    await expect(res.json()).resolves.toEqual({ ok: true, acceptsBookings: true });
    expect(advanceOnboardingStepMock).toHaveBeenCalledWith("v1", 6);
  });

  it("401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { POST } = await import("./route");

    expect((await POST(post())).status).toBe(401);
    expect(advanceOnboardingStepMock).not.toHaveBeenCalled();
  });
});
