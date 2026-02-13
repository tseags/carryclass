import Link from "next/link";
import type { Vendor } from "@/types";
import { formatInitialRenewalPrices } from "@/lib/utils";

interface VendorCardProps {
  vendor: Vendor;
  variant?: "default" | "outline"; // outline = white button with border for "other vendors" section
}

export function VendorCard({ vendor, variant = "default" }: VendorCardProps) {
  const prices = formatInitialRenewalPrices(vendor);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="font-bold text-zinc-900">{vendor.name}</h3>
      <p className="mt-1 flex items-start gap-1.5 text-sm text-zinc-500">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span>
          {vendor.city}, {vendor.county.replace(/-/g, " ")}
          {variant === "outline" && vendor.address && (
            <>
              <br />
              <span className="text-zinc-600">{vendor.address}</span>
            </>
          )}
        </span>
      </p>
      {prices.initial && (
        <p className="mt-2 text-sm text-zinc-700">{prices.initial}</p>
      )}
      {prices.renewal && (
        <p className="mt-1 text-sm text-zinc-700">{prices.renewal}</p>
      )}
      <Link
        href={`/vendors/${vendor.slug}`}
        className={`mt-4 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium ${
          variant === "outline"
            ? "border border-zinc-300 text-zinc-900 hover:bg-zinc-50"
            : "bg-zinc-900 text-white hover:bg-zinc-800"
        }`}
      >
        View Now
      </Link>
    </div>
  );
}
