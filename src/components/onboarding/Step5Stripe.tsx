"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  isConnected: boolean;
  stripeAccountId?: string | null;
}

export function Step5Stripe({ isConnected, stripeAccountId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected") === "1";
  const connectionError = searchParams.get("error");

  const [saving, setSaving] = useState(false);
  const connected = isConnected || justConnected;

  async function advanceStep() {
    setSaving(true);
    try {
      await fetch("/api/onboarding/step/5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipped: !connected }),
      });
      router.push("/onboard/step/6");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Connected state */}
      {connected ? (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-emerald-800">Stripe connected</p>
              {stripeAccountId && (
                <p className="text-sm text-emerald-600 mt-0.5">
                  Account: {stripeAccountId}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-emerald-700 mt-3">
            You&apos;re all set to accept payments. Students will pay you directly through Stripe
            when they book a class.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-1">Connect Stripe to get paid</h2>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-6">
            CarryClass adds a small platform fee per booking charged directly to the student on top of
            your class price — so you keep 100% of what you charge.
          </p>
          <a
            href="/api/stripe-connect/connect"
            className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-violet-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
            </svg>
            Connect with Stripe
          </a>

          {connectionError && (
            <p className="text-sm text-red-500 mt-3">
              Something went wrong: {connectionError}. Please try again.
            </p>
          )}
        </div>
      )}

      {/* Skip option */}
      {!connected && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <strong>Heads up:</strong> You won&apos;t be able to accept paid bookings until Stripe is connected.
            You can complete this from your dashboard anytime.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={() => router.push("/onboard/step/4")}
          className="text-sm text-zinc-500 hover:text-zinc-700 px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center gap-4">
          {!connected && (
            <button
              type="button"
              onClick={advanceStep}
              disabled={saving}
              className="text-sm text-zinc-500 hover:text-zinc-700 underline"
            >
              Set up later
            </button>
          )}
          <button
            type="button"
            onClick={advanceStep}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-zinc-700 disabled:opacity-60 transition-colors"
          >
            {saving && <Spinner />}
            {connected ? "Continue →" : "Skip for now →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
