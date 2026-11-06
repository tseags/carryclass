import { inflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { BookingConfirmation } from "@/lib/booking-confirmation";
import { bookingReceiptFilename, buildBookingReceiptPdf } from "@/lib/booking-receipt-pdf";

function pdfPlainText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("latin1");
  const chunks = [raw];
  const streams = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  for (const match of raw.matchAll(streams)) {
    try {
      chunks.push(inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"));
    } catch {
      // Uncompressed or non-Flate stream.
    }
  }
  return chunks
    .join("\n")
    .replace(/<([0-9A-Fa-f]+)>/g, (_, hex: string) => {
      if (hex.length % 2 !== 0) return _;
      let out = "";
      for (let i = 0; i < hex.length; i += 2) {
        out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
      }
      return out;
    });
}

function confirmation(overrides: Partial<BookingConfirmation> = {}): BookingConfirmation {
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
    location: "123 Range Road, Oakland, CA 94607",
    customerName: "Taylor Smith",
    customerEmail: "taylor@example.com",
    classAmountCents: 100,
    passThroughFees: [],
    serviceFeeCents: 6,
    totalAmountCents: 106,
    status: "paid",
    paidAt: "2026-11-05T20:00:00.000Z",
    ...overrides,
  };
}

describe("booking receipt pdf", () => {
  it("names the file from the confirmation code", () => {
    expect(bookingReceiptFilename(confirmation())).toBe("CarryClass-receipt-CC-7K2M4P.pdf");
    expect(bookingReceiptFilename(confirmation({ confirmationCode: null }))).toBe(
      "CarryClass-receipt-booking.pdf"
    );
  });

  it("builds a letter-size PDF with the payment lines", async () => {
    const bytes = await buildBookingReceiptPdf(confirmation());
    const raw = pdfPlainText(bytes);
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);

    expect(raw.startsWith("%PDF")).toBe(true);
    expect(doc.getPageCount()).toBe(1);
    expect(page.getWidth()).toBe(612);
    expect(page.getHeight()).toBe(792);
    expect(doc.getTitle()).toBe("CarryClass receipt CC-7K2M4P");
    expect(raw).toContain("CC-7K2M4P");
    expect(raw).toContain("Taylor Smith");
    expect(raw).toContain("16-Hour Initial CCW Class");
    expect(raw).toContain("Class price");
    expect(raw).toContain("Total paid");
    expect(raw).toContain("$1.00");
    expect(raw).toContain("$0.06");
    expect(raw).toContain("$1.06");
    expect(raw).toContain("November 5, 2026");
  });

  it("includes instructor fees and still produces a PDF when the list is long", async () => {
    const bytes = await buildBookingReceiptPdf(
      confirmation({
        passThroughFees: Array.from({ length: 8 }, (_, index) => ({
          id: `fee-${index}`,
          name: `Range fee number ${index + 1} for targets and lane time`,
          amountCents: 250,
        })),
        totalAmountCents: 100 + 8 * 250 + 6,
      })
    );
    const raw = pdfPlainText(bytes);
    const doc = await PDFDocument.load(bytes);

    expect(raw.startsWith("%PDF")).toBe(true);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(raw).toContain("Range fee number 8");
    expect(raw).toContain("$21.06");
  });
});
