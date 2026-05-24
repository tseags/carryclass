import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaveHeartButton } from "@/components/SaveHeartButton";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const useUserMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  usePathname: () => "/instructors",
  useSearchParams: () => ({ toString: () => "" }),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => useUserMock(),
}));

describe("SaveHeartButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects signed-out users to sign in", () => {
    useUserMock.mockReturnValue({ isSignedIn: false });

    render(<SaveHeartButton vendorId="vendor_1" />);
    fireEvent.click(screen.getByRole("button", { name: /save listing/i }));

    expect(pushMock).toHaveBeenCalledWith("/sign-in?redirect_url=%2F");
  });

  it("toggles from saved to unsaved for signed-in users", async () => {
    useUserMock.mockReturnValue({ isSignedIn: true });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as typeof fetch;

    render(<SaveHeartButton vendorId="vendor_1" initialSaved />);
    const button = screen.getByRole("button", { name: /unsave listing/i });
    fireEvent.click(button);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save listing/i })).toBeInTheDocument()
    );
  });
});
