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
    if (!connected) return;
    setSaving(true);
    try {
      await fetch("/api/onboarding/step/5", { method: "POST" });
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
          <div className="mx-auto mb-5 flex h-12 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/stripe-wordmark.svg"
              alt="Stripe"
              className="h-9 w-auto"
            />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-1">Connect Stripe to get paid</h2>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-6">
            CarryClass adds a small platform fee per booking charged directly to the student on top of
            your class price — so you keep 100% of what you charge.
          </p>
          <a
            href="/api/stripe-connect/connect"
            className="btn-primary w-button !inline-flex items-center justify-center"
          >
            Connect with Stripe
          </a>

          {connectionError && (
            <p className="text-sm text-red-500 mt-3">
              Something went wrong: {connectionError}. Please try again.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => router.push("/onboard/step/4")}
          className="btn-secondary w-button"
        >
          Back
        </button>
        {connected && (
          <button
            type="button"
            onClick={advanceStep}
            disabled={saving}
            className="btn-primary w-button inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving && <Spinner />}
            Continue
          </button>
        )}
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
