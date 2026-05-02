import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SavedListingsSection } from "@/components/SavedListingsSection";

vi.mock("@/components/SaveHeartButton", () => ({
  SaveHeartButton: ({ onSavedChange }: { onSavedChange?: (saved: boolean) => void }) => (
    <button onClick={() => onSavedChange?.(false)}>remove</button>
  ),
}));

describe("SavedListingsSection", () => {
  it("renders saved listings and removes item after unsave", () => {
    render(
      <SavedListingsSection
        totalCount={1}
        page={1}
        totalPages={1}
        initialItems={[
          {
            id: "saved_1",
            vendorId: "vendor_1",
            createdAt: new Date().toISOString(),
            vendor: {
              id: "vendor_1",
              slug: "acme-vendor",
              name: "Acme Vendor",
              city: "San Diego",
              county: "san-diego",
              state: "CA",
              priceInitial: 199,
              priceRenewal: 99,
            },
          },
        ]}
      />
    );

    expect(screen.getByText("Saved Listings (1)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.getByText("Saved Listings (0)")).toBeInTheDocument();
  });
});
