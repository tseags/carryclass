import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

export const SITE_NAME = "CarryClass";

export const DEFAULT_SITE_DESCRIPTION =
  "Find sheriff-approved CCW classes and certified instructors in California. Browse by county, compare prices, and get your permit.";

/** Next.js serves this route from `src/app/opengraph-image.tsx`. */
export const DEFAULT_OG_IMAGE_PATH = "/opengraph-image";

export const NOINDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
};

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

function resolveImageUrl(imageUrl: string): string {
  return imageUrl.startsWith("http") ? imageUrl : absoluteUrl(imageUrl);
}

export function buildOpenGraph(options: {
  title: string;
  description: string;
  path?: string;
  imageUrl?: string | null;
  type?: "website" | "article";
}): NonNullable<Metadata["openGraph"]> {
  const url = options.path ? absoluteUrl(options.path) : SITE_URL;
  const og: NonNullable<Metadata["openGraph"]> = {
    title: options.title,
    description: options.description,
    siteName: SITE_NAME,
    type: options.type ?? "website",
    url,
  };
  if (options.imageUrl) {
    og.images = [{ url: resolveImageUrl(options.imageUrl) }];
  }
  return og;
}

export function buildTwitter(options: {
  title: string;
  description: string;
  imageUrl?: string | null;
}): NonNullable<Metadata["twitter"]> {
  const twitter: NonNullable<Metadata["twitter"]> = {
    card: "summary_large_image",
    title: options.title,
    description: options.description,
  };
  if (options.imageUrl) {
    twitter.images = [resolveImageUrl(options.imageUrl)];
  }
  return twitter;
}

export function pageMetadata(options: {
  title: string;
  description: string;
  path?: string;
  imageUrl?: string | null;
  canonical?: string;
  robots?: Metadata["robots"];
}): Metadata {
  const canonicalPath = options.canonical ?? options.path;
  return {
    title: options.title,
    description: options.description,
    ...(options.robots ? { robots: options.robots } : {}),
    ...(canonicalPath
      ? { alternates: { canonical: absoluteUrl(canonicalPath) } }
      : {}),
    openGraph: buildOpenGraph({
      title: options.title,
      description: options.description,
      path: options.path,
      imageUrl: options.imageUrl,
    }),
    twitter: buildTwitter({
      title: options.title,
      description: options.description,
      imageUrl: options.imageUrl,
    }),
  };
}

/** True when any query param is present (filters, sort, view, search, etc.). */
export function hasActiveSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): boolean {
  return Object.entries(searchParams).some(([, value]) => {
    if (value == null) return false;
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== "string") return false;
    return raw.trim().length > 0;
  });
}

/** Canonical base path when filters are active; otherwise undefined. */
export function canonicalForFilteredListing(
  basePath: string,
  searchParams: Record<string, string | string[] | undefined>
): string | undefined {
  return hasActiveSearchParams(searchParams) ? basePath : undefined;
}
