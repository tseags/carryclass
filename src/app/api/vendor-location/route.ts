import { NextResponse } from "next/server";
import { resolveVendorLocation } from "@/lib/vendor-location";
import type { Coordinates } from "@/data/vendor-coordinates";

export const runtime = "nodejs";

const GEOCODE_TIMEOUT_MS = 4_000;
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

const geocodeCache = new Map<string, { expiresAt: number; value: Coordinates | null }>();
const inflightGeocodes = new Map<string, Promise<Coordinates | null>>();

async function geocodeWithNominatim(query: string): Promise<Coordinates | null> {
  const cacheHit = geocodeCache.get(query);
  if (cacheHit && cacheHit.expiresAt > Date.now()) {
    return cacheHit.value;
  }

  const pending = inflightGeocodes.get(query);
  if (pending) {
    return pending;
  }

  const geocodePromise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        {
          headers: {
            "User-Agent": "ccw-directory/1.0",
            Accept: "application/json",
          },
          signal: controller.signal,
          cache: "no-store",
        }
      );

      if (!response.ok) {
        geocodeCache.set(query, { value: null, expiresAt: Date.now() + CACHE_TTL_MS });
        return null;
      }

      const payload = (await response.json()) as Array<{ lat?: string; lon?: string }>;
      const first = payload[0];
      const lat = first?.lat ? Number.parseFloat(first.lat) : Number.NaN;
      const lng = first?.lon ? Number.parseFloat(first.lon) : Number.NaN;
      const value: Coordinates | null = Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;

      geocodeCache.set(query, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      return value;
    } catch {
      geocodeCache.set(query, { value: null, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    } finally {
      clearTimeout(timeout);
      inflightGeocodes.delete(query);
    }
  })();

  inflightGeocodes.set(query, geocodePromise);
  return geocodePromise;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const address = searchParams.get("address") ?? undefined;
  const city = searchParams.get("city") ?? undefined;
  const county = searchParams.get("county") ?? undefined;
  const state = searchParams.get("state") ?? undefined;

  const resolution = await resolveVendorLocation(
    {
      address,
      city,
      county,
      state,
    },
    { geocode: geocodeWithNominatim }
  );

  // In-memory cache is process-local; replace with a shared cache if deploying to multi-instance infra.
  return NextResponse.json(resolution);
}
