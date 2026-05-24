"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CALIFORNIA_COUNTIES, COUNTY_DISPLAY_NAMES } from "@/data/counties";

const ROTATING_PLACEHOLDER_TERMS = ["county", "city", "instructor name", "training type"];

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveCountySlug(value: string): string | null {
  const normalized = normalizeForMatch(value);
  if (!normalized) return null;

  const noCountySuffix = normalized.replace(/\s+county$/, "").trim();
  const hyphenated = noCountySuffix.replace(/\s+/g, "-");

  if (CALIFORNIA_COUNTIES.includes(hyphenated as (typeof CALIFORNIA_COUNTIES)[number])) {
    return hyphenated;
  }

  const matched = Object.entries(COUNTY_DISPLAY_NAMES).find(([, displayName]) => {
    const displayNormalized = normalizeForMatch(displayName);
    return displayNormalized === noCountySuffix;
  });

  return matched?.[0] ?? null;
}

function inferSearchParams(rawQuery: string): URLSearchParams {
  const trimmed = rawQuery.trim();
  const normalized = normalizeForMatch(trimmed);
  const params = new URLSearchParams();

  const hasRenewalIntent =
    /\brenewal\b/.test(normalized) ||
    /\b8\s*(hr|hour)\b/.test(normalized) ||
    /\brecert(ification)?\b/.test(normalized);
  const hasInitialIntent =
    /\binitial\b/.test(normalized) ||
    /\b16\s*(hr|hour)\b/.test(normalized) ||
    /\bnew\b/.test(normalized);
  const hasOnlineIntent = /\bonline\b|\bvirtual\b/.test(normalized);
  const hasAddGunIntent = /\badd\b.*\bgun\b|\bweapon\b.*\badd\b/.test(normalized);

  if (hasRenewalIntent && !hasInitialIntent) {
    params.set("category", "renewal");
  } else if (hasInitialIntent && !hasRenewalIntent) {
    params.set("category", "initial");
  } else if (hasAddGunIntent) {
    params.set("category", "add-gun");
  } else if (hasOnlineIntent) {
    params.set("category", "online");
  }

  const countySlug = resolveCountySlug(trimmed);
  if (countySlug) {
    params.set("county", countySlug);
    return params;
  }

  const cityPrefixed = normalized.match(/^(?:city|city of)\s+(.+)$/);
  if (cityPrefixed?.[1]) {
    params.set("city", cityPrefixed[1].trim());
    return params;
  }

  if (params.has("category")) {
    return params;
  }

  params.set("search", trimmed);
  return params;
}

export function HeroSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    if (hasQuery) {
      return;
    }

    const timer = window.setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_PLACEHOLDER_TERMS.length);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [hasQuery]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      router.push("/instructors");
      return;
    }

    const params = inferSearchParams(trimmedQuery);
    router.push(`/instructors?${params.toString()}`);
  }

  return (
    <div className="hero-search">
      <form onSubmit={handleSubmit} className="hero-search__form position-relative---z-index-1 w-form">
        <div className="hero-search__field-row">
          <div className="hero-search__input-wrap">
            {!hasQuery && !isFocused ? (
              <span className="hero-search__overlay-hint" aria-live="polite">
                Search by{" "}
                <strong className="hero-search__overlay-hint-strong">
                  {ROTATING_PLACEHOLDER_TERMS[placeholderIndex]}
                </strong>
              </span>
            ) : null}
            <input
              name="search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder=""
              className="hero-search__input-plain input county-search w-input"
            />
          </div>
          <button type="submit" className="btn-primary w-button hero-search__submit">
            Find Classes
          </button>
        </div>
      </form>
    </div>
  );
}
