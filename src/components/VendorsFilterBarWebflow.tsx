"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { getCountyDisplayName } from "@/data/counties";
import { CALIFORNIA_COUNTIES } from "@/data/counties";

function sortHref(searchParams: URLSearchParams, sortValue: string): string {
  const p = new URLSearchParams(searchParams.toString());
  p.set("sort", sortValue);
  const q = p.toString();
  return q ? `/instructors?${q}` : "/instructors";
}

function categoryHref(searchParams: URLSearchParams, categoryValue: string): string {
  const p = new URLSearchParams(searchParams.toString());
  if (categoryValue) p.set("category", categoryValue);
  else p.delete("category");
  const q = p.toString();
  return q ? `/instructors?${q}` : "/instructors";
}

function SortLink({ searchParams, sortValue, children }: { searchParams: URLSearchParams; sortValue: string; children: React.ReactNode }) {
  return <Link href={sortHref(searchParams, sortValue)} className="dropdown-option w-dropdown-link">{children}</Link>;
}

const DROPDOWN_LIST_STYLE = "dropdown-list county-menu w-dropdown-list";

function FilterDropdown({
  label,
  open,
  onToggle,
  onClose,
  children,
  listClassName = DROPDOWN_LIST_STYLE,
  toggleClassName = "dropdown-toggle-2 w-dropdown-toggle",
  wrapperClassName = "",
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
  listClassName?: string;
  toggleClassName?: string;
  wrapperClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open, onClose]);

  return (
    <div ref={ref} className={`w-dropdown ${wrapperClassName}`}>
      <div
        className={`${toggleClassName} ${open ? "w--open" : ""}`}
        onClick={(e) => { e.preventDefault(); onToggle(); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      >
        <div className="w-icon-dropdown-toggle" />
        <div>{label}</div>
      </div>
      <nav className={`${listClassName} ${open ? "w--open" : ""}`}>
        {children}
      </nav>
    </div>
  );
}

interface SearchableOption {
  label: string;
  href: string;
}

function SearchableFilterDropdown({
  label,
  open,
  onToggle,
  onClose,
  options,
  searchPlaceholder,
  emptyMessage,
  listClassName = DROPDOWN_LIST_STYLE,
  toggleClassName = "dropdown-toggle-2 w-dropdown-toggle",
  wrapperClassName = "",
  markCountyOpenAttr = false,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  options: SearchableOption[];
  searchPlaceholder: string;
  emptyMessage?: string;
  listClassName?: string;
  toggleClassName?: string;
  wrapperClassName?: string;
  /** Sets data-county-open for /instructors county menu stacking CSS (globals.css). */
  markCountyOpenAttr?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open, onClose]);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query))
    : options;

  return (
    <div
      ref={ref}
      className={`w-dropdown ${wrapperClassName}`}
      {...(markCountyOpenAttr ? { "data-county-open": open ? "true" : "false" } : {})}
    >
      <div
        className={`${toggleClassName} ${open ? "w--open" : ""}`}
        onClick={(e) => { e.preventDefault(); onToggle(); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      >
        <div className="w-icon-dropdown-toggle" />
        <div>{label}</div>
      </div>
      <nav className={`${listClassName} ${open ? "w--open" : ""}`}>
        {emptyMessage ? (
          <span className="dropdown-option w-dropdown-link filter-dropdown-empty" style={{ opacity: 0.8 }}>{emptyMessage}</span>
        ) : (
          <>
            <div className="filter-dropdown-search-wrap" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={searchPlaceholder}
                className="filter-dropdown-search-input"
                aria-label={searchPlaceholder}
              />
            </div>
            <div className="filter-dropdown-list">
              {filtered.length === 0 ? (
                <span className="dropdown-option w-dropdown-link" style={{ opacity: 0.7 }}>No matches</span>
              ) : (
                filtered.map((opt) => (
                  <Link key={opt.href + opt.label} href={opt.href} className="dropdown-option w-dropdown-link">{opt.label}</Link>
                ))
              )}
            </div>
          </>
        )}
      </nav>
    </div>
  );
}

interface VendorsFilterBarWebflowProps {
  allCities: string[];
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Category" },
  { value: "initial", label: "16-Hour Initial" },
  { value: "renewal", label: "8-Hour Renewal" },
  { value: "add-gun", label: "Add a Gun" },
  { value: "online", label: "Virtual Classes" },
];

export function VendorsFilterBarWebflow({ allCities }: VendorsFilterBarWebflowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const county = searchParams.get("county") ?? "";
  const city = searchParams.get("city") ?? "";
  const category = searchParams.get("category") ?? "";
  const searchQuery = searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const [openDropdown, setOpenDropdown] = useState<"category" | "county" | "city" | "sort" | null>(null);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/instructors${params.toString() ? `?${params}` : ""}`);
  }

  const categoryLabel = CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? "Category";
  const sortLabel = sort === "price-low" ? "Price: Low to High" : sort === "price-high" ? "Price: High to Low" : sort === "name" ? "Name: A to Z" : sort === "name-desc" ? "Name: Z to A" : "Sort";

  return (
    <div className="card pd-44px---32px filter-bar vendors-filter-bar-shell">
      <div className="grid-3-columns filters-grid vendor-page">
        <form
          action="/instructors"
          method="get"
          className="position-relative---z-index-1 mg-bottom-0 mg-bottom-8px-mbp w-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const q = (form.querySelector('input[name="query"]') as HTMLInputElement)?.value?.trim() ?? "";
            updateParams({ search: q || null });
          }}
        >
          <div className="position-relative---z-index-1 flex-horizontal">
            <img
              src="/images/search-input-icon-directory-webflow-ecommerce-template.svg"
              alt=""
              className="icon-inside-input"
            />
            <input
              className="input icon-left-inside search-btn-inside county-search w-input"
              maxLength={256}
              name="query"
              placeholder="Search"
              type="search"
              defaultValue={searchQuery}
              key={searchQuery}
            />
          </div>
          <div className="btn-inside-input-wrapper">
            <button type="submit" className="btn-primary bg-secondary-2 w-button">
              Search
            </button>
          </div>
        </form>

        <FilterDropdown
          label={categoryLabel}
          open={openDropdown === "category"}
          onToggle={() => setOpenDropdown((v) => (v === "category" ? null : "category"))}
          onClose={() => setOpenDropdown(null)}
          listClassName="dropdown-list county-menu w-dropdown-list"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={categoryHref(searchParams, opt.value)}
              className="dropdown-option w-dropdown-link"
            >
              {opt.label}
            </Link>
          ))}
        </FilterDropdown>

        <SearchableFilterDropdown
          label={county ? getCountyDisplayName(county) : "County"}
          open={openDropdown === "county"}
          onToggle={() => setOpenDropdown((v) => (v === "county" ? null : "county"))}
          onClose={() => setOpenDropdown(null)}
          wrapperClassName="vendors-county-dropdown"
          markCountyOpenAttr
          searchPlaceholder="Type to search"
          options={[
            { label: "All Counties", href: "/instructors" },
            ...CALIFORNIA_COUNTIES.map((slug) => ({
              label: getCountyDisplayName(slug),
              href: `/instructors?county=${slug}`,
            })),
          ]}
        />

        <SearchableFilterDropdown
          label={city || "City"}
          open={openDropdown === "city"}
          onToggle={() => setOpenDropdown((v) => (v === "city" ? null : "city"))}
          onClose={() => setOpenDropdown(null)}
          searchPlaceholder="Type to search"
          options={[
            { label: "All Cities", href: county ? `/instructors?county=${county}` : "/instructors" },
            ...allCities.map((c) => ({
              label: c,
              href: county ? `/instructors?county=${county}&city=${encodeURIComponent(c)}` : `/instructors?city=${encodeURIComponent(c)}`,
            })),
          ]}
          listClassName={DROPDOWN_LIST_STYLE}
          toggleClassName="dropdown-toggle-2 city-filter w-dropdown-toggle"
          wrapperClassName="city-filter-wrap"
        />

        <FilterDropdown
          label={sortLabel}
          open={openDropdown === "sort"}
          onToggle={() => setOpenDropdown((v) => (v === "sort" ? null : "sort"))}
          onClose={() => setOpenDropdown(null)}
          listClassName="dropdown-list county-menu sort w-dropdown-list"
        >
          <SortLink searchParams={searchParams} sortValue="price-low">Price: Low to High</SortLink>
          <SortLink searchParams={searchParams} sortValue="price-high">Price: High to Low</SortLink>
          <SortLink searchParams={searchParams} sortValue="name">Name: A to Z</SortLink>
          <SortLink searchParams={searchParams} sortValue="name-desc">Name: Z to A</SortLink>
        </FilterDropdown>
      </div>
    </div>
  );
}
