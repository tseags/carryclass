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
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set("search", search);
    else params.delete("search");
    if (county) params.set("county", county);
    else params.delete("county");
    router.push(`/instructors${params.toString() ? `?${params}` : ""}`);
  }

  const countyValue = searchParams.get("county") ?? "";
  const sortValue = searchParams.get("sort") ?? "";

  return (
    <div className="card pd-44px---32px filter-bar">
      <div className="grid-3-columns filters-grid vendor-page">
        <form
          onSubmit={handleSearch}
          className="position-relative---z-index-1 mg-bottom-0 mg-bottom-8px-mbp w-form"
        >
          <div className="position-relative---z-index-1 flex-horizontal">
            <img
              src="/images/search-input-icon-directory-webflow-ecommerce-template.svg"
              alt=""
              className="icon-inside-input"
            />
            <input
              name="search"
              type="search"
              placeholder="Search by name"
              defaultValue={searchParams.get("search") ?? ""}
              className="input icon-left-inside search-btn-inside county-search w-input"
            />
          </div>
          <div className="btn-inside-input-wrapper">
            <input type="submit" className="btn-primary bg-secondary-2 w-button" value="Search" />
          </div>
        </form>
        <div className="position-relative---z-index-1">
          <select
            id="vendors-county-filter"
            name="county"
            defaultValue={countyValue}
            aria-label="Filter by county"
            className="input w-select w-full max-w-full"
            onChange={(e) => {
              const val = e.target.value;
              const params = new URLSearchParams(searchParams.toString());
              if (val) params.set("county", val);
              else params.delete("county");
              router.push(`/instructors${params.toString() ? `?${params}` : ""}`);
            }}
          >
            <option value="">County</option>
            {counties.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="position-relative---z-index-1">
          <select
            id="vendors-sort"
            aria-label="Sort vendors"
            className="input w-select w-full max-w-full"
            defaultValue={sortValue}
            onChange={(e) => {
              const val = e.target.value;
              const params = new URLSearchParams(searchParams.toString());
              if (val) params.set("sort", val);
              else params.delete("sort");
              router.push(`/instructors${params.toString() ? `?${params}` : ""}`);
            }}
          >
            <option value="">Sort</option>
            <option value="name">Name: A to Z</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>
    </div>
  );
}
