"use client";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(
  name:
    | "saved_listing"
    | "unsaved_listing"
    | "submit_entry_modal_opened"
    | "submit_entry_success"
    | "submit_review_modal_opened"
    | "submit_review_success"
    | "outbound_instructor_website",
  payload: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  const eventPayload = { event: name, ...payload };

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(eventPayload);
  }

  window.gtag?.("event", name, payload);

  window.dispatchEvent(new CustomEvent("ccw-analytics", { detail: eventPayload }));
}
