import { isReservedSlug } from "@/lib/reserved-slugs";
import { VANITY_SLUG_PATTERN } from "@/lib/vanity-slug";

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  profileSlug: string | null;
  expiresAt: number;
};

/** Per-isolate in-memory cache (Edge / Node). Caches hits and misses. */
const vanityCache = new Map<string, CacheEntry>();

export function clearVanityRedirectCache(): void {
  vanityCache.clear();
}

/** Always the Postgres listings table (where vanity_slug / profile_slug live). */
function vanityTableName(): string {
  return "carry_class_vendor_data";
}

/**
 * True when pathname is a single segment that could be a vanity slug
 * (not reserved, no file extension, not infra prefixes).
 */
export function shouldAttemptVanityLookup(pathname: string): boolean {
  return vanitySegmentFromPathname(pathname) !== null;
}

export function vanitySegmentFromPathname(pathname: string): string | null {
  if (!pathname || pathname === "/") return null;

  const trimmed =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("/_next") || trimmed.startsWith("/api")) return null;

  const raw = trimmed.slice(1);
  if (!raw || raw.includes("/")) return null;
  if (raw.includes(".")) return null;

  const segment = raw.toLowerCase();
  if (!VANITY_SLUG_PATTERN.test(segment)) return null;
  if (isReservedSlug(segment)) return null;

  return segment;
}

function readCache(vanity: string): string | null | undefined {
  const hit = vanityCache.get(vanity);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    vanityCache.delete(vanity);
    return undefined;
  }
  return hit.profileSlug;
}

function writeCache(vanity: string, profileSlug: string | null): void {
  vanityCache.set(vanity, {
    profileSlug,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Resolve vanity_slug → profile_slug via PostgREST (Edge-safe).
 * Returns null when unset / missing / on lookup failure (fall through to 404).
 */
export async function lookupProfileSlugForVanity(
  vanitySlug: string
): Promise<string | null> {
  const vanity = vanitySlug.trim().toLowerCase();
  if (!vanity) return null;

  const cached = readCache(vanity);
  if (cached !== undefined) return cached;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !apiKey) {
    writeCache(vanity, null);
    return null;
  }

  const table = encodeURIComponent(vanityTableName());
  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`);
  url.searchParams.set("select", "profile_slug");
  url.searchParams.set("vanity_slug", `eq.${vanity}`);
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      // Avoid Next data-cache coupling in middleware; we use our own TTL map.
      cache: "no-store",
    });

    if (!res.ok) {
      writeCache(vanity, null);
      return null;
    }

    const rows = (await res.json()) as Array<{ profile_slug?: string | null }>;
    const profileSlug =
      typeof rows?.[0]?.profile_slug === "string" && rows[0].profile_slug.trim()
        ? rows[0].profile_slug.trim()
        : null;

    writeCache(vanity, profileSlug);
    return profileSlug;
  } catch {
    writeCache(vanity, null);
    return null;
  }
}
