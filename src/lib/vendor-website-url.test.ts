import { describe, expect, it } from "vitest";
import { buildVendorWebsiteUrl } from "./vendor-website-url";

describe("buildVendorWebsiteUrl", () => {
  it("appends UTM params to an absolute URL", () => {
    const result = buildVendorWebsiteUrl("https://example.com/classes", {
      vendorSlug: "acme-firearms-orange",
      placement: "hero",
    });

    const url = new URL(result);
    expect(url.origin).toBe("https://example.com");
    expect(url.pathname).toBe("/classes");
    expect(url.searchParams.get("utm_source")).toBe("carryclass");
    expect(url.searchParams.get("utm_medium")).toBe("referral");
    expect(url.searchParams.get("utm_campaign")).toBe("instructor-profile");
    expect(url.searchParams.get("utm_content")).toBe("hero");
    expect(url.searchParams.get("utm_term")).toBe("acme-firearms-orange");
  });

  it("adds https when the website omits a protocol", () => {
    const result = buildVendorWebsiteUrl("example.com", {
      vendorSlug: "acme-firearms-orange",
      placement: "contact",
    });

    expect(result.startsWith("https://example.com")).toBe(true);
    expect(new URL(result).searchParams.get("utm_content")).toBe("contact");
  });

  it("preserves existing query params", () => {
    const result = buildVendorWebsiteUrl("https://example.com?ref=home", {
      vendorSlug: "acme-firearms-orange",
      placement: "hero",
    });

    const url = new URL(result);
    expect(url.searchParams.get("ref")).toBe("home");
    expect(url.searchParams.get("utm_source")).toBe("carryclass");
  });

  it("overwrites existing UTM params with CarryClass attribution", () => {
    const result = buildVendorWebsiteUrl(
      "https://example.com?utm_source=old&utm_term=old-slug",
      {
        vendorSlug: "new-slug",
        placement: "hero",
      }
    );

    const url = new URL(result);
    expect(url.searchParams.get("utm_source")).toBe("carryclass");
    expect(url.searchParams.get("utm_term")).toBe("new-slug");
  });

  it("returns the original string for invalid URLs", () => {
    expect(
      buildVendorWebsiteUrl("not a valid url", {
        vendorSlug: "acme-firearms-orange",
        placement: "hero",
      })
    ).toBe("not a valid url");
  });
});
