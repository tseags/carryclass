import { MetadataRoute } from "next";
import { CALIFORNIA_COUNTIES } from "@/data/counties";
import { SITE_URL } from "@/lib/site-url";
import { getAllVendors } from "@/lib/vendors-db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/ca`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/instructors`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/instructors/claim`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  const countyPages: MetadataRoute.Sitemap = CALIFORNIA_COUNTIES.map((county) => ({
    url: `${base}/ca/${county}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  let vendorPages: MetadataRoute.Sitemap = [];
  try {
    const vendors = await getAllVendors();
    vendorPages = vendors.map((vendor) => ({
      url: `${base}/instructors/${vendor.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB may be unavailable during build (e.g. TLS/cert issues); include static + county pages only
  }

  return [...staticPages, ...countyPages, ...vendorPages];
}
