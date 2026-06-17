import { CALIFORNIA_COUNTIES } from "@/data/counties";

const COUNTIES_BY_LENGTH = [...CALIFORNIA_COUNTIES].sort((a, b) => b.length - a.length);

/** CarryClass slugs end with a 10-char fingerprint: `{name-county}-{fingerprint}`. */
const CARRYCLASS_SLUG_SUFFIX = /^(.+)-([a-f0-9]{10})$/i;

/**
 * Infer the county slug embedded in a computed CarryClass vendor slug so we can
 * scope DB reads to one county instead of the full vendor table.
 */
export function parseCountySlugFromCarryClassVendorSlug(slug: string): string | null {
  const match = slug.match(CARRYCLASS_SLUG_SUFFIX);
  if (!match) return null;

  const slugBase = match[1];
  for (const county of COUNTIES_BY_LENGTH) {
    if (slugBase === county || slugBase.endsWith(`-${county}`)) {
      return county;
    }
  }
  return null;
}
