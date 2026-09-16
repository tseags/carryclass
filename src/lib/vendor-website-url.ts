export type VendorWebsiteLinkPlacement = "hero" | "contact";

const UTM_SOURCE = "carryclass";
const UTM_MEDIUM = "referral";
const UTM_CAMPAIGN = "instructor-profile";

export const WEBSITE_INPUT_ERROR =
  "Enter a valid website like mysite.com or https://mysite.com";

export type WebsiteParseResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

const HOST_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) return false;
  if (hostname === "localhost") return true;
  if (!hostname.includes(".") || hostname.includes("..")) return false;
  if (hostname.startsWith(".") || hostname.endsWith(".")) return false;
  return hostname.split(".").every((label) => label.length <= 63 && HOST_LABEL_RE.test(label));
}

function hrefFromUrl(url: URL): string {
  const path = url.pathname === "/" ? "" : url.pathname;
  return `${url.protocol}//${url.host}${path}${url.search}${url.hash}`;
}

/**
 * Normalize optional website input for onboarding/dashboard save.
 * Accepts bare domains and http(s) URLs; empty → null; rejects obvious garbage.
 */
export function parseWebsiteInput(
  input: string | null | undefined
): WebsiteParseResult {
  if (input == null) return { ok: true, value: null };
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, value: null };

  if (/\s/.test(trimmed)) {
    return { ok: false, error: WEBSITE_INPUT_ERROR };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return { ok: false, error: WEBSITE_INPUT_ERROR };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: WEBSITE_INPUT_ERROR };
  }

  if (!isValidHostname(url.hostname)) {
    return { ok: false, error: WEBSITE_INPUT_ERROR };
  }

  return { ok: true, value: hrefFromUrl(url) };
}

/** Append CarryClass referral UTMs so instructors can attribute directory traffic. */
export function buildVendorWebsiteUrl(
  website: string,
  options: { vendorSlug: string; placement: VendorWebsiteLinkPlacement }
): string {
  const trimmed = website.trim();
  if (!trimmed) return trimmed;

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    url.searchParams.set("utm_source", UTM_SOURCE);
    url.searchParams.set("utm_medium", UTM_MEDIUM);
    url.searchParams.set("utm_campaign", UTM_CAMPAIGN);
    url.searchParams.set("utm_content", options.placement);
    url.searchParams.set("utm_term", options.vendorSlug);
    return url.toString();
  } catch {
    return trimmed;
  }
}
