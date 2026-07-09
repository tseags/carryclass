"use client";

import type { SelectHTMLAttributes } from "react";

type VendorsSortSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function VendorsSortSelect({ onChange, ...props }: VendorsSortSelectProps) {
  return (
    <select
      {...props}
      onChange={(e) => {
        onChange?.(e);
        e.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
