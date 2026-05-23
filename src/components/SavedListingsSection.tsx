"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getCountyDisplayName } from "@/data/counties";
import { SaveHeartButton } from "@/components/SaveHeartButton";
import type { SavedVendorListItem } from "@/lib/saved-vendors";

type SavedListingsSectionProps = {
  initialItems: SavedVendorListItem[];
  totalCount: number;
  page: number;
  totalPages: number;
};

export function SavedListingsSection({
  initialItems,
  totalCount,
  page,
  totalPages,
}: SavedListingsSectionProps) {
  const [items, setItems] = useState(initialItems);
  const localCount = Math.max(totalCount - (initialItems.length - items.length), 0);

  const heading = useMemo(
    () => `Saved Listings (${localCount})`,
    [localCount]
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-800">{heading}</h2>

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-600">
          You haven&apos;t saved any listings yet.{" "}
          <Link href="/vendors" className="font-medium text-[var(--navy)] underline-offset-2 hover:underline">
            Browse vendors
          </Link>
          .
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 px-4 py-3"
              >
                <div>
                  <Link href={`/vendors/${item.vendor.slug}`} className="text-sm font-semibold text-zinc-900 hover:underline">
                    {item.vendor.name}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-600">
                    {item.vendor.city?.trim()
                      ? `${item.vendor.city.trim()}, ${getCountyDisplayName(item.vendor.county)} County`
                      : `${getCountyDisplayName(item.vendor.county)} County`}
                  </p>
                </div>
                <SaveHeartButton
                  vendorId={item.vendorId}
                  initialSaved
                  size="sm"
                  onSavedChange={(saved) => {
                    if (!saved) {
                      setItems((prev) => prev.filter((candidate) => candidate.id !== item.id));
                    }
                  }}
                />
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-600">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-3">
                {page > 1 ? (
                  <Link href={`/dashboard/student?savedPage=${page - 1}`} className="font-medium hover:underline">
                    Previous
                  </Link>
                ) : (
                  <span className="opacity-40">Previous</span>
                )}
                {page < totalPages ? (
                  <Link href={`/dashboard/student?savedPage=${page + 1}`} className="font-medium hover:underline">
                    Next
                  </Link>
                ) : (
                  <span className="opacity-40">Next</span>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
