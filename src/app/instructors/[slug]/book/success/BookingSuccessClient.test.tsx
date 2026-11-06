import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingConfirmation } from "@/lib/booking-confirmation";
import { BookingSuccessClient } from "./BookingSuccessClient";

const buildBookingReceiptPdf = vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/booking-receipt-pdf", () => ({
  buildBookingReceiptPdf: (...args: unknown[]) => buildBookingReceiptPdf(...args),
  bookingReceiptFilename: () => "CarryClass-receipt-CC-7K2M4P.pdf",
}));

function confirmation(): BookingConfirmation {
  return {
    state: "confirmed",
    confirmationCode: "CC-7K2M4P",
    vendorName: "INTERNAL — Claim Funnel Test",
    vendorSlug: "internal-claim-funnel-test",
    classTitle: "16-Hour Initial CCW Class",
    classType: "initial",
    startsAt: "2026-11-08T17:00:00.000Z",
    endsAt: "2026-11-09T01:00:00.000Z",
    timezone: "America/Los_Angeles",
    location: "123 Range Road, Oakland, CA",
    customerName: "Taylor Smith",
    customerEmail: "taylor@example.com",
    classAmountCents: 100,
    passThroughFees: [],
    serviceFeeCents: 6,
    totalAmountCents: 106,
    status: "paid",
    paidAt: "2026-11-05T20:00:00.000Z",
  };
}

describe("BookingSuccessClient receipt", () => {
  beforeEach(() => {
    buildBookingReceiptPdf.mockClear();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:receipt"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("downloads a PDF receipt instead of printing the page", async () => {
    const print = vi.fn();
    window.print = print;

    render(<BookingSuccessClient sessionId="cs_test" initial={confirmation()} />);

    fireEvent.click(screen.getByRole("button", { name: "Download receipt" }));

    await waitFor(() => expect(buildBookingReceiptPdf).toHaveBeenCalledTimes(1));
    expect(print).not.toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
