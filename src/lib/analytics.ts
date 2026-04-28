"use client";

export function trackEvent(
  name:
    | "saved_listing"
    | "unsaved_listing"
    | "submit_entry_modal_opened"
    | "submit_entry_success"
    | "submit_review_modal_opened"
    | "submit_review_success",
  payload: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  const eventPayload = { event: name, ...payload };

  const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push(eventPayload);
  }

  window.dispatchEvent(new CustomEvent("ccw-analytics", { detail: eventPayload }));
}
