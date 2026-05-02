import Image from "next/image";
import { getPlaceReviews } from "@/lib/google-reviews";
import { getApprovedVendorReviews } from "@/lib/vendor-reviews";
import { VendorNativeReviewForm } from "@/components/VendorNativeReviewForm";
import type { Vendor } from "@/types";
import type { GoogleReview } from "@/lib/google-reviews";

/** Dark blue accents — uses site `--navy` (see globals.css), consistent with other vendor UI */

const linkGoogleClass =
  "font-medium text-[var(--navy)] underline decoration-[var(--navy)]/35 underline-offset-2 transition-colors hover:text-blue-800 hover:decoration-blue-800/45 focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[var(--navy)] focus-visible:ring-offset-2";

const ctaFocusClass =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy)] focus-visible:ring-offset-2";

function StarRating({ rating, size = "default" }: { rating: number; size?: "default" | "lg" }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const starClass = size === "lg" ? "text-[18px] leading-none" : "text-[14px] leading-none";
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${starClass}`}
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={
            i <= full
              ? "text-[#c96442]"
              : half && i === full + 1
                ? "text-[#c96442] opacity-[0.82]"
                : "text-[#d8d4cb]"
          }
        >
          ★
        </span>
      ))}
    </span>
  );
}

interface VendorReviewsSectionProps {
  vendor: Vendor;
  variant?: "default" | "profile-tab";
}

interface NativeReview {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
}

function ReviewCard({ review }: { review: GoogleReview }) {
  return (
    <li className="vendor-reviews-profile-card w-full rounded-[14px] border border-[#ebe9e2] bg-white px-4 py-4 text-left shadow-[0_1px_0_rgba(26,26,24,0.02)] sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {review.profilePhotoUrl ? (
            <Image
              src={review.profilePhotoUrl}
              alt=""
              width={30}
              height={30}
              className="h-[30px] w-[30px] rounded-full object-cover ring-1 ring-[#ece9e2]"
              unoptimized
            />
          ) : (
            <div
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#ece9e2] text-[13px] font-medium text-[#7d7b73] ring-1 ring-[#ece9e2]"
              aria-hidden
            >
              {review.authorName.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          <div>
            <p className="text-[15px] font-semibold leading-none text-[#2c2b28]">{review.authorName}</p>
            <p className="mt-1 text-[14px] leading-none text-[#8e8b83]">{review.relativeTime}</p>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>
      {review.text && (
        <p className="mt-3 text-[14px] leading-[1.55] text-[#585753]">{review.text}</p>
      )}
    </li>
  );
}

function formatNativeReviewDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function NativeReviewCard({ review }: { review: NativeReview }) {
  const displayDate = formatNativeReviewDate(review.createdAt);
  return (
    <li className="vendor-reviews-profile-card w-full rounded-[14px] border border-[#ebe9e2] bg-white px-4 py-4 text-left shadow-[0_1px_0_rgba(26,26,24,0.02)] sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#ece9e2] text-[13px] font-medium text-[#7d7b73] ring-1 ring-[#ece9e2]"
            aria-hidden
          >
            {review.authorName.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-[15px] font-semibold leading-none text-[#2c2b28]">{review.authorName}</p>
            {displayDate && <p className="mt-1 text-[14px] leading-none text-[#8e8b83]">{displayDate}</p>}
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>
      <p className="mt-3 text-[14px] leading-[1.55] text-[#585753]">{review.body}</p>
    </li>
  );
}

export async function VendorReviewsSection({
  vendor,
  variant = "default",
}: VendorReviewsSectionProps) {
  const placeId = vendor.googlePlaceId;
  const data = placeId ? await getPlaceReviews(placeId) : null;
  const hasGoogleReviews = Boolean(data && data.reviews.length > 0);
  const nativeReviews = hasGoogleReviews ? [] : await getApprovedVendorReviews(vendor.id);
  const nativeReviewCount = nativeReviews.length;
  const nativeAverageRating =
    nativeReviewCount > 0
      ? nativeReviews.reduce((sum, review) => sum + review.rating, 0) / nativeReviewCount
      : 0;
  const isProfileTab = variant === "profile-tab";

  return (
    <section
      className={
        isProfileTab
          ? "bg-transparent p-0 text-left shadow-none ring-0"
          : "mt-16 rounded-2xl border border-zinc-300/90 bg-gradient-to-br from-zinc-50 via-white to-blue-50/45 p-6 shadow-md ring-1 ring-zinc-200/60 sm:p-8"
      }
      aria-labelledby="reviews-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="reviews-heading" className={isProfileTab ? "sr-only" : "border-l-4 border-l-[var(--navy)] pl-3 text-lg font-semibold text-zinc-900"}>
          Reviews
        </h2>
        {hasGoogleReviews && vendor.googleReviewsUrl && (
          <a
            href={vendor.googleReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-sm ${linkGoogleClass}`}
          >
            View all on Google
          </a>
        )}
      </div>

      {hasGoogleReviews && data && (
        <>
          <div className="mt-1 flex w-full flex-col items-start gap-6 text-left">
            <div className={isProfileTab ? "vendor-reviews-profile-summary w-full space-y-2 text-left" : "flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-sm"}>
              {isProfileTab ? (
                <>
                  <p className="tabular-nums text-[54px] font-semibold leading-[0.95] tracking-[-0.02em] text-[#1f1f1d]">
                    {data.rating.toFixed(1)}
                  </p>
                  <StarRating rating={data.rating} size="lg" />
                  <p className="text-[15px] text-[#8e8b83]">
                    {data.userRatingsTotal} review{data.userRatingsTotal !== 1 ? "s" : ""}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <StarRating rating={data.rating} size="lg" />
                    <span className="tabular-nums text-xl font-bold tracking-tight text-zinc-900">
                      {data.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-zinc-700">
                    Based on {data.userRatingsTotal} Google review{data.userRatingsTotal !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>

            <ul className="vendor-reviews-profile-list m-0 w-full list-none space-y-3.5 p-0 text-left" role="list">
              {data.reviews.map((review, i) => (
                <ReviewCard key={i} review={review} />
              ))}
            </ul>
          </div>

          {vendor.googleReviewsUrl && (
            <p className="mt-6 text-center">
              <a
                href={vendor.googleReviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn-primary bg-secondary-2 small w-button inline-block ${ctaFocusClass}`}
              >
                View all on Google
              </a>
            </p>
          )}
        </>
      )}

      {!hasGoogleReviews && (
        <>
          <div className="mt-1 flex w-full flex-col items-start gap-6 text-left">
            <div
              className={
                isProfileTab
                  ? "vendor-reviews-profile-summary w-full space-y-2 text-left"
                  : "flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-sm"
              }
            >
              {isProfileTab ? (
                <>
                  <p className="tabular-nums text-[54px] font-semibold leading-[0.95] tracking-[-0.02em] text-[#1f1f1d]">
                    {nativeReviewCount > 0 ? nativeAverageRating.toFixed(1) : "—"}
                  </p>
                  <StarRating rating={nativeReviewCount > 0 ? nativeAverageRating : 0} size="lg" />
                  <p className="text-[15px] text-[#8e8b83]">
                    {nativeReviewCount} review{nativeReviewCount !== 1 ? "s" : ""}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <StarRating rating={nativeReviewCount > 0 ? nativeAverageRating : 0} size="lg" />
                    <span className="tabular-nums text-xl font-bold tracking-tight text-zinc-900">
                      {nativeReviewCount > 0 ? nativeAverageRating.toFixed(1) : "—"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-zinc-700">
                    Based on {nativeReviewCount} review{nativeReviewCount !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>

            {nativeReviewCount > 0 ? (
              <ul className="vendor-reviews-profile-list m-0 w-full list-none space-y-3.5 p-0 text-left" role="list">
                {nativeReviews.map((review) => (
                  <NativeReviewCard key={review.id} review={review} />
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-zinc-200 bg-white/90 px-4 py-3 text-sm text-zinc-700">
                No approved reviews yet. Be the first to submit one.
              </p>
            )}
          </div>
          <VendorNativeReviewForm vendorId={vendor.id} />
        </>
      )}
    </section>
  );
}
