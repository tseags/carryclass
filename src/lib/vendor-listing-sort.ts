import type { Vendor } from "@/types";
import { vendorHasListedCoursePrice } from "@/lib/filter-vendors";

function comparableCoursePrice(v: Vendor, direction: "asc" | "desc"): number | undefined {
  const prices = [v.priceMin, v.priceMax, v.priceInitial, v.priceRenewal].filter(
    (p): p is number => p != null
  );
  if (prices.length === 0) return undefined;
  return direction === "asc" ? Math.min(...prices) : Math.max(...prices);
}

function sortByComparablePrice(vendors: Vendor[], direction: "asc" | "desc"): Vendor[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...vendors].sort((a, b) => {
    const aHasPrice = vendorHasListedCoursePrice(a);
    const bHasPrice = vendorHasListedCoursePrice(b);
    if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;

    const aPrice = comparableCoursePrice(a, direction);
    const bPrice = comparableCoursePrice(b, direction);
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
