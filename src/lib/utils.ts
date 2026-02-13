export function formatPrice(min?: number, max?: number): string {
  if (!min && !max) return "Contact for pricing";
  if (min && max && min === max) return `$${min}`;
  if (min && max) return `$${min}–$${max}`;
  if (min) return `From $${min}`;
  if (max) return `Up to $${max}`;
  return "Contact for pricing";
}

export function formatInitialRenewalPrices(
  vendor: { priceInitial?: number; priceRenewal?: number; priceMin?: number; priceMax?: number; classTypes: string[] }
): { initial?: string; renewal?: string } {
  const result: { initial?: string; renewal?: string } = {};
  // Initial (16hr) typically costs more than renewal (8hr)
  if (vendor.classTypes.includes("initial") || vendor.classTypes.includes("both")) {
    result.initial = vendor.priceInitial
      ? `16-Hour Initial: $${vendor.priceInitial}`
      : vendor.priceMax
        ? `16-Hour Initial: $${vendor.priceMax}`
        : vendor.priceMin
          ? `Initial: From $${vendor.priceMin}`
          : undefined;
  }
  if (vendor.classTypes.includes("renewal") || vendor.classTypes.includes("both")) {
    result.renewal = vendor.priceRenewal
      ? `8-Hour Renewal: $${vendor.priceRenewal}`
      : vendor.priceMin
        ? `8-Hour Renewal: $${vendor.priceMin}`
        : undefined;
  }
  return result;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function formatClassTypes(types: string[]): string {
  return types
    .map((t) => (t === "both" ? "Initial & Renewal" : t.charAt(0).toUpperCase() + t.slice(1)))
    .join(", ");
}

export function formatFormats(formats: string[]): string {
  return formats
    .map((f) => f.charAt(0).toUpperCase() + f.slice(1).replace("-", " "))
    .join(", ");
}
