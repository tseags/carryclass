"use client";

import { FormEvent, useMemo, useState } from "react";
import { vendorReviewLimits } from "@/lib/vendor-reviews";

type SubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

interface VendorNativeReviewFormProps {
  vendorId: string;
}

export function VendorNativeReviewForm({ vendorId }: VendorNativeReviewFormProps) {
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState("5");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle", message: "" });

  const isDisabled = submitState.status === "submitting";
  const remainingBodyChars = useMemo(
    () => vendorReviewLimits.maxBodyLength - body.length,
    [body.length]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState({ status: "submitting", message: "" });

    try {
      const response = await fetch("/api/vendor-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vendorId,
          rating: Number.parseInt(rating, 10),
          authorName,
          body,
          website,
        }),
      });

      const data = (await response.json()) as
        | { ok: true; message: string }
        | { ok: false; error?: { message?: string } };

      if (!response.ok || !data.ok) {
        const message =
          !data.ok && data.error?.message
            ? data.error.message
            : "Could not submit your review. Please try again.";
        setSubmitState({ status: "error", message });
        return;
      }

      setSubmitState({ status: "success", message: data.message });
      setAuthorName("");
      setRating("5");
      setBody("");
      setWebsite("");
    } catch {
      setSubmitState({
        status: "error",
        message: "Could not submit your review. Please try again.",
      });
    }
  }

  return (
    <form
      className="mt-6 rounded-[14px] border border-[#ebe9e2] bg-white p-4 shadow-[0_1px_0_rgba(26,26,24,0.02)] sm:p-5"
      onSubmit={handleSubmit}
    >
      <h3 className="text-[22px] font-semibold leading-tight text-[#1f1f1d]">Write a review</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label htmlFor="vendor-review-name" className="text-sm font-medium text-[#2f2e2b]">
            Name
          </label>
          <input
            id="vendor-review-name"
            name="authorName"
            type="text"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            required
            maxLength={vendorReviewLimits.maxAuthorNameLength}
            className="mt-1 block w-full rounded-md border border-[#d6d2c8] bg-white px-3 py-2 text-sm text-[#2f2e2b] shadow-sm focus:border-[#c96442] focus:outline-none focus:ring-2 focus:ring-[#c96442]/35"
          />
        </div>

        <div className="sm:col-span-1">
          <label htmlFor="vendor-review-rating" className="text-sm font-medium text-[#2f2e2b]">
            Rating
          </label>
          <select
            id="vendor-review-rating"
            name="rating"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-[#d6d2c8] bg-white px-3 py-2 text-sm text-[#2f2e2b] shadow-sm focus:border-[#c96442] focus:outline-none focus:ring-2 focus:ring-[#c96442]/35"
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} star{value !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="vendor-review-body" className="text-sm font-medium text-[#2f2e2b]">
          Review
        </label>
        <textarea
          id="vendor-review-body"
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          maxLength={vendorReviewLimits.maxBodyLength}
          rows={4}
          className="mt-1 block w-full rounded-md border border-[#d6d2c8] bg-white px-3 py-2 text-sm text-[#2f2e2b] shadow-sm focus:border-[#c96442] focus:outline-none focus:ring-2 focus:ring-[#c96442]/35"
        />
        <p className="mt-1 text-xs text-[#7b786f]">{remainingBodyChars} characters remaining</p>
      </div>

      <div className="hidden" aria-hidden>
        <label htmlFor="vendor-review-website">Website</label>
        <input
          id="vendor-review-website"
          name="website"
          type="text"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isDisabled}
          className="btn-primary bg-secondary-2 small inline-block !bg-[#c96442] !text-white hover:!bg-[#d97757] focus-visible:!bg-[#d97757] disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isDisabled ? "Submitting..." : "Submit review"}
        </button>
        <p
          className={`text-sm ${
            submitState.status === "error" ? "text-[#ad3b2e]" : "text-[#4b6551]"
          }`}
          role="status"
          aria-live="polite"
        >
          {submitState.message}
        </p>
      </div>
    </form>
  );
}
