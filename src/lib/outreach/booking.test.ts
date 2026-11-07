import { describe, expect, it } from "vitest";
import {
  applyBookingToolTag,
  applyWebsiteBooking,
  replaceWebsiteBookingTags,
  websiteBookingFromTags,
} from "./booking";

describe("applyWebsiteBooking", () => {
  it("swaps the website booking segment and maps capability", () => {
    const next = applyWebsiteBooking(
      ["website-no-booking", "has-email", "has-phone"],
      "website-has-booking"
    );
    expect(next.tags).toEqual(["has-email", "has-phone", "website-has-booking"]);
    expect(next.bookingCapability).toBe("direct_booking");
  });

  it("maps no-website to a null capability", () => {
    const next = applyWebsiteBooking(["website-has-booking"], "no-website");
    expect(next.tags).toContain("no-website");
    expect(next.bookingCapability).toBeNull();
  });
});

describe("applyBookingToolTag", () => {
  it("keeps the uscca tag in sync with the booking tool", () => {
    expect(applyBookingToolTag(["has-email"], "uscca")).toContain("uscca");
    expect(applyBookingToolTag(["has-email", "uscca"], "square")).not.toContain("uscca");
    expect(applyBookingToolTag(["uscca"], null)).not.toContain("uscca");
  });
});

describe("replaceWebsiteBookingTags", () => {
  it("keeps a locked website booking segment across sync", () => {
    expect(
      replaceWebsiteBookingTags(["website-no-booking", "has-email"], "website-has-booking")
    ).toEqual(["has-email", "website-has-booking"]);
  });

  it("reads the current website booking segment from tags", () => {
    expect(websiteBookingFromTags(["has-email", "website-no-booking"])).toBe("website-no-booking");
    expect(websiteBookingFromTags(["has-email"])).toBeNull();
  });
});
