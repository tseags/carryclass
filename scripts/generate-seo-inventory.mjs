/**
 * Generates docs/seo-headings-inventory.csv from a curated inventory.
 * Run: node scripts/generate-seo-inventory.mjs
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const COUNTIES = [
  ["alameda", "Alameda"],
  ["alpine", "Alpine"],
  ["amador", "Amador"],
  ["butte", "Butte"],
  ["calaveras", "Calaveras"],
  ["colusa", "Colusa"],
  ["contra-costa", "Contra Costa"],
  ["del-norte", "Del Norte"],
  ["el-dorado", "El Dorado"],
  ["fresno", "Fresno"],
  ["glenn", "Glenn"],
  ["humboldt", "Humboldt"],
  ["imperial", "Imperial"],
  ["inyo", "Inyo"],
  ["kern", "Kern"],
  ["kings", "Kings"],
  ["lake", "Lake"],
  ["lassen", "Lassen"],
  ["los-angeles", "Los Angeles"],
  ["madera", "Madera"],
  ["marin", "Marin"],
  ["mariposa", "Mariposa"],
  ["mendocino", "Mendocino"],
  ["merced", "Merced"],
  ["modoc", "Modoc"],
  ["mono", "Mono"],
  ["monterey", "Monterey"],
  ["napa", "Napa"],
  ["nevada", "Nevada"],
  ["orange", "Orange"],
  ["placer", "Placer"],
  ["plumas", "Plumas"],
  ["riverside", "Riverside"],
  ["sacramento", "Sacramento"],
  ["san-benito", "San Benito"],
  ["san-bernardino", "San Bernardino"],
  ["san-diego", "San Diego"],
  ["san-francisco", "San Francisco"],
  ["san-joaquin", "San Joaquin"],
  ["san-luis-obispo", "San Luis Obispo"],
  ["san-mateo", "San Mateo"],
  ["santa-barbara", "Santa Barbara"],
  ["santa-clara", "Santa Clara"],
  ["santa-cruz", "Santa Cruz"],
  ["shasta", "Shasta"],
  ["sierra", "Sierra"],
  ["siskiyou", "Siskiyou"],
  ["solano", "Solano"],
  ["sonoma", "Sonoma"],
  ["stanislaus", "Stanislaus"],
  ["sutter", "Sutter"],
  ["tehama", "Tehama"],
  ["trinity", "Trinity"],
  ["tulare", "Tulare"],
  ["tuolumne", "Tuolumne"],
  ["ventura", "Ventura"],
  ["yolo", "Yolo"],
  ["yuba", "Yuba"],
];

const TITLE_TEMPLATE = "%s | CarryClass";
const ROOT_DEFAULT_TITLE =
  "CarryClass | Find CCW Classes & Instructors Near Me";
const ROOT_DEFAULT_DESCRIPTION =
  "Find sheriff-approved CCW classes and certified instructors in California. Browse by county, compare prices, and get your permit.";

/** @param {string} title */
function withTemplate(title) {
  if (!title) return "";
  if (title.includes("| CarryClass") || title.startsWith("CarryClass |")) {
    return title;
  }
  return TITLE_TEMPLATE.replace("%s", title);
}

