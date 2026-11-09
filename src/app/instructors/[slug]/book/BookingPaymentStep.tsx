"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckoutElementsProvider,
  ExpressCheckoutElement,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import type { Appearance } from "@stripe/stripe-js";
import { getStripeBrowser } from "@/lib/stripe-client";
import { APPLICATION_ACK_LABEL } from "@/lib/booking-acknowledgments";
import { PLATFORM_SERVICE_FEE_PERCENT_LABEL } from "@/lib/booking-constants";
import { PLATFORM_FEE_LINE_LABEL, formatCents } from "@/lib/instructor-catalog";

const ACK_CHECKBOX_CLASS =
  "mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-[#141413] focus:ring-[#141413]";
const ACK_LABEL_CLASS =
  "flex cursor-pointer items-start gap-3 rounded-lg border border-[rgba(17,24,39,0.12)] bg-[#fafafa] px-3 py-3";
const POLICY_LINK_CLASS =
  "font-medium text-[#141413] underline underline-offset-2 hover:text-[#c96442]";

const CARD_CLASS =
  "rounded-[14px] border border-[rgba(17,24,39,0.12)] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] sm:px-6 sm:py-6";

const CHECKOUT_APPEARANCE: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#C1440E",
    colorBackground: "#ffffff",
    colorText: "#141413",
    colorTextSecondary: "#5e5d59",
    colorDanger: "#b91c1c",
    borderRadius: "8px",
    fontFamily: 'Thicccboi, "Helvetica Neue", Arial, sans-serif',
    fontSizeBase: "14px",
  },
  rules: {
    ".Input": {
      border: "1px solid rgba(17, 24, 39, 0.15)",
      boxShadow: "none",
    },
    ".Input:focus": {
      border: "1px solid #141413",
      boxShadow: "0 0 0 3px rgba(24, 24, 27, 0.08)",
    },
    ".Tab": {
      border: "1px solid rgba(17, 24, 39, 0.12)",
      boxShadow: "none",
    },
    ".Tab--selected": {
      border: "1px solid #C1440E",
      boxShadow: "none",
    },
    ".Label": {
      fontWeight: "500",
      color: "#141413",
    },
  },
};

export type BookingPaymentSummary = {
  classTitle: string;
  whenLabel: string;
  customerName: string;
  customerEmail: string;
  classAmountCents: number;
  platformFeeCents: number;
  passThrough: { id: string; name: string; amountCents: number; note?: string | null }[];
  totalCents: number;
  refundPolicy: string | null;
  vendorName: string;
  requireApplicationAck?: boolean;
};

type Props = {
  clientSecret: string;
  summary: BookingPaymentSummary;
  onBack: () => void;
};

export function BookingPaymentStep({ clientSecret, summary, onBack }: Props) {
  return (
    <CheckoutElementsProvider
      stripe={getStripeBrowser()}
      options={{
        clientSecret,
        elementsOptions: {
          appearance: CHECKOUT_APPEARANCE,
          loader: "auto",
        },
      }}
    >
      <PaymentLayout summary={summary} onBack={onBack} />
    </CheckoutElementsProvider>
  );
}

