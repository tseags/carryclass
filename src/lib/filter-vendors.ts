import type { Vendor, VendorFilters } from "@/types";

export function filterVendors(vendors: Vendor[], filters: VendorFilters): Vendor[] {
  let result = [...vendors];

  if (filters.county) {
    result = result.filter((v) =>
      v.countiesServed.some((c) => c.toLowerCase() === filters.county!.toLowerCase())
    );
  }

  if (filters.city) {
    result = result.filter(
      (v) => v.city.toLowerCase() === filters.city!.toLowerCase()
    );
  }

  if (filters.classType) {
    result = result.filter((v) =>
      v.classTypes.includes(filters.classType!) || v.classTypes.includes("both")
    );
  }

  if (filters.format) {
    result = result.filter((v) => v.formats.includes(filters.format!));
  }

  if (filters.priceMin != null) {
    result = result.filter((v) => (v.priceMax ?? v.priceMin ?? 0) >= filters.priceMin!);
  }

  if (filters.priceMax != null) {
    result = result.filter((v) => (v.priceMin ?? v.priceMax ?? Infinity) <= filters.priceMax!);
  }

  if (filters.search) {
    const query = filters.search.toLowerCase();
    result = result.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        v.city.toLowerCase().includes(query) ||
        v.description?.toLowerCase().includes(query)
    );
  }

  return result;
}