/** @param {Record<string, string>} row */
function csvRow(row) {
  const cols = [
    row.route ?? "",
    row.page_type ?? "",
    row.section ?? "",
    row.title_metadata ?? "",
    row.title_in_browser ?? "",
    row.meta_description ?? "",
    row.h1 ?? "",
    row.h2s ?? "",
    row.h3s ?? "",
    row.notes ?? "",
  ];
  return cols
    .map((c) => {
      const s = String(c);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(",");
}

/** @type {Record<string, string>[]} */
const rows = [];

function add(row) {
  const meta = row.title_metadata ?? "";
  const inherits =
    meta.startsWith("(inherits") || meta === "(no page metadata — uses root default)";
  rows.push({
    ...row,
    title_in_browser: inherits
      ? "(same as parent page)"
      : row.title_in_browser ?? withTemplate(meta),
  });
}

// --- Global defaults (layout.tsx) ---
add({
  route: "(root layout default)",
  page_type: "metadata default",
  section: "",
  title_metadata: ROOT_DEFAULT_TITLE,
  meta_description: ROOT_DEFAULT_DESCRIPTION,
  h1: "",
  h2s: "",
  h3s: "",
  notes:
    "Used when a page has no title. Child pages set their own metadata. Template: %s | CarryClass",
});

// --- Static pages ---
add({
  route: "/",
  page_type: "page",
  section: "main",
  title_metadata: "Find CCW Classes Near Me | CarryClass California",
  meta_description:
    "Find concealed carry classes near you. Browse sheriff-approved CCW instructors across California, compare prices and reviews, and book your class.",
  h1: "Find CCW Classes Near You in California",
  h2s: "",
  h3s: "",
  notes: "Homepage hero",
});

add({
  route: "/",
  page_type: "section",
  section: "CountyScrollSection",
  title_metadata: "(inherits /)",
  meta_description: "(inherits /)",
  h1: "",
  h2s: "Find CCW Classes by County",
  h3s: "",
  notes: "Component: CountyScrollClient.tsx",
});

add({
  route: "/",
  page_type: "section",
  section: "ExploreByCategory",
  title_metadata: "(inherits /)",
  meta_description: "(inherits /)",
  h1: "",
  h2s: "Explore by category",
  h3s: "16-Hour Initial | 8-Hour Renewal | Add a Gun | Virtual Classes (card titles use h4)",
  notes: "Component: ExploreByCategory.tsx",
});

add({
  route: "/",
  page_type: "section",
  section: "Popular instructors",
  title_metadata: "(inherits /)",
  meta_description: "(inherits /)",
  h1: "",
  h2s: "Popular CCW classes",
  h3s: "",
  notes: "Eyebrow: Featured instructors",
});

add({
  route: "/",
  page_type: "section",
  section: "By the numbers",
  title_metadata: "(inherits /)",
  meta_description: "(inherits /)",
  h1: "",
  h2s: "California's CCW classes, all in one place.",
  h3s: "",
  notes: "Eyebrow: By the numbers",
});

add({
  route: "/",
  page_type: "section",
  section: "HomeTestimonials",
  title_metadata: "(inherits /)",
  meta_description: "(inherits /)",
  h1: "",
  h2s: "How was your experience finding a CCW class?",
  h3s: "",
  notes: "Component: HomeTestimonials.tsx",
});

add({
  route: "/",
  page_type: "section",
  section: "GearCtaSection",
  title_metadata: "(inherits /)",
  meta_description: "(inherits /)",
  h1: "",
  h2s: "Find the Best Gear for CCW Training & Everyday Carry",
  h3s: "",
  notes: "Hidden when SHOW_GEAR_SECTIONS=false (currently off). Component: GearCtaSection.tsx",
});

add({
  route: "/",
  page_type: "section",
  section: "HomeNewsletter",
  title_metadata: "(inherits /)",
  meta_description: "(inherits /)",
  h1: "",
  h2s: "Subscribe for CCW updates",
  h3s: "",
  notes: "Hidden when SHOW_SUBSCRIBE_SECTIONS=false (currently off). Component: HomeNewsletter.tsx",
});

add({
  route: "/instructors",
  page_type: "page",
  section: "main",
  title_metadata: "CCW Classes Near Me | California CCW Instructors",
  meta_description:
    "Browse all sheriff-approved CCW instructors in California. Filter by county, class type, price, or format to find CCW classes near you.",
  h1: "Find California CCW Instructors",
  h2s: "Filters",
  h3s: "",
  notes: "Breadcrumb current: Find CCW Classes",
});

add({
  route: "/ca",
  page_type: "page",
  section: "main",
  title_metadata: "California CCW Classes by County | CCW Classes CA",
  meta_description:
    "Browse California counties with listed CCW instructors. Find sheriff-approved providers and renewal class details near you.",
  h1: "Find CCW Training by County in California",
  h2s: "Filters | {N} counties (dynamic count)",
  h3s: "",
  notes: "County cards use h3: {Name} County",
});

add({
  route: "/instructors/{slug}",
  page_type: "dynamic page",
  section: "main",
  title_metadata: "{vendor.name} | CCW Training",
  meta_description:
    "{vendor.description} OR {vendor.name} - CCW training in {city}, {County} County.",
  h1: "{vendor.name}",
  h2s:
    "About (About tab) | What to bring to class (What To Bring tab) | Reviews (sr-only on profile tab) | More CCW Classes (related instructors)",
  h3s:
    "Available Classes & Prices | Counties Served | Contact (sidebar)",
  notes:
    "Class cards use h4: 16-Hour Initial CCW Class, 8-Hour Renewal CCW Class, Add a Gun to Permit, etc.",
});

add({
  route: "/instructors/{slug}/book",
  page_type: "page",
  section: "main",
  title_metadata: "(no page metadata — uses root default)",
  meta_description: "(root default)",
  h1: "Book a class",
  h2s: "Choose a session | Your details | Order summary (form steps)",
  h3s: "",
  notes: "Only when vendor.acceptsBookings. Component: VendorBookForm.tsx",
});

add({
  route: "/instructors/{slug}/book/success",
  page_type: "page",
  section: "main",
  title_metadata: "(no page metadata — uses root default)",
  meta_description: "(root default)",
  h1: "Booking confirmed",
  h2s: "{vendorName} (dynamic)",
  h3s: "",
  notes: "BookingSuccessClient.tsx",
});

add({
  route: "/instructors/claim",
  page_type: "page",
  section: "main",
  title_metadata: "Claim Your CCW Listing | CarryClass",
  meta_description:
    "CCW instructors and ranges can claim or request a listing so students can find their classes in the CarryClass directory.",
  h1: "Claim or add your CCW listing",
  h2s: "",
  h3s: "",
  notes: "",
});

add({
  route: "/faqs",
  page_type: "page",
  section: "main",
  title_metadata: "CCW FAQs | California CCW Requirements & Renewal",
  meta_description:
    "Answers to common questions about how to get a CCW in California, CCW requirements, renewal training, and finding approved classes near you.",
  h1: "California CCW FAQs",
  h2s: "",
  h3s: "",
  notes: "Content placeholder — coming soon",
});

add({
  route: "/about",
  page_type: "page",
  section: "main",
  title_metadata: "About CarryClass | California CCW Classes Directory",
  meta_description:
    "CarryClass is California's most complete directory of sheriff-approved CCW classes and instructors. Browse by county and find training near you.",
  h1: "About CarryClass",
  h2s: "",
  h3s: "",
  notes: "",
});

add({
  route: "/blog",
  page_type: "page",
  section: "main",
  title_metadata: "Blog | CarryClass – CCW Class Tips & California Guides",
  meta_description:
    "CCW class guides, California permit tips, and training articles from CarryClass.",
  h1: "Blog",
  h2s: "",
  h3s: "",
  notes: "Coming soon",
});

add({
  route: "/gear",
  page_type: "page",
  section: "main",
  title_metadata: "CCW Gear | CarryClass",
  meta_description:
    "Find the best holsters, belts, PPE, safes, and more for your CCW class and everyday carry.",
  h1: "(404 — page calls notFound())",
  h2s: "",
  h3s: "",
  notes: "Metadata exists but route returns 404",
});

add({
  route: "/privacy",
  page_type: "page",
  section: "main",
  title_metadata: "Privacy Policy",
  meta_description:
    "Privacy Policy for CarryClass — California's CCW classes directory.",
  h1: "Privacy Policy",
  h2s:
    "Overview | Information We Collect | How We Use Information | Directory Listings and Third Parties | Data Sharing | Contact",
  h3s: "",
  notes: "Browser title via template: Privacy Policy | CarryClass",
});

add({
  route: "/terms",
  page_type: "page",
  section: "main",
  title_metadata: "Terms of Service",
  meta_description:
    "Terms of Service for CarryClass — California's CCW classes directory.",
  h1: "Terms of Service",
  h2s:
    "Use of Site | Listings and Accuracy | No On-Site Booking or Payments | Limitation of Liability | Changes | Contact",
  h3s: "",
  notes: "Browser title via template: Terms of Service | CarryClass",
});

add({
  route: "/dashboard/student",
  page_type: "page",
  section: "main",
  title_metadata: "(no page metadata — uses root default)",
  meta_description: "(root default)",
  h1: "Welcome back, {firstName}",
  h2s: "Saved Listings ({count}) | County & renewal reminders",
  h3s: "",
  notes: "Auth required. SavedListingsSection.tsx",
});

add({
  route: "/dashboard/vendor",
  page_type: "page",
  section: "main",
  title_metadata: "(no page metadata — uses root default)",
  meta_description: "(root default)",
  h1: "Hi {firstName}, manage your CCW listing",
  h2s: "Claimed listings | Upcoming classes",
  h3s: "",
  notes: "Auth required",
});

add({
  route: "/dashboard",
  page_type: "redirect",
  section: "",
  title_metadata: "—",
  meta_description: "—",
  h1: "—",
  h2s: "",
  h3s: "",
  notes: "Redirects to /dashboard/student or /dashboard/vendor",
});

add({
  route: "/sign-in",
  page_type: "page",
  section: "main",
  title_metadata: "(Clerk — no app metadata)",
  meta_description: "(Clerk)",
  h1: "(Clerk SignIn UI)",
  h2s: "",
  h3s: "",
  notes: "Clerk-hosted sign-in component",
});

add({
  route: "/sign-up",
  page_type: "page",
  section: "main",
  title_metadata: "(Clerk — no app metadata)",
  meta_description: "(Clerk)",
  h1: "(Clerk SignUp UI)",
  h2s: "",
  h3s: "",
  notes: "Clerk-hosted sign-up component",
});

add({
  route: "/onboarding",
  page_type: "redirect",
  section: "",
  title_metadata: "—",
  meta_description: "—",
  h1: "—",
  h2s: "",
  h3s: "",
  notes: "Sets student role and redirects",
});

add({
  route: "(404)",
  page_type: "page",
  section: "main",
  title_metadata: "(no metadata — uses root default)",
  meta_description: "(root default)",
  h1: "Page not found",
  h2s: "",
  h3s: "",
  notes: "not-found.tsx",
});

// County pages — one row per county
for (const [slug, displayName] of COUNTIES) {
  const title = `${displayName} County CCW Classes | Sheriff-Approved Instructors`;
  add({
    route: `/ca/${slug}`,
    page_type: "county page",
    section: "main",
    title_metadata: title,
    meta_description: `Find sheriff-approved CCW classes in ${displayName} County, CA. Compare pricing, schedules, and formats for initial and renewal training.`,
    h1: `${displayName} County CCW Classes`,
    h2s:
      "Filters | {County} County by the Numbers | {County} County CCW Timelines | Find the Best Gear for CCW Training & Everyday Carry (if SHOW_GEAR_SECTIONS)",
    h3s: "",
    notes: "Gear section hidden when SHOW_GEAR_SECTIONS=false",
  });
}

// County page shared sections (template row)
add({
  route: "/ca/{county}",
  page_type: "section",
  section: "CcwTimelineSection",
  title_metadata: "(inherits county page)",
  meta_description: "(inherits)",
  h1: "",
  h2s: "{County} County CCW Timelines",
  h3s: "",
  notes: "Modal h2: How long did it take to get your permit, from application to issuance?",
});

const header = [
  "route",
  "page_type",
  "section",
  "title_metadata",
  "title_in_browser",
  "meta_description",
  "h1",
  "h2s",
  "h3s",
  "notes",
].join(",");

const body = rows.map(csvRow).join("\n");
const outPath = join(root, "docs", "seo-headings-inventory.csv");
writeFileSync(outPath, `${header}\n${body}\n`, "utf8");
console.log(`Wrote ${rows.length} rows to ${outPath}`);