function PaymentLayout({
  summary,
  onBack,
}: {
  summary: BookingPaymentSummary;
  onBack: () => void;
}) {
  const checkoutState = useCheckoutElements();
  const [refundPolicyOpen, setRefundPolicyOpen] = useState(false);
  const [expressState, setExpressState] = useState<"pending" | "ready" | "none">("pending");
  const [legalAcked, setLegalAcked] = useState(false);
  const [applicationAcked, setApplicationAcked] = useState(false);
  const needsApplicationAck = Boolean(summary.requireApplicationAck);
  const acknowledgmentsComplete =
    legalAcked && (!needsApplicationAck || applicationAcked);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-10">
      <div className="space-y-4">
        <section className={`${CARD_CLASS} bg-[#f2efe8]`} aria-labelledby="book-payment-recap-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="book-payment-recap-title" className="!mb-0 text-xs font-semibold text-zinc-900">
                Your booking
              </h2>
              <p className="mt-3 text-sm font-semibold text-zinc-900">{summary.classTitle}</p>
              <p className="mt-1 text-sm text-zinc-600">{summary.whenLabel}</p>
              <p className="mt-3 text-sm text-zinc-700">
                {summary.customerName}
                <span className="mt-0.5 block text-zinc-500">{summary.customerEmail}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
            >
              Edit
            </button>
          </div>
        </section>

        <section className={`${CARD_CLASS} bg-white`} aria-labelledby="book-payment-methods-title">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(201,100,66,0.1)]"
            >
              <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
                <rect
                  x="3.5"
                  y="8"
                  width="15"
                  height="10.5"
                  rx="2"
                  stroke="#c96442"
                  strokeWidth="2"
                />
                <path
                  d="M7 8V6.5a4 4 0 0 1 8 0V8"
                  stroke="#c96442"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <h2 id="book-payment-methods-title" className="!mb-0 text-xs font-semibold text-zinc-900">
                Payment
              </h2>
              <p className="mt-1 text-sm text-zinc-500">Pay securely without leaving CarryClass.</p>
            </div>
          </div>

          {checkoutState.type === "loading" && (
            <p className="mt-5 text-sm text-zinc-500">Loading secure payment form…</p>
          )}
          {checkoutState.type === "error" && (
            <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">
              {checkoutState.error.message}
            </p>
          )}
          {checkoutState.type === "success" && (
            <div className="mt-5 space-y-4">
              <label className={ACK_LABEL_CLASS}>
                <input
                  type="checkbox"
                  checked={legalAcked}
                  onChange={(e) => setLegalAcked(e.target.checked)}
                  className={ACK_CHECKBOX_CLASS}
                />
                <span className="text-xs leading-relaxed text-zinc-700">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={POLICY_LINK_CLASS}
                  >
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={POLICY_LINK_CLASS}
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {needsApplicationAck && (
                <label className={ACK_LABEL_CLASS}>
                  <input
                    type="checkbox"
                    checked={applicationAcked}
                    onChange={(e) => setApplicationAcked(e.target.checked)}
                    className={ACK_CHECKBOX_CLASS}
                  />
                  <span className="text-xs leading-relaxed text-zinc-700">
                    {APPLICATION_ACK_LABEL}
                  </span>
                </label>
              )}
              <div className={expressState === "none" ? "hidden" : "block"}>
                <ExpressCheckoutElement
                  onReady={(event) => {
                    setExpressState(event.availablePaymentMethods ? "ready" : "none");
                  }}
                  onConfirm={async (event) => {
                    if (!acknowledgmentsComplete) {
                      event.paymentFailed({
                        reason: "fail",
                        message: "Please confirm the required acknowledgments above before paying.",
                      });
                      return;
                    }
                    await checkoutState.checkout.confirm();
                  }}
                />
                {expressState === "ready" ? (
                  <div className="my-4 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
                    <span className="h-px flex-1 bg-[rgba(17,24,39,0.12)]" />
                    Or
                    <span className="h-px flex-1 bg-[rgba(17,24,39,0.12)]" />
                  </div>
                ) : null}
              </div>
              <PaymentElement options={{ layout: "accordion" }} />
              <PayButton acknowledgmentsComplete={acknowledgmentsComplete} />
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6 lg:sticky lg:top-[calc(var(--header-offset)+1rem)]">
        <div className={`${CARD_CLASS} bg-[#f2efe8]`}>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(20,20,19,0.08)]"
            >
              <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
                <path
                  d="M2.5 3.5h2.2l2 10h9.8l1.8-7H6"
                  stroke="#141413"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="8.5" cy="17.5" r="1.3" stroke="#141413" strokeWidth="2" />
                <circle cx="15.5" cy="17.5" r="1.3" stroke="#141413" strokeWidth="2" />
              </svg>
            </span>
            <h2 className="!mb-0 text-xs font-semibold text-zinc-900">Order summary</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between gap-4">
              <span className="text-zinc-600">{summary.classTitle}</span>
              <span className="tabular-nums font-medium text-zinc-900">
                {formatCents(summary.classAmountCents)}
              </span>
            </li>
            {summary.passThrough.map((fee) => (
              <li key={fee.id} className="flex justify-between gap-4">
                <span className="text-zinc-600">
                  {fee.name}
                  {fee.note ? (
                    <span className="mt-0.5 block text-xs text-zinc-500">{fee.note}</span>
                  ) : null}
                </span>
                <span className="tabular-nums font-medium text-zinc-900">
                  {formatCents(fee.amountCents)}
                </span>
              </li>
            ))}
            <li className="flex justify-between gap-4">
              <span className="text-zinc-600">{PLATFORM_FEE_LINE_LABEL}</span>
              <span className="tabular-nums font-medium text-zinc-900">
                {formatCents(summary.platformFeeCents)}
              </span>
            </li>
            <li className="flex justify-between gap-4 border-t border-[rgba(17,24,39,0.12)] pt-2.5 pb-1 text-sm font-semibold text-zinc-900">
              <span>Total</span>
              <span className="tabular-nums">{formatCents(summary.totalCents)}</span>
            </li>
          </ul>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setRefundPolicyOpen((open) => !open)}
              aria-expanded={refundPolicyOpen}
              aria-controls="refund-policy-panel-payment"
              className="inline-flex items-center gap-1.5 text-xs font-medium !text-[#5e5d59] underline-offset-2 hover:!text-[#141413] hover:underline"
            >
              Refund policy
            </button>
            {refundPolicyOpen && (
              <div
                id="refund-policy-panel-payment"
                className="mt-2 rounded-lg border border-[rgba(17,24,39,0.12)] bg-[#fafafa] px-3 py-2.5 text-xs leading-relaxed text-[#5e5d59]"
              >
                <p className="!mb-1 font-medium text-[#141413]">
                  {summary.refundPolicy ?? `Contact ${summary.vendorName} for their refund policy.`}
                </p>
                <p className="!mb-0">
                  Set by the instructor and applies to the class price and fees they add. The
                  CarryClass transaction fee ({PLATFORM_SERVICE_FEE_PERCENT_LABEL}) is non-refundable.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PayButton({ acknowledgmentsComplete }: { acknowledgmentsComplete: boolean }) {
  const checkoutState = useCheckoutElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (checkoutState.type !== "success") return null;

  const { checkout } = checkoutState;

  async function handlePay() {
    setError(null);
    if (!acknowledgmentsComplete) {
      setError("Please confirm the required acknowledgments above before paying.");
      return;
    }
    setLoading(true);
    try {
      const result = await checkout.confirm();
      if (result.type === "error") {
        setError(result.error.message ?? "Payment failed. Try again.");
        setLoading(false);
      }
      // On success Stripe redirects to return_url.
    } catch {
      setError("Payment failed. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={!checkout.canConfirm || loading || !acknowledgmentsComplete}
        onClick={handlePay}
        className="btn-primary bg-secondary-2 small w-button w-full disabled:cursor-not-allowed"
      >
        {loading ? "Processing…" : `Pay ${checkout.total?.total?.amount ?? ""}`.trim()}
      </button>
      <p className="pt-3 text-center text-xs text-zinc-500">
        Payments are processed securely by Stripe.
      </p>
    </div>
  );
}
