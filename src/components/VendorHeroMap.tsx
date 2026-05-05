"use client";

import { useEffect } from "react";
import { useState } from "react";
import Link from "next/link";
import { buildVendorLocationQueries } from "@/lib/vendor-location";

interface VendorHeroMapProps {
  vendorName: string;
  city: string;
  county: string;
  state: string;
  address?: string;
}

export function VendorHeroMap({
  vendorName,
  city,
  county,
  state,
  address,
}: VendorHeroMapProps) {
  const [hasEmbedError, setHasEmbedError] = useState(false);
  const [resolvedQuery, setResolvedQuery] = useState(() => {
    const fallback = buildVendorLocationQueries({ address, city, county, state });
    return fallback.googleMapsQuery;
  });

  useEffect(() => {
    let canceled = false;
    const controller = new AbortController();
    const fallback = buildVendorLocationQueries({ address, city, county, state });

    setResolvedQuery(fallback.googleMapsQuery);
    setHasEmbedError(false);

    const params = new URLSearchParams();
    if (address?.trim()) params.set("address", address.trim());
    if (city?.trim()) params.set("city", city.trim());
    if (county?.trim()) params.set("county", county.trim());
    if (state?.trim()) params.set("state", state.trim());

    void fetch(`/api/vendor-location?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { coordinates?: [number, number] | null; googleMapsQuery?: string; resolvedQuery?: string } | null) => {
        if (canceled || !payload) return;
        setResolvedQuery(payload.googleMapsQuery || payload.resolvedQuery || fallback.googleMapsQuery);
      })
      .catch(() => {
        // Keep local fallback if the API call fails.
      });

    return () => {
      canceled = true;
      controller.abort();
    };
  }, [address, city, county, state]);

  const googleEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(resolvedQuery)}&output=embed`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resolvedQuery)}`;

  if (!resolvedQuery || hasEmbedError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-100 p-4 text-center">
        <p className="text-sm font-medium text-zinc-700">Map preview unavailable for this location.</p>
        <Link
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-700"
        >
          Open in Google Maps
        </Link>
      </div>
    );
  }

  return (
    <iframe
      title={`Google map for ${vendorName}`}
      src={googleEmbedUrl}
      className="vendor-hero-map absolute inset-0 h-full w-full border-0"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      onError={() => {
        setHasEmbedError(true);
      }}
      allowFullScreen
    />
  );
}
