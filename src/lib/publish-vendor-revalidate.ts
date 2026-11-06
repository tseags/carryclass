import { revalidatePath, revalidateTag } from "next/cache";
import { VENDOR_DATA_CACHE_TAG } from "@/lib/vendors-db";

/** Bust cached pages that list an instructor's bookable dates. */
export function revalidateInstructorSchedulePaths(slug: string | null | undefined): void {
  const trimmed = slug?.trim();
  if (!trimmed) return;
  revalidatePath(`/instructors/${trimmed}`);
  revalidatePath(`/instructors/${trimmed}/book`);
  revalidatePath(`/instructors/${trimmed}/classes`);
  revalidatePath(`/instructors/${trimmed}/classes/[classKey]`, "page");
}

/** Bust every cached surface that renders a published instructor listing. */
export function revalidatePublishedVendorPaths(slug: string | null | undefined): void {
  revalidateInstructorSchedulePaths(slug);
  revalidateTag(VENDOR_DATA_CACHE_TAG, "max");
  revalidatePath("/sitemap.xml");
  revalidatePath("/");
  revalidatePath("/instructors");
  revalidatePath("/ca");
}
