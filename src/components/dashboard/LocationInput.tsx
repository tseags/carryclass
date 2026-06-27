"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}

type Suggestion = {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
};

/**
 * Address input backed by a server-side Google Places Autocomplete proxy
 * (/api/places/autocomplete). Shows live address suggestions as the user types
 * and falls back to a plain text input when no suggestions are available.
 */
export function LocationInput({ value, onChange, className, placeholder, id }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  // Skip the fetch that would otherwise fire right after the user picks a suggestion.
  const skipNextFetch = useRef(false);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
        setActiveIndex(-1);
        setOpen((data.suggestions ?? []).length > 0);
      } catch {
        /* aborted or network error — keep input usable */
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(suggestion: Suggestion) {
    skipNextFetch.current = true;
    onChange(suggestion.description);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      select(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {suggestions.map((s, i) => (
            <li key={s.placeId}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(s);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors ${
                  i === activeIndex ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                <span className="font-medium text-gray-900">{s.mainText}</span>
                {s.secondaryText && (
                  <span className="text-xs text-gray-500">{s.secondaryText}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
