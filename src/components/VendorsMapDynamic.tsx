"use client";

import dynamic from "next/dynamic";
import type { Vendor } from "@/types";

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
  vendors: Vendor[];
  hasFilter: boolean;
}

export function VendorsMapDynamic({ vendors, hasFilter }: VendorsMapDynamicProps) {
  return <VendorsMap vendors={vendors} hasFilter={hasFilter} />;
}
