import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();
const findToken = vi.fn();
const findBooking = vi.fn();
const findSessions = vi.fn();
const updateToken = vi.fn();
const updateManyTokens = vi.fn();
const createToken = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
    bookingRescheduleToken: {
      findUnique: (...args: unknown[]) => findToken(...args),
      update: (...args: unknown[]) => updateToken(...args),
      updateMany: (...args: unknown[]) => updateManyTokens(...args),
      create: (...args: unknown[]) => createToken(...args),
    },
    booking: {
      findUnique: (...args: unknown[]) => findBooking(...args),
    },
    classSession: {
      findMany: (...args: unknown[]) => findSessions(...args),
    },
    $transaction: vi.fn(() => {
      throw new Error("interactive transaction must not be used");
    }),
  },
}));

describe("transferBookingToSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the moved row when the atomic SQL succeeds", async () => {
    queryRaw.mockResolvedValue([
      {
        booking_id: "b1",
        old_session_id: "old",
        new_session_id: "new",
      },
    ]);

    const { transferBookingToSession } = await import("./reschedule-booking");
    const result = await transferBookingToSession({
      bookingId: "b1",
      vendorId: "v1",
      oldSessionId: "old",
      newSessionId: "new",
    });

    expect(result).toEqual({
      bookingId: "b1",
      oldSessionId: "old",
      newSessionId: "new",
    });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("returns null when capacity/eligibility blocks the move", async () => {
    queryRaw.mockResolvedValue([]);
    const { transferBookingToSession } = await import("./reschedule-booking");
    const result = await transferBookingToSession({
      bookingId: "b1",
      vendorId: "v1",
      oldSessionId: "old",
      newSessionId: "full",
    });
    expect(result).toBeNull();
  });
});

describe("applyRescheduleWithToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateToken.mockResolvedValue({});
  });

  it("moves the booking and marks the token used", async () => {
    const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const later = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const currentSession = {
      id: "old",
      vendorId: "v1",
      startsAt,
      endsAt: null,
      title: null,
      classType: "initial",
      priceCents: 25000,
      capacity: 12,
      enrolled: 3,
      timezone: "America/Los_Angeles",
    };
    const targetSession = {
      ...currentSession,
      id: "new",
      startsAt: later,
      enrolled: 1,
    };

    findToken.mockResolvedValue({
      id: "tok1",
      bookingId: "b1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    findBooking
      .mockResolvedValueOnce({
        id: "b1",
        confirmationCode: "CC-ABC123",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        status: "PAID",
        classSessionId: "old",
        vendorId: "v1",
        vendor: { id: "v1", slug: "jane-instructor", name: "Jane Instructor" },
        classSession: currentSession,
      })
      .mockResolvedValueOnce({
        id: "b1",
        confirmationCode: "CC-ABC123",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        status: "PAID",
        classSessionId: "new",
        vendorId: "v1",
        vendor: { id: "v1", slug: "jane-instructor", name: "Jane Instructor" },
        classSession: targetSession,
      });
    findSessions.mockResolvedValue([targetSession]);
    queryRaw.mockResolvedValue([
      { booking_id: "b1", old_session_id: "old", new_session_id: "new" },
    ]);

    const { applyRescheduleWithToken } = await import("./reschedule-booking");
    const result = await applyRescheduleWithToken({
      rawToken: "raw-token-value",
      classSessionId: "new",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.newSession.id).toBe("new");
      expect(result.previousSession.id).toBe("old");
    }
    expect(updateToken).toHaveBeenCalledWith({
      where: { id: "tok1" },
      data: { usedAt: expect.any(Date) },
    });
  });

  it("rejects an already-used token", async () => {
    findToken.mockResolvedValue({
      id: "tok1",
      bookingId: "b1",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const { applyRescheduleWithToken } = await import("./reschedule-booking");
    const result = await applyRescheduleWithToken({
      rawToken: "used-token",
      classSessionId: "new",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("token");
    expect(queryRaw).not.toHaveBeenCalled();
  });
});
