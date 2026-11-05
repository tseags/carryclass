import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  CONFIRMATION_CODE_PATTERN,
  generateConfirmationCode,
  isConfirmationCodeCollision,
} from "./booking-confirmation-code";

function p2002(target: unknown) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
    meta: { target },
  });
}

describe("generateConfirmationCode", () => {
  it("produces CC- plus six unambiguous characters", () => {
    for (let i = 0; i < 500; i += 1) {
      const code = generateConfirmationCode();
      expect(code).toMatch(CONFIRMATION_CODE_PATTERN);
      expect(code.slice(3)).not.toMatch(/[01OIL]/);
    }
  });

  it("does not repeat across a batch", () => {
    const codes = new Set(Array.from({ length: 1000 }, generateConfirmationCode));
    expect(codes.size).toBe(1000);
  });
});

describe("isConfirmationCodeCollision", () => {
  it("matches unique violations on confirmationCode only", () => {
    expect(isConfirmationCodeCollision(p2002(["confirmationCode"]))).toBe(true);
    expect(isConfirmationCodeCollision(p2002("Booking_confirmationCode_key"))).toBe(true);
    expect(isConfirmationCodeCollision(p2002(["stripeCheckoutSessionId"]))).toBe(false);
    expect(isConfirmationCodeCollision(new Error("boom"))).toBe(false);
  });
});
