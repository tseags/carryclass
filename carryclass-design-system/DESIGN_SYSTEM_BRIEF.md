# CarryClass — Claude design system setup

Use this brief with the files in this folder when setting up a design system in Claude.

---

## Company name and blurb

CarryClass: California’s CCW (concealed carry) class directory and booking marketplace. Students find sheriff-approved instructors by county, compare prices, and book online. Instructors claim listings, manage profiles/schedules, and accept payments via Stripe. Surfaces: marketing site (getcarryclass.com), instructor onboarding + dashboard, student booking flow, and county/instructor SEO pages. Stack: Next.js App Router + Webflow-exported CSS + Tailwind overrides.

---

## GitHub (optional)

https://github.com/tseags/carryclass

---

## How to attach in Claude

1. **Company name and blurb** — paste the blurb above.
2. **Link code from GitHub** — `https://github.com/tseags/carryclass` (optional if you attach local code).
3. **Link code from your computer** — browse/drag the `code/` subfolder (or pick files inside it). Claude copies selected files; you do not need the whole repo.
4. **Upload a .fig file** — skip (none in repo).
5. **Add fonts, logos and assets** — browse/drag the `assets/` subfolder.
6. **Any other notes?** — paste the notes section below.

---

## What’s included

### code/
| Path | Why |
|------|-----|
| `src/app/globals.css` | Live brand tokens + warm cream/terracotta overrides |
| `public/css/ccw-directory.webflow.css` | Original Webflow design system |
| `public/css/app-overrides.css` | App-level style overrides |
| `src/components/Header.tsx` | Nav + logo usage |
| `src/app/page.tsx` | Homepage composition |
| `src/app/for-instructors/page.tsx` | Branded marketing page |
| `src/app/instructors/[slug]/page.tsx` | Instructor profile |
| `src/components/onboarding/` | Product UI patterns |
| `src/app/opengraph-image.tsx` | Social/brand mark treatment |

### assets/
| Path | Why |
|------|-----|
| `carryclass-logo.png` | Primary logo |
| `favicon.svg` / `favicon.png` | Favicons |
| `THICCCBOI-*.woff2` | Brand font |
| `logo-directory-webflow-ecommerce-template.svg` | Older wordmark (optional) |

---

## Any other notes?

### Product surfaces

- Public marketing + SEO directory (home, `/ca/[county]`, instructor profiles)
- Instructor funnel (`/for-instructors` → claim → onboard steps → dashboard)
- Student booking + confirmation
- Prefer matching the current live site over older Webflow template defaults

### Visual direction (current / preferred)

- Warm, grounded California feel — not tech-purple, not generic SaaS
- Cream / parchment backgrounds: `#f2efe8`, `#fefcf9`, `#fafafa`
- Near-black text and dark sections: `#141413`, `#1f1f1d`
- Accent (CTAs, links, focus, highlights): terracotta `#c96442`, hover `#d97757`
- Dark heroes (instructor profiles): `#141413` with terracotta accents
- Rounded corners ~8px on inputs/buttons; restrained shadows
- Brand name “CarryClass” should stay a strong visual signal on marketing pages

### Legacy Webflow tokens (secondary reference)

- Font: Thicccboi (sans)
- Accent primary: `#111828`
- Secondary: `#222e5b` (navy), `#363533`
- Neutrals: `#f0ebe7`, `#f8f8f8`, `#586071`, `#2c3240`, `#8b909a`, `#b7c0d2`
- When new UI conflicts with Webflow navy/purple button-shadow tokens, prefer the warm cream + terracotta system above

### Typography

- Primary face: Thicccboi (Bold for headlines, Medium/SemiBold for UI, Regular for body)
- Fallback: system UI sans
- Headlines: bold, tight, high contrast; avoid Inter/Roboto/Arial as the intended brand face
- Eyebrows: small, uppercase, tracking, often terracotta

### Voice & UX copy

- Clear, practical, California-specific; confident but not tactical-aggressive or meme-y
- Audience: adults seeking CCW classes + certified instructors running small training businesses
- Prefer concrete benefit language (“claim your listing”, “book by county”) over jargon

### Layout habits

- Marketing: one job per section; strong hero with brand + one headline + one CTA group
- Directory: scannable cards/lists are OK where the interaction is browse/compare
- Forms (onboard/dashboard): clean white fields, zinc borders, dark focus rings; terracotta for status/selection accents
- Mobile-first; sticky header ~70px desktop / ~98px tablet

### Do not

- Default to purple/indigo gradients, neon glow, or dark-mode-first chrome
- Invent a second logo style; use `carryclass-logo.png`
- Treat unused Webflow template stock imagery as brand photography
