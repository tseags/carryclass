"use client";

import { useEffect } from "react";

const DEBUG_ENDPOINT =
  "http://127.0.0.1:7242/ingest/c38ae822-1006-4584-a5cb-04b1baa20f67";

export function GoogleMapEmbedWithDebug({
  title,
  src,
  vendorSlug,
  hasAddress,
}: {
  title: string;
  src: string;
  vendorSlug: string;
  hasAddress: boolean;
}) {
  const post = (payload: Record<string, unknown>) => {
    // #region agent log
    fetch(DEBUG_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
    // #endregion
  };

  useEffect(() => {
    post({
      location: "GoogleMapEmbedWithDebug.tsx:onMount",
      message: "google-iframe-mounted",
      data: { vendorSlug, hasAddress },
      timestamp: Date.now(),
    });
  }, [vendorSlug, hasAddress]);

  return (
    <iframe
      title={title}
      src={src}
      width="100%"
      height="100%"
      className="absolute inset-0 h-full w-full border-0"
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      onLoad={() => {
        post({
          location: "GoogleMapEmbedWithDebug.tsx:onLoad",
          message: "google-iframe-loaded",
          data: { vendorSlug, hasAddress },
          timestamp: Date.now(),
        });
      }}
    />
  );
}

