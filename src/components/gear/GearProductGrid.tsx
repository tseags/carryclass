"use client";

import { useState, useEffect } from "react";
import type { GearProduct } from "@/data/gear-page";

interface GearProductGridProps {
  products: GearProduct[];
  filterCategories: ReadonlyArray<{ slug: string; label: string }>;
}

const BUY_NOW_CLASS =
  "btn-primary bg-secondary-2 small w-button mt-4 inline-flex w-full items-center justify-center !text-white transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#c96442] focus:ring-offset-2";

const PLACEHOLDER_PRICES: Record<string, string> = {
  "1": "$59.99",
  "2": "$79.99",
  "3": "$14.99",
  "4": "$34.99",
  "5": "$49.99",
  "6": "$19.99",
  "7": "$69.99",
  "8": "$24.99",
  "9": "$29.99",
  "10": "$64.99",
  "11": "$39.99",
  "12": "$119.99",
};

function formatReviewCount(value?: number): string {
  if (!value || value < 1) return "";
  return `(${value.toLocaleString()})`;
}

function renderStars(rating: number): string {
  const fullStars = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
}

function getDisplayPrice(
  product: GearProduct,
  livePrices: Record<string, string>,
): string {
  const livePrice = livePrices[product.id];
  if (livePrice && livePrice.trim()) return livePrice;

  const productPrice = product.price?.trim();
  if (productPrice && productPrice !== "Check price") return productPrice;

  return PLACEHOLDER_PRICES[product.id] ?? "$49.99";
}

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
    <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-12 lg:px-16 lg:py-14 xl:px-20 xl:py-16">
      {/* Filter pills */}
      <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-2 px-1">
          {filterCategories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setActiveFilter(cat.slug)}
              className={`rounded-full border border-transparent px-4 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 ${
                activeFilter === cat.slug
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-200/90 text-zinc-600 hover:bg-zinc-300/90"
              }`}
              aria-pressed={activeFilter === cat.slug}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <article
            key={product.id}
            className="group flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[rgba(17,24,39,0.35)] bg-[#fffdf8] font-sans shadow-[0_2px_12px_rgba(0,0,0,0.07)] transition-[transform,box-shadow,border-color,background-color] duration-[240ms] hover:-translate-y-1 hover:border-[rgba(17,24,39,0.65)] hover:shadow-[0_14px_32px_rgba(0,0,0,0.12)] focus-within:-translate-y-1 focus-within:border-[rgba(17,24,39,0.65)] focus-within:shadow-[0_14px_32px_rgba(0,0,0,0.12)]"
          >
            <div className="relative h-28 shrink-0 overflow-hidden bg-[#ffffff] sm:h-32">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 sm:pt-4">
              <div className="min-h-0 flex-1 space-y-1.5">
                {(product.brand ||
                  product.categoryLabel ||
                  filterCategories.find((c) => c.slug === product.category)?.label) && (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c96442]">
                    {product.brand ||
                      product.categoryLabel ||
                      filterCategories.find((c) => c.slug === product.category)?.label}
                  </p>
                )}

                <h3
                  className="line-clamp-2 text-[1.15rem] font-medium leading-tight text-zinc-900 transition-colors duration-200 group-hover:!text-[#b5522e] group-focus-within:!text-[#b5522e]"
                >
                  {product.name}
                </h3>

                {(product.rating || product.reviewCount) && (
                  <p className="text-xs text-zinc-500">
                    {product.rating ? (
                      <span className="font-semibold text-[#c96442]">
                        {renderStars(product.rating)}
                      </span>
                    ) : null}{" "}
                    {product.rating ? `${product.rating.toFixed(1)}` : null}{" "}
                    {formatReviewCount(product.reviewCount)}
                  </p>
                )}
              </div>

              <div className="mt-3">
                <p
                  className="text-[1.35rem] leading-none text-zinc-900"
                >
                  {getDisplayPrice(product, livePrices)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => window.open(product.buyUrl, "_blank", "noopener,noreferrer")}
                className={BUY_NOW_CLASS}
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
