"use client";

import dynamic from "next/dynamic";

interface VendorHeroMapDynamicProps {
  vendorName: string;
  city: string;
  county: string;
  state: string;
  address?: string;
}

const VendorHeroMapClientOnly = dynamic(
  () => import("@/components/VendorHeroMap").then((m) => m.VendorHeroMap),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-zinc-200" aria-hidden />,
  }
);

export function VendorHeroMapDynamic(props: VendorHeroMapDynamicProps) {
  return <VendorHeroMapClientOnly {...props} />;
}
