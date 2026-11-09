import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const findSnapshot = vi.fn();
const queryRaw = vi.fn();
const findClass = vi.fn();
const findBooking = vi.fn();
const updateMany = vi.fn();
const updateBooking = vi.fn();
const sendEmail = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    checkoutFeeSnapshot: { findUnique: (...args: unknown[]) => findSnapshot(...args) },
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
    classSession: { findUnique: (...args: unknown[]) => findClass(...args) },
    booking: {
      findUnique: (...args: unknown[]) => findBooking(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
      update: (...args: unknown[]) => updateBooking(...args),
    },
    $transaction: vi.fn(() => {
      throw new Error("interactive transaction must not be used");
    }),
  },
}));

vi.mock("@/lib/booking-confirmation-email", () => ({
  sendBookingConfirmationEmail: (...args: unknown[]) => sendEmail(...args),
}));

vi.mock("@/lib/instructor-booking-notification-email", () => ({
  sendInstructorBookingNotificationEmail: vi.fn().mockResolvedValue(true),
}));

const session = {
  id: "cs_test_paid",
  payment_status: "paid",
  amount_total: 106,
  customer_email: "student@example.com",
  payment_intent: "pi_test",
  metadata: {
    classSessionId: "class_1",
    vendorId: "vendor_1",
    customerEmail: "student@example.com",
    customerName: "Ty Seager",
    customerFirstName: "Ty",
    customerPhone: "(630) 815-5383",
    clerkUserId: "",
    classAmountCents: "100",
    feeSnapshotId: "snap_1",
  },
} as unknown as Stripe.Checkout.Session;

describe("fulfillPaidCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findSnapshot.mockResolvedValue(null);
    sendEmail.mockResolvedValue(true);
    updateMany.mockResolvedValue({ count: 1 });
  });

  it("records a paid checkout with one statement and sends the confirmation", async () => {
    const saved = {
      id: "booking_1",
      vendorId: "vendor_1",
      classSessionId: "class_1",
      customerName: "Ty Seager",
      customerEmail: "student@example.com",
      confirmationCode: "CC-ABCDEF",
    };
    queryRaw.mockResolvedValue([saved]);
    findBooking.mockResolvedValueOnce(null).mockResolvedValueOnce(saved);

    const { fulfillPaidCheckoutSession } = await import("./fulfill-paid-booking");
    await fulfillPaidCheckoutSession(session);

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        prismaVendorId: "vendor_1",
        classSessionId: "class_1",
        customerEmail: "student@example.com",
        confirmationCode: "CC-ABCDEF",
      })
    );
  });

  it("does not claim success when the class session is gone", async () => {
    queryRaw.mockResolvedValue([]);
    findBooking.mockResolvedValue(null);
    findClass.mockResolvedValue(null);

    const { fulfillPaidCheckoutSession } = await import("./fulfill-paid-booking");
    await expect(fulfillPaidCheckoutSession(session)).rejects.toThrow("ClassSession missing");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
