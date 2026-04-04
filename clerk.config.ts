// Central Clerk configuration for Next.js App Router.
// Keys are read from environment variables; do not hard-code secrets here.
// Note: ClerkConfig was removed in @clerk/nextjs v7; use plain object.
export const clerkConfig = {
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
  signInFallbackRedirectUrl: "/dashboard",
  signUpFallbackRedirectUrl: "/dashboard",
} as const;

export default clerkConfig;

