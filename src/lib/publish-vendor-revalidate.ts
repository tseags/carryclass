import { revalidatePath, revalidateTag } from "next/cache";
import { VENDOR_DATA_CACHE_TAG } from "@/lib/vendors-db";

/** Bust every cached surface that renders a published instructor listing. */
export function revalidatePublishedVendorPaths(slug: string | null | undefined): void {
  const trimmed = slug?.trim();
  if (trimmed) revalidatePath(`/instructors/${trimmed}`);
  revalidateTag(VENDOR_DATA_CACHE_TAG, "max");
  revalidatePath("/sitemap.xml");
  revalidatePath("/");
  revalidatePath("/instructors");
  revalidatePath("/ca");
}
