export type VendorWebsiteLinkPlacement = "hero" | "contact";

const UTM_SOURCE = "carryclass";
const UTM_MEDIUM = "referral";
const UTM_CAMPAIGN = "instructor-profile";

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
