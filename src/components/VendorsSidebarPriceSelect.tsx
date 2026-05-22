"use client";

import { useEffect, useState } from "react";

const PRICE_CEILING_TIERS = [150, 200, 300, 400] as const;

export interface VendorsSidebarPriceSelectProps {
  ariaLabelledBy?: string;
  selectId: string;
  priceListedOnly: boolean;
  priceMax?: number;
}

export function VendorsSidebarPriceSelect({
  ariaLabelledBy,
  selectId,
  priceListedOnly,
  priceMax,
}: VendorsSidebarPriceSelectProps) {
  const derived =
    priceListedOnly ? "listed" : priceMax != null ? String(priceMax) : "";
  const [value, setValue] = useState(derived);

  useEffect(() => {
    setValue(priceListedOnly ? "listed" : priceMax != null ? String(priceMax) : "");
  }, [priceListedOnly, priceMax]);

  return (
    <>
      <select
        id={selectId}
        aria-labelledby={ariaLabelledBy}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="listed">Price listed</option>
        <option value="">Any price</option>
        {PRICE_CEILING_TIERS.map((n) => (
          <option key={n} value={String(n)}>
            Under ${n}
          </option>
        ))}
      </select>
      {value === "listed" ? <input type="hidden" name="priceListed" value="1" /> : null}
      {value !== "" && value !== "listed" ? (
        <input type="hidden" name="priceMax" value={value} />
      ) : null}
    </>
  );
}
