import Link from "next/link";
import Image from "next/image";
import { getCountyDisplayName } from "@/data/counties";
import { getCountyImageUrl } from "@/data/county-images";

const FEATURED_COUNTIES = [
  "san-diego",
  "orange",
  "riverside",
  "los-angeles",
  "sacramento",
  "san-bernardino",
] as const;

interface CountyCarouselProps {
  vendorCounts?: Record<string, number>;
}

export function CountyCarousel({ vendorCounts = {} }: CountyCarouselProps) {
  return (
    <section className="py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-zinc-900">
          View CCW Courses by County
        </h2>
        <Link
          href="/ca"
          className="shrink-0 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          View Counties
        </Link>
      </div>
      <div className="mt-6 overflow-x-auto pb-4">
        <div className="flex gap-4 sm:gap-6">
          {FEATURED_COUNTIES.map((slug) => {
            const name = getCountyDisplayName(slug);
            const imageUrl = getCountyImageUrl(slug);
            const vendorCount = vendorCounts[slug] ?? 0;

            return (
              <Link
                key={slug}
                href={`/ca/${slug}`}
                className="group flex min-w-[200px] shrink-0 flex-col sm:min-w-[240px]"
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-zinc-200">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 200px, 240px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-500">
                      {name}
                    </div>
                  )}
                </div>
                <p className="mt-3 font-semibold text-zinc-900">{name}, CA</p>
                <p className="text-sm text-zinc-500">
                  {vendorCount} {vendorCount === 1 ? "instructor" : "instructors"}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
