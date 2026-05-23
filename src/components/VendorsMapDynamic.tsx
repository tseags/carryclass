"use client";

import dynamic from "next/dynamic";
import type { VendorMapPin } from "@/lib/vendor-map-pins";

const VendorsMap = dynamic(
  () => import("@/components/VendorsMap").then((m) => m.VendorsMap),
  {
    ssr: false,
    loading: () => (
      <div className="vendors-map-wrapper vendors-map-skeleton">
        <span>Loading map…</span>
      </div>
    ),
  }
);

interface VendorsMapDynamicProps {
  pins: VendorMapPin[];
  hasFilter: boolean;
}

export function VendorsMapDynamic({ pins, hasFilter }: VendorsMapDynamicProps) {
  return <VendorsMap pins={pins} hasFilter={hasFilter} />;
}
