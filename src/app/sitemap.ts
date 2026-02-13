import { MetadataRoute } from "next";
import { CALIFORNIA_COUNTIES } from "@/data/counties";
import { VENDORS } from "@/data/vendors";

export default function sitemap(): MetadataRoute.Sitemap {
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

  const vendorPages: MetadataRoute.Sitemap = VENDORS.map((vendor) => ({
    url: `${base}/vendors/${vendor.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...countyPages, ...vendorPages];
}
