import { MetadataRoute } from "next";
import { CALIFORNIA_COUNTIES } from "@/data/counties";
import { getAllVendors } from "@/lib/vendors-db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://ccw-directory.example.com"; // Update with your domain

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/ca`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/vendors`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
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
      url: `${base}/vendors/${vendor.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB may be unavailable during build (e.g. TLS/cert issues); include static + county pages only
  }

  return [...staticPages, ...countyPages, ...vendorPages];
}
