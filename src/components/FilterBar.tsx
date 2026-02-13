"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ClassType, ClassFormat } from "@/types";

interface FilterBarProps {
  countySlug?: string;
  counties?: { slug: string; name: string }[];
  cities?: string[];
}

export function FilterBar({ countySlug, counties = [], cities = [] }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `?${query}` : window.location.pathname);
  }

  const classType = searchParams.get("classType") as ClassType | null;
  const format = searchParams.get("format") as ClassFormat | null;
  const city = searchParams.get("city");
  const priceMax = searchParams.get("priceMax");
  const search = searchParams.get("search");

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
      <p className="mb-3 text-sm font-medium text-zinc-700">Filters</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {/* Search */}
        <form
          className="min-w-0 flex-1 sm:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const val = (formData.get("search") as string)?.trim() || null;
            updateFilter("search", val);
          }}
        >
          <label htmlFor="search" className="sr-only">
            Search
          </label>
          <input
            id="search"
            name="search"
            type="search"
            placeholder="Search instructors..."
            defaultValue={search ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </form>

        {/* County - only if we have multiple counties */}
        {counties.length > 0 && (
          <div>
            <label htmlFor="county" className="sr-only">
              County
            </label>
            <select
              id="county"
              value={countySlug ?? searchParams.get("county") ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  if (countySlug) {
                    router.push(`/ca/${val}`);
                  } else {
                    updateFilter("county", val);
                  }
                } else {
                  updateFilter("county", null);
                }
              }}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="">All counties</option>
              {counties.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* City */}
        {cities.length > 0 && (
          <div>
            <label htmlFor="city" className="sr-only">
              City
            </label>
            <select
              id="city"
              value={city ?? ""}
              onChange={(e) => updateFilter("city", e.target.value || null)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Class type */}
        <div>
          <label htmlFor="classType" className="sr-only">
            Class type
          </label>
          <select
            id="classType"
            value={classType ?? ""}
            onChange={(e) => updateFilter("classType", e.target.value || null)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="">All types</option>
            <option value="initial">Initial</option>
            <option value="renewal">Renewal</option>
            <option value="both">Both</option>
          </select>
        </div>

        {/* Format */}
        <div>
          <label htmlFor="format" className="sr-only">
            Format
          </label>
          <select
            id="format"
            value={format ?? ""}
            onChange={(e) => updateFilter("format", e.target.value || null)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="">All formats</option>
            <option value="in-person">In-person</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        {/* Price max */}
        <div>
          <label htmlFor="priceMax" className="sr-only">
            Max price
          </label>
          <select
            id="priceMax"
            value={priceMax ?? ""}
            onChange={(e) => updateFilter("priceMax", e.target.value || null)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="">Any price</option>
            <option value="75">Under $75</option>
            <option value="100">Under $100</option>
            <option value="150">Under $150</option>
            <option value="200">Under $200</option>
          </select>
        </div>

        {/* Clear */}
        {(classType || format || city || priceMax || search) && (
          <button
            type="button"
            onClick={() => router.push(window.location.pathname)}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
