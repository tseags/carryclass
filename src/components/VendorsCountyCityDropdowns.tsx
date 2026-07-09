"use client";

import { useState } from "react";

type DropdownOption = {
  value: string;
  label: string;
};

type VendorsCountyCityDropdownsProps = {
  initialCounty?: string;
  initialCity?: string;
  counties: DropdownOption[];
  cities: string[];
  /** When true, county is fixed by the route — only the city dropdown is shown. */
  omitCounty?: boolean;
};

export function VendorsCountyCityDropdowns({
  initialCounty,
  initialCity,
  counties,
  cities,
  omitCounty = false,
}: VendorsCountyCityDropdownsProps) {
  const [county, setCounty] = useState(initialCounty ?? "");
  const [city, setCity] = useState(initialCity ?? "");

  return (
    <>
      {!omitCounty ? (
        <label className="vendors-filter-group">
          <span>County</span>
          <select
            name="county"
            value={county}
            onChange={(event) => {
              const form = event.currentTarget.form;
              setCounty(event.target.value);
              setCity("");
              const citySelect = form?.elements.namedItem("city") as HTMLSelectElement | null;
              if (citySelect) citySelect.value = "";
              form?.requestSubmit();
            }}
          >
            <option value="">Any county</option>
            {counties.map((countyOption) => (
              <option key={countyOption.value} value={countyOption.value}>
                {countyOption.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="vendors-filter-group">
        <span>City</span>
        <select
          name="city"
          value={city}
          onChange={(event) => {
            setCity(event.target.value);
            event.currentTarget.form?.requestSubmit();
          }}
        >
          <option value="">Any city</option>
          {cities.map((cityOption) => (
            <option key={cityOption} value={cityOption}>
              {cityOption}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
