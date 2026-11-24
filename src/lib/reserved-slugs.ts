/**
 * Top-level path segments that must never be used as instructor vanity slugs.
 * Built from existing `src/app` routes plus common auth/infra names.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // Existing top-level app routes
  "about",
  "api",
  "blog",
  "ca",
  "dashboard",
  "faqs",
  "for-instructors",
  "gear",
  "instructors",
  "onboard",
  "onboarding",
  "outreach",
  "privacy",
  "reschedule",
  "robots",
  "sign-in",
  "sign-up",
  "sitemap",
  "terms",
  // Extra reserved names (auth, infra, marketing)
  "_next",
  "admin",
  "app",
  "contact",
  "favicon",
  "help",
  "login",
  "pricing",
  "signup",
  "static",
  "support",
  "www",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.trim().toLowerCase());
}
