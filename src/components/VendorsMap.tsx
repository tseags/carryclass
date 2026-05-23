"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import type { VendorMapPin } from "@/lib/vendor-map-pins";

const pinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function InvalidateSizeOnReady() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 50);
    return () => window.clearTimeout(t);
  }, [map]);
  return null;
}

function FitBoundsToPins({ pins, hasFilter }: { pins: VendorMapPin[]; hasFilter: boolean }) {
  const map = useMap();

  useEffect(() => {
    const coords = pins.map((pin) => pin.coordinates);
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], hasFilter ? 13 : 11);
      return;
    }
    map.fitBounds(L.latLngBounds(coords), {
      padding: [40, 40],
      maxZoom: hasFilter ? 12 : 7,
    });
  }, [map, hasFilter, pins]);

  return null;
}

interface VendorsMapProps {
  pins: VendorMapPin[];
  hasFilter: boolean;
}

export function VendorsMap({ pins, hasFilter }: VendorsMapProps) {
  const defaultCenter: [number, number] = [36.7783, -119.4179];
  const defaultZoom = 6;

  return (
    <div className="vendors-map-wrapper">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="vendors-map-container"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <InvalidateSizeOnReady />
        {pins.length > 0 && <FitBoundsToPins pins={pins} hasFilter={hasFilter} />}
        {pins.map((pin) => (
          <Marker key={pin.pinKey} position={pin.coordinates} icon={pinIcon}>
            <Popup>
              <div className="vendors-map-popup">
                <strong>{pin.name}</strong>
                <br />
                <span className="text-neutral-600">{pin.label}</span>
                <br />
                <Link href={`/vendors/${pin.slug}`} className="vendors-map-popup-link">
                  View details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
