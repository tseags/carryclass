import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const getVendorProfileMock = vi.fn();
const updateVendorProfileMock = vi.fn();
const advanceOnboardingStepMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/onboarding-db", () => ({
  getVendorProfile: getVendorProfileMock,
  updateVendorProfile: updateVendorProfileMock,
  advanceOnboardingStep: advanceOnboardingStepMock,
}));

function post(body: unknown) {
  return new NextRequest("http://localhost/api/onboarding/step/1", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("onboarding step 1 what to bring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_1" });
    getVendorProfileMock.mockResolvedValue({
      id: "v1",
      slug: "acme-training",
      canonical_name: "Acme",
    });
  });

  it("saves the packing list with the profile and refreshes the live page", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      post({
        name: "Acme",
        whatToBring: [" holster ", "Notebook"],
        requireApplicationAck: true,
      })
    );

    expect(res.status).toBe(200);
    expect(updateVendorProfileMock).toHaveBeenCalledWith(
      "v1",
      expect.objectContaining({
        what_to_bring: ["Holster", "Notebook"],
        require_application_ack: true,
      })
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/instructors/acme-training");
    expect(advanceOnboardingStepMock).toHaveBeenCalledWith("v1", 2);
  });

  it("rejects an empty packing list", async () => {
    const { POST } = await import("./route");
    const res = await POST(post({ whatToBring: ["  "] }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ field: "whatToBring" });
    expect(updateVendorProfileMock).not.toHaveBeenCalled();
  });
});
