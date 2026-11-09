import { describe, expect, it } from "vitest";
import {
  normalizeBookingNotificationEmails,
  resolveBookingNotificationRecipients,
} from "./booking-notification-prefs";

describe("normalizeBookingNotificationEmails", () => {
  it("parses, lowercases, and dedupes", () => {
    const result = normalizeBookingNotificationEmails(
      "A@Gym.com, b@gym.com; a@gym.com\nc@gym.com"
    );
    expect(result).toEqual({
      ok: true,
      emails: ["a@gym.com", "b@gym.com", "c@gym.com"],
    });
  });

  it("rejects invalid addresses", () => {
    const result = normalizeBookingNotificationEmails(["good@ex.com", "not-an-email"]);
    expect(result.ok).toBe(false);
  });

  it("allows an empty list", () => {
    expect(normalizeBookingNotificationEmails("")).toEqual({ ok: true, emails: [] });
    expect(normalizeBookingNotificationEmails([])).toEqual({ ok: true, emails: [] });
  });
});

describe("resolveBookingNotificationRecipients", () => {
  it("returns nothing when disabled", () => {
    expect(
      resolveBookingNotificationRecipients({
        enabled: false,
        notificationEmails: ["a@ex.com"],
        profileEmail: "b@ex.com",
      })
    ).toEqual([]);
  });

  it("prefers custom notification emails", () => {
    expect(
      resolveBookingNotificationRecipients({
        enabled: true,
        notificationEmails: ["desk@ex.com", "desk@ex.com"],
        profileEmail: "owner@ex.com",
      })
    ).toEqual(["desk@ex.com"]);
  });

  it("falls back to profile then listing email", () => {
    expect(
      resolveBookingNotificationRecipients({
        notificationEmails: [],
        profileEmail: "owner@ex.com",
        listingEmail: "listing@ex.com",
      })
    ).toEqual(["owner@ex.com"]);

    expect(
      resolveBookingNotificationRecipients({
        notificationEmails: null,
        profileEmail: null,
        listingEmail: "listing@ex.com",
      })
    ).toEqual(["listing@ex.com"]);
  });
});
