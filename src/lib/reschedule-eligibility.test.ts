import { describe, expect, it } from "vitest";
import {
  canOfferRescheduleLink,
  isEligibleTargetSession,
} from "./reschedule-eligibility";

describe("canOfferRescheduleLink", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  it("allows paid upcoming bookings with email", () => {
    expect(
      canOfferRescheduleLink({
        status: "PAID",
        customerEmail: "jane@example.com",
        classDateIso: "2026-06-10T17:00:00.000Z",
        now,
      })
    ).toBe(true);
  });

  it("rejects unpaid, past, or missing email", () => {
    expect(
      canOfferRescheduleLink({
        status: "PENDING",
        customerEmail: "jane@example.com",
        classDateIso: "2026-06-10T17:00:00.000Z",
        now,
      })
    ).toBe(false);
    expect(
      canOfferRescheduleLink({
        status: "PAID",
        customerEmail: "",
        classDateIso: "2026-06-10T17:00:00.000Z",
        now,
      })
    ).toBe(false);
    expect(
      canOfferRescheduleLink({
        status: "PAID",
        customerEmail: "jane@example.com",
        classDateIso: "2026-05-01T17:00:00.000Z",
        now,
      })
    ).toBe(false);
  });
});

describe("isEligibleTargetSession", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");
  const booking = {
    vendorId: "v1",
    classSessionId: "old",
    classType: "initial",
    priceCents: 25000,
  };

  it("accepts same-type same-price open future sessions", () => {
    expect(
      isEligibleTargetSession({
        booking,
        now,
        session: {
          id: "new",
          vendorId: "v1",
          classType: "initial",
          priceCents: 25000,
          capacity: 10,
          enrolled: 4,
          startsAt: new Date("2026-06-20T17:00:00.000Z"),
        },
      })
    ).toBe(true);
  });

  it("rejects current session, full, past, price mismatch, type mismatch, other vendor", () => {
    const base = {
      id: "new",
      vendorId: "v1",
      classType: "initial",
      priceCents: 25000,
      capacity: 10,
      enrolled: 4,
      startsAt: new Date("2026-06-20T17:00:00.000Z"),
    };
    expect(
      isEligibleTargetSession({ booking, now, session: { ...base, id: "old" } })
    ).toBe(false);
    expect(
      isEligibleTargetSession({
        booking,
        now,
        session: { ...base, enrolled: 10 },
      })
    ).toBe(false);
    expect(
      isEligibleTargetSession({
        booking,
        now,
        session: { ...base, startsAt: new Date("2026-05-01T17:00:00.000Z") },
      })
    ).toBe(false);
    expect(
      isEligibleTargetSession({
        booking,
        now,
        session: { ...base, priceCents: 26000 },
      })
    ).toBe(false);
    expect(
      isEligibleTargetSession({
        booking,
        now,
        session: { ...base, classType: "renewal" },
      })
    ).toBe(false);
    expect(
      isEligibleTargetSession({
        booking,
        now,
        session: { ...base, vendorId: "other" },
      })
    ).toBe(false);
  });
});
