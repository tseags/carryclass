import { SITE_URL } from "@/lib/site-url";
import { DEFAULT_SITE_DESCRIPTION } from "@/lib/seo";
import type { Vendor } from "@/types";
import { getCountyDisplayName } from "@/data/counties";

/** Safe JSON for embedding in a script tag (prevents `</script>` breakout). */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CarryClass",
    url: SITE_URL,
    description: DEFAULT_SITE_DESCRIPTION,
  };
}

export function vendorLocalBusinessJsonLd(vendor: Vendor) {
  const countyName = getCountyDisplayName(vendor.county);
  const description =
    vendor.description ??
    `${vendor.name} offers sheriff-approved CCW training in ${vendor.city}, ${countyName} County, California.`;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: vendor.name,
    description,
    url: `${SITE_URL}/instructors/${vendor.slug}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: vendor.city,
      addressRegion: vendor.state || "CA",
      addressCountry: "US",
      ...(vendor.address ? { streetAddress: vendor.address } : {}),
    },
    areaServed: {
      "@type": "AdministrativeArea",
      name: `${countyName} County`,
    },
  };

  if (vendor.phone) schema.telephone = vendor.phone;
  if (vendor.website) schema.sameAs = vendor.website;
  if (vendor.imageUrl) schema.image = vendor.imageUrl;

  return schema;
}

export function countyBreadcrumbJsonLd(countySlug: string, countyDisplayName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "California",
        item: `${SITE_URL}/ca`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${countyDisplayName} County`,
        item: `${SITE_URL}/ca/${countySlug}`,
      },
    ],
  };
}
