import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCountyDisplayName } from "@/data/counties";
import { getVendorsByCounty } from "@/data/vendors";
import { getCountyImageUrl } from "@/data/county-images";
import { CALIFORNIA_COUNTIES } from "@/data/counties";

export const metadata = {
  title: "Find CCW Training by County in California",
  description:
    "Browse all California counties to find approved CCW instructors and training vendors near you.",
};

export default function CaliforniaPage() {
  const countiesWithImages = ["san-diego", "orange", "riverside", "los-angeles", "sacramento", "san-bernardino"];
  const otherCounties = CALIFORNIA_COUNTIES.filter(
    (c) => !countiesWithImages.includes(c)
  );

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <nav className="mb-8 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-700">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-900">Counties</span>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Find CCW Training by County in California
        </h1>
        <p className="mt-2 text-zinc-600">
          Browse all California counties to find approved CCW instructors and
          training vendors near you. Each county below links to its own
          sheriff-approved vendor list and renewal information.
        </p>

        {/* Search bar */}
        <form
          action="/ca"
          method="get"
          className="mt-8 flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
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
            <input
              name="q"
              type="search"
              placeholder="Find Your County"
              className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-4 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Search
          </button>
        </form>

        {/* County cards - featured first with images */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...countiesWithImages, ...otherCounties].map((slug) => {
            const name = getCountyDisplayName(slug);
            const imageUrl = getCountyImageUrl(slug);
            const vendorCount = getVendorsByCounty(slug).length;

            return (
              <Link
                key={slug}
                href={`/ca/${slug}`}
                className="group block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[16/10] bg-zinc-200">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-500">
                      {name}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <span className="font-semibold text-zinc-900 group-hover:underline">
                    {name} →
                  </span>
                  <p className="mt-1 text-sm text-zinc-500">
                    Find approved CCW training and renewal courses in {name} County.
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <Footer />
      </main>
    </div>
  );
}
