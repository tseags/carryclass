import Link from "next/link";
import { getCountyDisplayName } from "@/data/counties";

interface CountyGridProps {
  counties: string[];
  vendorCounts?: Record<string, number>;
}

export function CountyGrid({ counties, vendorCounts = {} }: CountyGridProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {counties.map((slug) => {
        const vendorCount = vendorCounts[slug] ?? 0;
        const displayName = getCountyDisplayName(slug);
        return (
          <Link
            key={slug}
            href={`/ca/${slug}`}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <span className="font-medium text-zinc-900">{displayName}</span>
            <span className="text-sm text-zinc-500">
              {vendorCount} {vendorCount === 1 ? "instructor" : "instructors"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
