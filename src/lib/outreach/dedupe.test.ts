import { describe, expect, it } from "vitest";
import {
  cleanWebsite,
  dedupeOutreachRows,
  mergePreservedTags,
  websiteKey,
  type OutreachSourceRow,
} from "./dedupe";

let seq = 0;
function row(partial: Partial<OutreachSourceRow>): OutreachSourceRow {
  seq += 1;
  return {
    id: `row-${seq}`,
    county: "fresno",
    needs_review: null,
    vendor_name: "Acme CCW",
    instructor_names: null,
    email: null,
    phone: null,
    website_url: null,
    booking_capability: null,
    city: null,
    address: null,
    crawl_status: null,
    enrichment_confidence: null,
    confidence_notes: null,
    hidden_from_directory: false,
    accepts_bookings: false,
    stripe_connect_account_id: null,
    ...partial,
  };
}

describe("websiteKey", () => {
  it("strips protocol, www, path, and trailing slash", () => {
    expect(websiteKey("https://www.Acme.com/classes/")).toBe("acme.com");
    expect(websiteKey("acme.com")).toBe("acme.com");
  });

  it("keeps the page path for shared hosts", () => {
    expect(websiteKey("https://facebook.com/acmeccw")).toBe("facebook.com/acmeccw");
  });

  it("uses the instructor site embedded in a county page", () => {
    expect(cleanWebsite("https://www.countyofmerced.com/3266/www.6thnationgunclub.com")).toBe(
      "https://www.6thnationgunclub.com"
    );
    expect(websiteKey("https://www.countyofmerced.com/3266/foo")).toBe("");
  });
});

describe("dedupeOutreachRows", () => {
  it("merges one row per county into one contact with every county and contact", () => {
    const [c, ...rest] = dedupeOutreachRows([
      row({ county: "fresno", website_url: "https://acme.com", phone: "559-111-2222", email: "a@acme.com" }),
      row({ county: "Kings County", website_url: "http://www.acme.com/", phone: "559-333-4444" }),
      row({ county: "madera", vendor_name: "ACME ccw", phone: "559-555-6666", address: "1 Main St" }),
    ]);
    expect(rest).toHaveLength(0);
    expect(c.counties).toEqual(["fresno", "kings", "madera"]);
    expect(c.phones).toEqual(["(559) 111-2222", "(559) 333-4444", "(559) 555-6666"]);
    expect(c.emails).toEqual(["a@acme.com"]);
    expect(c.dedupeKey).toBe("web:acme.com");
    expect(c.tags).toContain("multi-county");
    expect(c.sourceListingIds).toHaveLength(3);
  });

  it("does not chain different websites together through a shared phone", () => {
    const contacts = dedupeOutreachRows([
      row({ vendor_name: "Alpha", website_url: "alpha.com", phone: "530-999-1822" }),
      row({ vendor_name: "Bravo", website_url: "bravo.com", phone: "530-999-1822" }),
    ]);
    expect(contacts).toHaveLength(2);
  });

  it("links website-less rows by phone", () => {
    const contacts = dedupeOutreachRows([
      row({ vendor_name: "Alpha", phone: "(530) 999-1822" }),
      row({ vendor_name: "Alpha Training", phone: "1-530-999-1822" }),
    ]);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].dedupeKey).toBe("tel:5309991822");
    expect(contacts[0].tags).toContain("no-website");
  });

  it("tags website without direct booking, including blank capability", () => {
    const [blank] = dedupeOutreachRows([row({ website_url: "a.com" })]);
    expect(blank.tags).toContain("website-no-booking");
    const [inquiry] = dedupeOutreachRows([row({ website_url: "b.com", booking_capability: "inquiry_only" })]);
    expect(inquiry.tags).toContain("website-no-booking");
  });

  it("treats any direct_booking row as booking-capable", () => {
    const [c] = dedupeOutreachRows([
      row({ website_url: "c.com", booking_capability: "unclear" }),
      row({ website_url: "c.com", booking_capability: "direct_booking" }),
    ]);
    expect(c.tags).toContain("website-has-booking");
    expect(c.tags).not.toContain("website-no-booking");
  });

  it("does not use CarryClass bookings to decide the website booking segment", () => {
    const [c] = dedupeOutreachRows([
      row({ website_url: "d.com", booking_capability: "none", accepts_bookings: true }),
    ]);
    expect(c.tags).toContain("website-no-booking");
    expect(c.tags).toContain("on-carryclass");
  });

  it("tags multiple distinct addresses as multi-location", () => {
    const [c] = dedupeOutreachRows([
      row({ website_url: "e.com", address: "1 Main St." }),
      row({ website_url: "e.com", address: "1 main st" }),
      row({ website_url: "e.com", address: "9 Range Rd" }),
    ]);
    expect(c.addresses).toHaveLength(2);
    expect(c.tags).toContain("multi-location");
  });

  it("tags USCCA when confidence notes mention it", () => {
    const [c] = dedupeOutreachRows([
      row({
        website_url: "f.com",
        booking_capability: "direct_booking",
        confidence_notes: "Confirmed online booking. Uses USCCA curriculum.",
      }),
    ]);
    expect(c.tags).toContain("uscca");
    expect(c.tags).toContain("website-has-booking");
  });

  it("preserves curated USCCA tags across sync merges", () => {
    expect(mergePreservedTags(["website-has-booking"], ["uscca", "has-email"])).toEqual([
      "website-has-booking",
      "uscca",
    ]);
    expect(mergePreservedTags(["website-has-booking", "uscca"], ["uscca"])).toEqual([
      "website-has-booking",
      "uscca",
    ]);
  });
});
