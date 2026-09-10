"use client";

import { useState } from "react";

/** Single entrypoint for Connect OAuth so every prompt sends people to the same place. */
export const STRIPE_CONNECT_HREF = "/api/stripe-connect/connect";

/**
 * Persistent, dismissable-free banner for a published listing without Stripe.
 * Bookings stay off until Connect completes (see publish-vendor-live-map).
 */
export function ConnectStripeBanner({ error }: { error?: string | null }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">
            Listing is live. Connect Stripe to accept bookings.
          </p>
          <p className="mt-0.5 text-sm text-amber-800">
            Students can find you and see your classes, but they can&apos;t book or pay online yet.
          </p>
        </div>
        <a
          href={STRIPE_CONNECT_HREF}
          className="shrink-0 rounded-lg bg-[#C1440E] px-4 py-2 text-sm font-medium !text-white hover:bg-[#a53a0c] transition-colors"
        >
          Connect Stripe →
        </a>
      </div>
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
    <div className={`rounded-lg border border-amber-200 bg-amber-50 p-4 ${className}`}>
      <p className="text-sm font-semibold text-amber-900">{title}</p>
      <p className="mt-1 text-sm text-amber-800">{body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a
          href={STRIPE_CONNECT_HREF}
          className="rounded-lg bg-[#C1440E] px-3 py-1.5 text-sm font-medium !text-white hover:bg-[#a53a0c] transition-colors"
        >
          Connect Stripe
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-sm font-medium text-amber-900 underline hover:no-underline"
        >
          Keep listing-only for now
        </button>
      </div>
    </div>
  );
}
