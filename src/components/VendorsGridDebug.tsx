"use client";

import { useEffect } from "react";

export function VendorsGridDebug() {
  useEffect(() => {
    // #region agent log
    const el = document.querySelector(".vendors-grid");
    const items = document.querySelectorAll(".vendors-grid .w-dyn-item");
    const card = document.querySelector(".vendors-grid .vendor-card");
    let computed = null;
    if (el) {
      const s = window.getComputedStyle(el);
      computed = {
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        height: s.height,
        minHeight: s.minHeight,
        overflow: s.overflow,
      };
    }
    fetch("http://127.0.0.1:7242/ingest/c38ae822-1006-4584-a5cb-04b1baa20f67", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "VendorsGridDebug.tsx:useEffect",
        message: "DOM state of .vendors-grid",
        data: {
          gridExists: !!el,
          childCount: el?.children?.length ?? 0,
          itemCount: items.length,
          cardExists: !!card,
          computedStyle: computed,
          hypothesisId: "D-E",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  return null;
}
