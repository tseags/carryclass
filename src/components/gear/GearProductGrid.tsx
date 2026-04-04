"use client";

import { useState, useEffect } from "react";
import type { GearProduct } from "@/data/gear-page";

interface GearProductGridProps {
  products: GearProduct[];
  filterCategories: ReadonlyArray<{ slug: string; label: string }>;
}

const BUY_NOW_CLASS =
  "mt-auto shrink-0 inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 active:translate-y-0 active:shadow-sm";

export function GearProductGrid({ products, filterCategories }: GearProductGridProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [livePrices, setLivePrices] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/gear-prices")
      .then((res) => res.json())
      .then((data: { prices?: Record<string, string> }) => {
        if (data.prices && typeof data.prices === "object") setLivePrices(data.prices);
      })
      .catch(() => {});
  }, []);

  const filtered =
    activeFilter === "all"
      ? products
      : products.filter((p) => p.category === activeFilter);

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 md:px-12 md:py-16 lg:px-16 lg:py-16 xl:px-20 xl:py-20">
      {/* Filter pills */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {filterCategories.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => setActiveFilter(cat.slug)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:ring-offset-2 ${
              activeFilter === cat.slug
                ? "border-zinc-900 bg-zinc-900"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
            }`}
            style={activeFilter === cat.slug ? { color: "#ffffff" } : undefined}
            aria-pressed={activeFilter === cat.slug}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product grid — uniform card height, buttons aligned at bottom */}
      <div className="mt-10 grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <article
            key={product.id}
            className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
          >
            <div className="flex h-36 shrink-0 items-center justify-center bg-transparent px-6 py-2 sm:h-40 sm:px-8 sm:py-3">
              <img
                src={product.imageUrl}
                alt=""
                className="max-h-[85%] max-w-[85%] object-contain"
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col bg-zinc-100 p-5">
              <div className="min-h-0 flex-1">
                {product.brand && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    {product.brand}
                  </p>
                )}
                <h3 className="mt-1 text-lg font-semibold text-zinc-900 line-clamp-2">
                  {product.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 line-clamp-3">
                  {product.shortDescription}
                </p>
                {(livePrices[product.id] ?? product.price) && (
                  <p className="mt-2 text-sm font-medium text-zinc-700">
                    {livePrices[product.id] ?? product.price}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => window.open(product.buyUrl, "_blank", "noopener,noreferrer")}
                className={BUY_NOW_CLASS}
                style={{ color: "#ffffff" }}
                aria-label={`Buy ${product.name} (opens in new tab)`}
              >
                Buy now
              </button>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-center text-zinc-500">
          No products in this category yet.
        </p>
      )}
    </section>
  );
}
