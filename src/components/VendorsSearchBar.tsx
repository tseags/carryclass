"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface VendorsSearchBarProps {
  counties: { slug: string; name: string }[];
}

export function VendorsSearchBar({ counties }: VendorsSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const search = (form.elements.namedItem("search") as HTMLInputElement)?.value?.trim();
    const county = (form.elements.namedItem("county") as HTMLSelectElement)?.value;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (county) params.set("county", county);
    router.push(`/vendors${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <form
      onSubmit={handleSearch}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
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
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          name="search"
          type="search"
          placeholder="Search by name"
          defaultValue={searchParams.get("search") ?? ""}
          className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-4 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Search
      </button>
      <select
        name="county"
        className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        onChange={(e) => {
          const val = e.target.value;
          if (val) router.push(`/ca/${val}`);
        }}
      >
        <option value="">County</option>
        {counties.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        onChange={(e) => {
          const val = e.target.value;
          const params = new URLSearchParams(searchParams.toString());
          if (val) params.set("sort", val);
          else params.delete("sort");
          router.push(`/vendors${params.toString() ? `?${params}` : ""}`);
        }}
      >
        <option value="">Sort</option>
        <option value="name">Name</option>
        <option value="price-low">Price: Low to High</option>
        <option value="price-high">Price: High to Low</option>
      </select>
    </form>
  );
}
