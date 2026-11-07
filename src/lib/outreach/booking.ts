import type { OutreachTag } from "./dedupe";

/** Website booking segment shown in outreach (mutually exclusive tags). */
export const WEBSITE_BOOKING_OPTIONS = [
  "website-has-booking",
  "website-no-booking",
  "no-website",
] as const;

export type WebsiteBookingOption = (typeof WEBSITE_BOOKING_OPTIONS)[number];

export const WEBSITE_BOOKING_LABELS: Record<WebsiteBookingOption, string> = {
  "website-has-booking": "Website · has booking",
  "website-no-booking": "Website · no booking",
  "no-website": "No website",
};

/** How / where the instructor takes online bookings (manual curation). */
export const BOOKING_TOOLS = [
  "uscca",
  "shootingclasses",
  "onsite_checkout",
  "acuity",
  "square",
  "woocommerce",
  "thinkific",
  "other",
] as const;

export type BookingTool = (typeof BOOKING_TOOLS)[number];

export const BOOKING_TOOL_LABELS: Record<BookingTool, string> = {
  uscca: "USCCA",
  shootingclasses: "ShootingClasses.com",
  onsite_checkout: "Onsite checkout",
  acuity: "Acuity",
  square: "Square",
  woocommerce: "WooCommerce",
  thinkific: "Thinkific",
  other: "Other",
};

export function isWebsiteBookingOption(value: string): value is WebsiteBookingOption {
  return (WEBSITE_BOOKING_OPTIONS as readonly string[]).includes(value);
}

export function isBookingTool(value: string): value is BookingTool {
  return (BOOKING_TOOLS as readonly string[]).includes(value);
}

export function websiteBookingFromTags(tags: string[]): WebsiteBookingOption | null {
  for (const option of WEBSITE_BOOKING_OPTIONS) {
    if (tags.includes(option)) return option;
  }
  return null;
}

/** Map a website-booking choice onto listing booking_capability + tags. */
export function applyWebsiteBooking(
  tags: string[],
  option: WebsiteBookingOption
): { tags: string[]; bookingCapability: string | null } {
  const without = tags.filter((t) => !(WEBSITE_BOOKING_OPTIONS as readonly string[]).includes(t));
  const next = [...without, option];
  const bookingCapability =
    option === "website-has-booking"
      ? "direct_booking"
      : option === "no-website"
        ? null
        : "inquiry_only";
  return { tags: next, bookingCapability };
}

/** Keep uscca tag in sync with bookingTool for filters that still use tags. */
export function applyBookingToolTag(tags: string[], tool: BookingTool | null): string[] {
  const without = tags.filter((t) => t !== "uscca");
  if (tool === "uscca") without.push("uscca" satisfies OutreachTag);
  return without;
}

export function replaceWebsiteBookingTags(derived: string[], lockedSegment: WebsiteBookingOption | null): string[] {
  const without = derived.filter((t) => !(WEBSITE_BOOKING_OPTIONS as readonly string[]).includes(t));
  if (lockedSegment) without.push(lockedSegment);
  return without;
}
