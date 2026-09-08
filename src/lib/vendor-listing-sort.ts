import type { Vendor } from "@/types";

/** 0 = has 16-hr initial, 1 = renewal only, 2 = no course pricing */
function priceSortTier(v: Vendor): number {
  if (v.priceInitial != null) return 0;
  if (v.priceRenewal != null) return 1;
  return 2;
}

/** Sort key within a tier: initial for tier 0, renewal for tier 1. */
function priceWithinTier(v: Vendor): number | undefined {
  if (v.priceInitial != null) return v.priceInitial;
  if (v.priceRenewal != null) return v.priceRenewal;
  return undefined;
}

function sortByComparablePrice(vendors: Vendor[], direction: "asc" | "desc"): Vendor[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...vendors].sort((a, b) => {
    const tierDiff = priceSortTier(a) - priceSortTier(b);
    if (tierDiff !== 0) return tierDiff;

    const aPrice = priceWithinTier(a);
    const bPrice = priceWithinTier(b);
    if (aPrice != null && bPrice != null && aPrice !== bPrice) {
      return (aPrice - bPrice) * sign;
    }

    return a.name.localeCompare(b.name);
  });
}

export function applyListingSort(vendors: Vendor[], sort: string | undefined): Vendor[] {
  if (sort === "name") {
    return [...vendors].sort((a, b) => a.name.localeCompare(b.name));
  }
  if (sort === "name-desc") {
    return [...vendors].sort((a, b) => b.name.localeCompare(a.name));
  }
  if (sort === "price-low") {
    return sortByComparablePrice(vendors, "asc");
  }
  if (sort === "price-high") {
    return sortByComparablePrice(vendors, "desc");
  }
  return [...vendors].sort(
    (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false)
  );
}
