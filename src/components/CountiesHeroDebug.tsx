"use client";

import { useEffect } from "react";

const INGEST = "http://127.0.0.1:7242/ingest/c38ae822-1006-4584-a5cb-04b1baa20f67";

function send(data: Record<string, unknown>) {
  fetch(INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, timestamp: Date.now() }),
  }).catch(() => {});
}

export function CountiesHeroDebug() {
  useEffect(() => {
    const h1 = document.querySelector(".counties-hero-title");
    const wrapper = document.querySelector(".counties-hero-text-wrap");
    const parent = document.querySelector(".text-center.mg-bottom-32px.pricing-page");
    const container = document.querySelector(".section-3.counties-hero .container-default.w-container");

    const getStyle = (el: Element | null) => {
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return {
        textAlign: s.textAlign,
        marginLeft: s.marginLeft,
        marginRight: s.marginRight,
        width: s.width,
        maxWidth: s.maxWidth,
        display: s.display,
        tagName: el.tagName,
        className: el.className,
      };
    };

    send({
      location: "CountiesHeroDebug.tsx",
      message: "H1 and wrapper computed styles",
      hypothesisId: "H1-H5",
      data: {
        h1Found: !!h1,
        wrapperFound: !!wrapper,
        parentFound: !!parent,
        containerFound: !!container,
        h1Styles: getStyle(h1),
        wrapperStyles: getStyle(wrapper),
        parentStyles: getStyle(parent),
        containerStyles: getStyle(container),
      },
    });
  }, []);

  return null;
}
