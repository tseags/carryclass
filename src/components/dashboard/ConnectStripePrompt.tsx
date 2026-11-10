"use client";

import { useState } from "react";
import { DASH_BTN_PRIMARY } from "./dashboard-theme";

/** Single entrypoint for Connect OAuth so every prompt sends people to the same place. */
export const STRIPE_CONNECT_HREF = "/api/stripe-connect/connect";

/**
 * Persistent, dismissable-free banner for a published listing without Stripe.
 * Bookings stay off until Connect completes (see publish-vendor-live-map).
 */
export function ConnectStripeBanner({ error }: { error?: string | null }) {
  return (
    <div className="rounded-xl border border-[#F0DCC8] bg-[#FDF6EE] p-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="!m-0 text-sm font-semibold text-[#6E3510]">
            Listing is live. Connect Stripe to accept bookings.
          </p>
          <p className="!mb-0 !mt-0.5 text-sm text-[#8A4B1E]">
            Students can find you and see your classes, but they can&apos;t book or pay online yet.
          </p>
        </div>
        <a href={STRIPE_CONNECT_HREF} className={`shrink-0 ${DASH_BTN_PRIMARY}`}>
          Connect Stripe →
        </a>
      </div>
      {error && (
        <p className="!mb-0 !mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Inline prompt shown when an instructor without Stripe touches a bookings
 * action. Explains why, offers Connect, and lets them continue listing-only.
 */
export function ConnectStripeNotice({
  title,
  body,
  className = "",
}: {
  title: string;
  body: string;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className={`rounded-xl border border-[#F0DCC8] bg-[#FDF6EE] p-4 sm:px-5 ${className}`}>
      <p className="!m-0 text-sm font-semibold text-[#6E3510]">{title}</p>
      <p className="!mb-0 !mt-1 text-sm text-[#8A4B1E]">{body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a href={STRIPE_CONNECT_HREF} className={`${DASH_BTN_PRIMARY} !px-3 !py-1.5`}>
          Connect Stripe
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="!bg-transparent text-sm font-medium text-[#6E3510] underline hover:no-underline"
        >
          Keep listing-only for now
        </button>
      </div>
    </div>
  );
}
