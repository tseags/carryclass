import { isReservedSlug } from "@/lib/reserved-slugs";

/** Lowercase kebab segments: `mcbride`, `john-mcbride`. Length 3–30. */
export const VANITY_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type VanitySlugValidation =
  | { ok: true; slug: string }
  | { ok: false; error: string };

/** Trim + lowercase. Does not validate format. */
export function normalize(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Normalize and validate a vanity slug for writes (admin / onboarding).
 * Rejects reserved top-level routes and invalid shapes.
 */
export function validate(input: string): VanitySlugValidation {
  const slug = normalize(input);

  if (slug.length < 3 || slug.length > 30) {
    return { ok: false, error: "Vanity slug must be between 3 and 30 characters." };
  }

  if (!VANITY_SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      error:
        "Vanity slug must be lowercase letters and numbers, with optional single hyphens between segments.",
    };
  }

  if (isReservedSlug(slug)) {
    return { ok: false, error: "That slug is reserved and cannot be used." };
  }

  return { ok: true, slug };
}
