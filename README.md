# CCW Training Directory

A directory and marketplace for CCW (Concealed Carry Weapon) training and related services. Built with Next.js for scale, filtering, and future product features.

## Features

- **Location-first navigation**: Browse by State → County → Instructors
- **SEO-friendly structure**: Static county pages, dynamic instructor profiles, sitemap
- **Filtering**: County, city, class type (initial/renewal), format (in-person/online/hybrid), price
- **Instructor profiles**: Rich detail pages with CTAs
- **Mobile-friendly**: Responsive, utility-first UI

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Data**: PostgreSQL (Prisma) with seed data from `src/data/vendors.ts`

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database & seed

```bash
npx prisma migrate dev
npm run db:seed
```

Vendor profiles load from the database in development/production. See `.env.example` for `DATABASE_URL`.

### Vendor data updates

Before changing vendor listing rows (`carry_class_vendor_data`, enriched tables, or SQL in `migrations/`):

```bash
npm run check:vendor-db-env
```

Apply SQL via Postgres (`DATABASE_URL`), not Supabase REST, unless the check reports matching project refs:

```bash
npm run migrate:sql -- --file migrations/your-file.sql --target listings
```

That wrapper exists because two footguns make the bare Prisma CLI unreliable here:

- **`prisma` CLI reads `.env`, never `.env.local`.** Real credentials live in `.env.local`, so `npx prisma db execute --schema prisma/schema.prisma` silently uses whatever `.env` holds — including unedited `.env.example` placeholders.
- **`prisma db execute` hangs forever on Supabase's transaction pooler (`:6543`).** It never errors or times out. The wrapper rewrites the port to `:5432` (session mode) for DDL only; app runtime still uses `:6543`.

The wrapper resolves env the way Next.js does and prints the target project ref before writing. Add `--dry-run` to see the resolved target without executing.

After production changes, bust the vendor cache:

