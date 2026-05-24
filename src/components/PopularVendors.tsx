import Link from "next/link";
import { VendorCard } from "@/components/VendorCard";
import type { Vendor } from "@/types";

interface PopularVendorsProps {
  vendors: Vendor[];
}

export function PopularVendors({ vendors }: PopularVendorsProps) {
  return (
    <section className="py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-zinc-900">
          Popular CCW Instructors
        </h2>
        <Link
          href="/instructors"
          className="shrink-0 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          View All Instructors
        </Link>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((vendor) => (
          <VendorCard key={vendor.id} vendor={vendor} />
        ))}
      </div>
    </section>
  );
}
