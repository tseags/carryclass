import type { Vendor } from "@/types";

/** Who may see a vendor row: public directory pages vs authenticated claim flows. */
export type VendorAudience = "public" | "claim";

export function isVendorVisibleToAudience(
  vendor: Vendor,
  audience: VendorAudience = "public"
): boolean {
  if (audience === "claim") return true;
  return !vendor.hiddenFromDirectory;
}

/** Drop directory-hidden rows for public consumers; claim flows see all rows. */
export function filterVendorsByAudience(
  vendors: Vendor[],
  audience: VendorAudience = "public"
): Vendor[] {
  if (audience === "claim") return vendors;
  return vendors.filter((v) => !v.hiddenFromDirectory);
}