```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/revalidate-vendors" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Set `VENDORS_FETCH_VIA_DATABASE=1` in `.env.local` when local REST URL points at a different Supabase project than `DATABASE_URL`. Do not commit `.env.local`.

### Instructor self-serve funnel

The instructor path is `/for-instructors` → sign up → `/instructors/claim` → `/onboard/step/1`–`6` → `/dashboard/vendor`.

Run the pre-flight before smoke-testing; it checks env, schema, and storage across both Supabase projects and exits non-zero on anything blocking:

```bash
npm run check:instructor-funnel
```

#### Supabase projects

Keep `NEXT_PUBLIC_SUPABASE_URL` (plus its anon and service_role keys) and `DATABASE_URL` on the **same** Supabase project. A split across two projects is legacy: it needs every migration routed by hand, and a service_role key from the wrong project surfaces as `Invalid API key` when claim creates a vendor profile.

| Data | Accessed via | Connection | Migration |
| --- | --- | --- | --- |
| Claim codes (`claim_verifications`) | Prisma raw SQL (`src/lib/claim-db.ts`) | `DATABASE_URL` | `migrations/claim-verifications.sql` |
| Public listings (`carry_class_vendor_data`) | Prisma raw SQL (`src/lib/vendors-db.ts`) | `DATABASE_URL` | vendor listing SQL |
| Onboarding profile (`vendors`, `vendor_*`) | Supabase REST via `supabaseAdmin()` (`src/lib/onboarding-db.ts`) | `NEXT_PUBLIC_SUPABASE_URL` | `migrations/onboarding.sql` |
| Profile / gallery images | Supabase Storage `vendor-assets` | `NEXT_PUBLIC_SUPABASE_URL` | `npm run ensure:vendor-assets-bucket` |

`npm run check:vendor-db-env` reports whether the two refs match, and it should say **yes**. When they match, `--target onboarding` resolves `DATABASE_URL` on its own and `ONBOARDING_DATABASE_URL` should stay unset:

```bash
npm run migrate:sql -- --file migrations/claim-verifications.sql --target listings
npm run migrate:sql -- --file migrations/onboarding.sql --target onboarding
```

Both migrations are idempotent (`IF NOT EXISTS` / guarded `DO` blocks), so re-running them is how you pick up columns added since the first apply. To see live drift against `migrations/onboarding.sql`:

```bash
npm run check:onboarding-schema
```

On a legacy split setup the refs differ, and `--target onboarding` refuses to run rather than guessing. Point `ONBOARDING_DATABASE_URL` at the REST project's Postgres URL, or paste `migrations/onboarding.sql` into that project's SQL Editor — but prefer consolidating onto one project instead.

#### Storage

Uploads go through `/api/upload-vendor-asset` using the service role key, so no RLS policy is needed, but the bucket must exist and be **public** — `getPublicUrl()` otherwise returns URLs that fail. This is idempotent:

```bash
npm run ensure:vendor-assets-bucket
```

#### Smoke test

1. `/for-instructors` — CTA lands on `/instructors/claim`.
2. Sign up with `?intent=vendor`, which routes through `/onboarding/vendor` and back to `/instructors/claim`.
3. Search a real listing by business name and pick it. Codes are sent **only** to the email/phone already on the directory row, never to user-supplied input, so pick a listing whose contact you control.

   For claim-funnel smoke tests without emailing live businesses, use the hidden test listing: sign in on `/instructors/claim` and search **INTERNAL** or **Claim Funnel**. That row (`matthiasseager@gmail.com`, Alpine County) is excluded from the public directory but appears in authenticated claim search. The claim slug is the **merged** canonical slug — currently `internal-claim-funnel-test-6b7e67a50b` (copy from claim search results if it ever drifts; not the pre-merge `{name}-{county}-{hash}` form).

4. Enter the code. In development the code is also logged to the server console (`[claim] email code for …`); set `CLAIM_DEV_LOG_CODES=1` to get that outside dev. Email needs `RESEND_API_KEY`; SMS needs all three `TWILIO_*` vars, otherwise use the email channel.
5. Verify redirects to `/onboard`, which forwards to `/onboard/step/{onboarding_step}`.
6. Walk steps 1–6. Step 5 (Stripe Connect) is **optional** — "Skip for now" advances to step 6 without a `stripe_account_id`. Step 6 publishes and redirects to `/dashboard/vendor`.

Guards worth checking: `/onboard` before claiming bounces to `/instructors/claim`, and `/dashboard/vendor` before publishing bounces to `/onboard`. Step URLs are **not** gated on `onboarding_step`, so a claimed user can open `/onboard/step/5` directly.

Publishing (step 6) syncs the claimed listing into the live directory and booking system, then sets `is_published` on the onboarding `vendors` row:

1. Updates matching `carry_class_vendor_data` source row(s) via `DATABASE_URL` (bio, contact, prices, logo, `accepts_bookings`, Stripe Connect id) — never inserts a new directory row.
2. Upserts the Prisma `Vendor` keyed by the claimed slug (`acceptsBookings` / `accepts_bookings` are **true only when** onboarding `stripe_account_id` is present).
3. Upserts Prisma `ClassSession` rows from active onboarding calendar classes (`initial` / `renewal` only) — **skipped entirely** when Stripe is absent, so a listing-only instructor never has bookable inventory.

**Stripe Connect is optional; bookings are what it gates.** Without `stripe_account_id` an instructor can claim, finish all six steps, publish, and keep editing their listing — the profile, contact details, and pricing all go live. What stays off is booking: `accepts_bookings` / `acceptsBookings` are false, no `ClassSession` rows are scaffolded, `/instructors/{slug}` hides Book Now, `/instructors/{slug}/book` redirects to the profile, and `/api/bookings/checkout` refuses. The dashboard shows a persistent "Listing is live. Connect Stripe to accept bookings." banner plus an inline prompt on Classes & Schedule. Connecting later from the dashboard (`/api/stripe-connect/connect`) re-runs the same publish sync in `/api/stripe-connect/callback`, which flips `accepts_bookings` on and scaffolds the sessions.

**Live sync allowlist:** set `PUBLISH_LIVE_SLUG_ALLOWLIST` to a comma-separated list of claimed slugs (e.g. the claim-funnel test listing above) so only those publishes run steps 1–3. Other instructors can still finish onboarding (`is_published`), but live sync is skipped and logged. **Full go-live:** clear / unset `PUBLISH_LIVE_SLUG_ALLOWLIST`. `npm run check:instructor-funnel` warns loudly when the allowlist is set.

Re-publish is idempotent (listing UPDATE + Prisma upsert; existing sessions matched by vendor + start time + class type are updated, not deleted). Apply `migrations/publish-booking-columns.sql` once so listing rows can store `accepts_bookings` / `stripe_connect_account_id`:

```bash
npm run check:vendor-db-env
npm run migrate:sql -- --file migrations/publish-booking-columns.sql --target listings
```

### Booking (dev)

End-to-end booking uses **Stripe Checkout** with **Stripe Connect** (destination charges + platform fee). To exercise the flow locally:

1. **Environment**
   - `DATABASE_URL` — PostgreSQL (e.g. Supabase)
   - `STRIPE_SECRET_KEY` — test mode secret key
   - `STRIPE_WEBHOOK_SECRET` — signing secret for webhooks (from Stripe Dashboard or Stripe CLI)
   - `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000` (used for Checkout success/cancel URLs)

2. **Demo vendor**
   - After seed, **`/instructors/demo-ccw-booking/book`** lists **five** sandbox class times (mix of initial and renewal; demo instructor is clearly labeled in name/description).
   - Optional: `DEMO_VENDOR_STRIPE_CONNECT_ACCOUNT_ID` — set to a **test** Connect account id (`acct_...`) from the [Stripe Dashboard](https://dashboard.stripe.com/test/connect/accounts/overview), then run `npm run db:seed` again so the demo vendor row gets `stripeConnectAccountId`. Without it, sessions still appear but Checkout returns 503 until the id is set (in env + re-seed, or directly in the DB).

3. **Webhooks (local)**
   - Forward `checkout.session.completed` to your app, e.g. with [Stripe CLI](https://stripe.com/docs/stripe-cli):  
     `stripe listen --forward-to localhost:3000/api/webhooks/stripe`  
   - The webhook creates the `Booking` record and increments class enrollment after payment.

### County hero images (local folder)

Source photos live in **`County Images/`** at the project root (named like `Fresno County.jpg`, `contra-costa-county.webp`, `San Diego - 2.png`). They are copied into **`public/county-images/`** with URL slugs (`fresno.jpg`, `contra-costa.webp`, `san-diego.png`) when you run:

```bash
npm run pull:county-images
```

`npm run build` runs that copy step automatically, then regenerates `src/data/county-images-local.generated.ts`. Counties without a file in `County Images/` still use Unsplash fallbacks from `src/data/county-images.ts`.

### Google Reviews integration

Vendor profile pages can show Google Business reviews in the `Reviews` tab.

- **Required env var**
  - `GOOGLE_PLACES_API_KEY` (server-only): used by `src/app/api/google-reviews/route.ts`
- **Vendor data mapping**
  - Provide `googlePlaceId`/`google_place_id` on vendor rows
  - Optional `googleReviewsUrl`/`google_reviews_url` is used for "View all on Google" links
- **Behavior**
  - On vendor profiles, the Reviews UI (including Google Places fetch) mounts **only when** `?tab=reviews`: viewing About or What To Bring does not call Places API.
  - The Reviews tab link uses `prefetch={false}` so Next.js doesn’t prefetch that route in the background.
  - If `googlePlaceId` exists and `fetchGoogleReviews` is enabled on that route, the client fetches `/api/google-reviews?placeId=...` once after mount (opening Reviews tab or landing directly on `?tab=reviews`).
  - If missing, the UI shows a connected-account empty state and falls back to directory-native reviews
  - If Google API fails, the UI shows a non-blocking fallback message and still renders directory-native reviews
- **Caching and quota**
  - The API route keeps a per-instance in-memory cache for 15 minutes per place id
  - Upstream Google Place Details calls also use Next.js fetch revalidation (`revalidate: 3600`)
  - This reduces repeated calls and helps manage Places API quotas/costs

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── ca/                 # California state + county pages
│   │   └── [county]/       # County instructor listings
│   ├── instructors/        # All instructors + profile pages
│   │   └── [slug]/
│   ├── sitemap.ts
│   └── robots.ts
├── components/
├── data/                   # Seed data (vendors, counties)
├── lib/                    # Filtering, utilities
└── types/
```

## Data Model

- **Vendor**: name, location, counties served, class types, formats, pricing, contact
- **County**: slug, display name (CA’s 58 counties)
- Filters are URL-driven for shareable, bookmarkable results

## Migration Path to Supabase

1. Create `vendors` and `counties` tables in Supabase
2. Replace `data/vendors.ts` and `data/counties.ts` with API calls or server components that query Supabase
3. Add auth (Supabase Auth) for vendor dashboards
4. Add payments (Stripe) for featured listings

## Adding New States

1. Add state slug + counties to `data/counties.ts` (or DB)
2. Create `/app/[state]/page.tsx` and `/app/[state]/[county]/page.tsx`
3. Update sitemap and navigation

## License

Private / All rights reserved
