import type { Vendor } from "@/types";

export type CountyStatsSummary = {
  vendorCount: number;
  avgInitial: number | null;
  avgRenewal: number | null;
};

/**
 * Aggregates instructor count and average initial / renewal prices for vendors
 * in a county. Price logic mirrors `formatInitialRenewalPrices` in utils.
 */
export function getCountyStats(vendors: Vendor[]): CountyStatsSummary {
  const initialPrices: number[] = [];
  const renewalPrices: number[] = [];

  for (const v of vendors) {
    if (v.classTypes.includes("initial") || v.classTypes.includes("both")) {
      const p = v.priceInitial ?? v.priceMax ?? v.priceMin;
      if (p != null) initialPrices.push(p);
    }
    if (v.classTypes.includes("renewal") || v.classTypes.includes("both")) {
      const p = v.priceRenewal ?? v.priceMin;
      if (p != null) renewalPrices.push(p);
    }
  }

  const avg = (values: number[]) =>
    values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : null;

  return {
    vendorCount: vendors.length,
    avgInitial: avg(initialPrices),
    avgRenewal: avg(renewalPrices),
  };
}
