"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getCoordinatesForVendor } from "@/data/vendor-coordinates";

/** Google Maps brand red */
const GOOGLE_RED = "#EA4335";

interface VendorHeroMapProps {
  vendorName: string;
  city: string;
  county: string;
  state: string;
  address?: string;
}

function KeepMapSized() {
  const map = useMap();

  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const timeoutId = window.setTimeout(invalidate, 100);
    const onWindowResize = () => invalidate();

    window.addEventListener("resize", onWindowResize);

    const mapElement = map.getContainer();
    const observer = new ResizeObserver(() => invalidate());
    observer.observe(mapElement);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", onWindowResize);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

function useGoogleStylePinIcon() {
  return useMemo(
    () =>
      L.divIcon({
        className: "vendor-hero-map-marker",
        html: `<div class="vendor-hero-map-marker-inner" aria-hidden="true">
  <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
    <path fill="${GOOGLE_RED}" stroke="#fff" stroke-width="1.25" d="M16 2C10.5 2 6 6.5 6 12c0 6.5 8 16.5 10 19 2-2.5 10-12.5 10-19 0-5.5-4.5-10-10-10z"/>
    <circle cx="16" cy="12" r="3.5" fill="#fff"/>
  </svg>
</div>`,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -40],
      }),
    []
  );
}

export function VendorHeroMap({
  vendorName,
  city,
  county,
  state,
  address,
}: VendorHeroMapProps) {
  const coordinates = useMemo(() => getCoordinatesForVendor(city, county), [city, county]);
  const pinIcon = useGoogleStylePinIcon();

  const mapQuery = address ? `${address}, ${city}, ${state}` : `${city}, ${state}, USA`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  if (!coordinates) {
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
    <MapContainer
      center={coordinates}
      zoom={14}
      className="vendor-hero-map absolute inset-0 h-full w-full"
      style={{ display: "block" }}
      scrollWheelZoom={false}
      attributionControl
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
        maxNativeZoom={19}
      />
      <Marker position={coordinates} icon={pinIcon}>
        <Popup className="vendor-hero-map-popup">
          <strong>{vendorName}</strong>
          <br />
          {city}, {state}
          <br />
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
            Open in Google Maps
          </a>
        </Popup>
      </Marker>
      <KeepMapSized />
    </MapContainer>
  );
}
