import { describe, expect, it } from "vitest";
import {
  WEBSITE_INPUT_ERROR,
  buildVendorWebsiteUrl,
  parseWebsiteInput,
} from "./vendor-website-url";

describe("parseWebsiteInput", () => {
  it("treats empty / whitespace as optional null", () => {
    expect(parseWebsiteInput("")).toEqual({ ok: true, value: null });
    expect(parseWebsiteInput("   ")).toEqual({ ok: true, value: null });
    expect(parseWebsiteInput(null)).toEqual({ ok: true, value: null });
    expect(parseWebsiteInput(undefined)).toEqual({ ok: true, value: null });
  });

  it("accepts bare domains and prepends https://", () => {
    expect(parseWebsiteInput("mysite.com")).toEqual({
      ok: true,
      value: "https://mysite.com",
    });
    expect(parseWebsiteInput("www.example.com")).toEqual({
      ok: true,
      value: "https://www.example.com",
    });
  });

  it("accepts http(s) URLs as-is (normalized)", () => {
    expect(parseWebsiteInput("https://mysite.com")).toEqual({
      ok: true,
      value: "https://mysite.com",
    });
    expect(parseWebsiteInput("http://mysite.com/path")).toEqual({
      ok: true,
      value: "http://mysite.com/path",
    });
  });

  it("rejects spaces and non-http schemes", () => {
    expect(parseWebsiteInput("not a valid url")).toEqual({
      ok: false,
      error: WEBSITE_INPUT_ERROR,
    });
    expect(parseWebsiteInput("ftp://example.com")).toEqual({
      ok: false,
      error: WEBSITE_INPUT_ERROR,
    });
    expect(parseWebsiteInput("javascript:alert(1)")).toEqual({
      ok: false,
      error: WEBSITE_INPUT_ERROR,
    });
  });

  it("rejects hostnames without a TLD-looking domain", () => {
    expect(parseWebsiteInput("mysite")).toEqual({
      ok: false,
      error: WEBSITE_INPUT_ERROR,
    });
    expect(parseWebsiteInput("https://")).toEqual({
      ok: false,
      error: WEBSITE_INPUT_ERROR,
    });
  });
});

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
