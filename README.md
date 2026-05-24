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
