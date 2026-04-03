# CCW Training Directory

A directory and marketplace for CCW (Concealed Carry Weapon) training and related services. Built with Next.js for scale, filtering, and future product features.

## Features

- **Location-first navigation**: Browse by State → County → Vendors
- **SEO-friendly structure**: Static county pages, dynamic vendor profiles, sitemap
- **Filtering**: County, city, class type (initial/renewal), format (in-person/online/hybrid), price
- **Vendor profiles**: Rich detail pages with CTAs
- **Mobile-friendly**: Responsive, utility-first UI

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Data**: In-memory (JSON) — ready to migrate to Supabase/Postgres

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### County hero images (local folder)

Source photos live in **`County Images/`** at the project root (named like `Fresno County.jpg`, `contra-costa-county.webp`, `San Diego - 2.png`). They are copied into **`public/county-images/`** with URL slugs (`fresno.jpg`, `contra-costa.webp`, `san-diego.png`) when you run:

```bash
npm run pull:county-images
```

`npm run build` runs that copy step automatically, then regenerates `src/data/county-images-local.generated.ts`. Counties without a file in `County Images/` still use Unsplash fallbacks from `src/data/county-images.ts`.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── ca/                 # California state + county pages
│   │   └── [county]/       # County vendor listings
│   ├── vendors/            # All vendors + profile pages
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
