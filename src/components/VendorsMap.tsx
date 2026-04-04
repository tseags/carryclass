"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import type { Vendor } from "@/types";
import { getCoordinatesForVendor } from "@/data/vendor-coordinates";

// Google Maps–style teardrop pin (traditional)
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

function FitBoundsToVendors({ vendors, hasFilter }: { vendors: Vendor[]; hasFilter: boolean }) {
  const map = useMap();

  useEffect(() => {
    const coords = vendors
      .map((v) => getCoordinatesForVendor(v.city, v.county))
      .filter((c): c is [number, number] => c != null);
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], hasFilter ? 11 : 9);
      return;
    }
    map.fitBounds(L.latLngBounds(coords), {
      padding: [40, 40],
      maxZoom: hasFilter ? 10 : 7,
    });
  }, [map, hasFilter, vendors]);

  return null;
}

interface VendorsMapProps {
  vendors: Vendor[];
  hasFilter: boolean;
}

export function VendorsMap({ vendors, hasFilter }: VendorsMapProps) {
  const withCoords = vendors.filter((v) => getCoordinatesForVendor(v.city, v.county) != null);
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
        {withCoords.length > 0 && <FitBoundsToVendors vendors={withCoords} hasFilter={hasFilter} />}
        {withCoords.map((vendor) => {
          const pos = getCoordinatesForVendor(vendor.city, vendor.county)!;
          return (
            <Marker key={vendor.id} position={pos} icon={pinIcon}>
              <Popup>
                <div className="vendors-map-popup">
                  <strong>{vendor.name}</strong>
                  <br />
                  <span className="text-neutral-600">
                    {vendor.city}, {vendor.county.replace(/-/g, " ")}
                  </span>
                  <br />
                  <Link href={`/vendors/${vendor.slug}`} className="vendors-map-popup-link">
                    View details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
