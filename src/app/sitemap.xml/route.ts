import { CALIFORNIA_COUNTIES } from "@/data/counties";
import { SITE_URL } from "@/lib/site-url";
import { getAllVendors } from "@/lib/vendors-db";

/** Regenerate daily so new instructor profiles appear without a full redeploy. */
export const revalidate = 86400;

type SitemapEntry = {
  path: string;
  changefreq: "weekly" | "monthly" | "yearly";
  priority: number;
};

const STATIC_PAGES: SitemapEntry[] = [
  { path: "", changefreq: "weekly", priority: 1 },
  { path: "/ca", changefreq: "weekly", priority: 0.9 },
  { path: "/instructors", changefreq: "weekly", priority: 0.9 },
  { path: "/about", changefreq: "monthly", priority: 0.5 },
  { path: "/privacy", changefreq: "yearly", priority: 0.3 },
  { path: "/terms", changefreq: "yearly", priority: 0.3 },
  { path: "/instructors/claim", changefreq: "monthly", priority: 0.6 },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const base = SITE_URL;
  const lastmod = new Date().toISOString();

  const entries: SitemapEntry[] = [
    ...STATIC_PAGES,
    ...CALIFORNIA_COUNTIES.map((county) => ({
      path: `/ca/${county}`,
      changefreq: "weekly" as const,
      priority: 0.8,
    })),
  ];

  try {
    const vendors = await getAllVendors();
    for (const vendor of vendors) {
      entries.push({
        path: `/instructors/${vendor.slug}`,
        changefreq: "weekly",
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error("[sitemap] vendor fetch failed; serving static + county pages only", error);
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `<url>
<loc>${escapeXml(`${base}${entry.path}`)}</loc>
<lastmod>${lastmod}</lastmod>
<changefreq>${entry.changefreq}</changefreq>
<priority>${entry.priority}</priority>
</url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Keep a warm copy on the CDN so crawlers never trigger a cold DB-backed regeneration.
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
