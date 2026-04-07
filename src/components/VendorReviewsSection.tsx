import Image from "next/image";
import { getPlaceReviews } from "@/lib/google-reviews";
import type { Vendor } from "@/types";
import type { GoogleReview } from "@/lib/google-reviews";

/** Dark blue accents — uses site `--navy` (see globals.css), consistent with other vendor UI */

const linkGoogleClass =
  "font-medium text-[var(--navy)] underline decoration-[var(--navy)]/35 underline-offset-2 transition-colors hover:text-blue-800 hover:decoration-blue-800/45 focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[var(--navy)] focus-visible:ring-offset-2";

const ctaFocusClass =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy)] focus-visible:ring-offset-2";

/** Placeholder reviews to show layout when Google data is not yet configured */
const PLACEHOLDER_REVIEWS: { rating: number; userRatingsTotal: number; reviews: GoogleReview[] } = {
  rating: 4.7,
  userRatingsTotal: 24,
  reviews: [
    {
      authorName: "Mike R.",
      rating: 5,
      relativeTime: "2 weeks ago",
      text: "Great class. Instructor was very knowledgeable and made the material easy to follow. Range time was well organized. Would recommend to anyone looking for CCW training.",
    },
    {
      authorName: "Sarah T.",
      rating: 5,
      relativeTime: "1 month ago",
      text: "Professional and thorough. Got my certificate same day. The renewal process was straightforward and the staff answered all my questions.",
    },
    {
      authorName: "James K.",
      rating: 4,
      relativeTime: "2 months ago",
      text: "Solid training experience. Good balance of classroom and range. Only minor complaint was the room was a bit warm. Otherwise very satisfied.",
    },
  ],
};

function StarRating({ rating, size = "default" }: { rating: number; size?: "default" | "lg" }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const starClass = size === "lg" ? "text-lg leading-none" : "text-base leading-none";
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
              ? "text-amber-500 drop-shadow-[0_0.5px_0_rgba(180,83,9,0.25)]"
              : half && i === full + 1
                ? "text-amber-500 opacity-[0.85]"
                : "text-zinc-300"
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
}

function ReviewCard({ review }: { review: GoogleReview }) {
  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm ring-1 ring-zinc-100/80 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {review.profilePhotoUrl ? (
            <Image
              src={review.profilePhotoUrl}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-zinc-100"
              unoptimized
            />
          ) : (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-800 ring-2 ring-zinc-100"
              aria-hidden
            >
              {review.authorName.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          <div>
            <p className="font-semibold text-zinc-900">{review.authorName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <StarRating rating={review.rating} />
              <span className="text-xs font-medium text-zinc-600">{review.relativeTime}</span>
            </div>
          </div>
        </div>
      </div>
      {review.text && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-800">{review.text}</p>
      )}
    </li>
  );
}

export async function VendorReviewsSection({ vendor }: VendorReviewsSectionProps) {
  const placeId = vendor.googlePlaceId;
  const data = placeId ? await getPlaceReviews(placeId) : null;
  const usePlaceholder = !data || data.reviews.length === 0;
  const displayData = usePlaceholder ? PLACEHOLDER_REVIEWS : data!;

  return (
    <section
      className="mt-16 rounded-2xl border border-zinc-300/90 bg-gradient-to-br from-zinc-50 via-white to-blue-50/45 p-6 shadow-md ring-1 ring-zinc-200/60 sm:p-8"
      aria-labelledby="reviews-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          id="reviews-heading"
          className="border-l-4 border-l-[var(--navy)] pl-3 text-lg font-semibold text-zinc-900"
        >
          Reviews
        </h2>
        {!usePlaceholder && data!.reviews.length > 0 && vendor.googleReviewsUrl && (
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

      {usePlaceholder && (
        <p className="mt-3 rounded-lg border border-blue-200/90 bg-blue-50/90 px-3 py-2 text-xs text-zinc-700">
          Sample layout — real reviews from Google will appear here when Place ID is set.
        </p>
      )}

      {displayData.reviews.length > 0 && (
        <>
          <div className="mt-6 flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <StarRating rating={displayData.rating} size="lg" />
                <span className="tabular-nums text-xl font-bold tracking-tight text-zinc-900">
                  {displayData.rating.toFixed(1)}
                </span>
              </div>
              <span className="text-sm font-medium text-zinc-700">
                Based on {displayData.userRatingsTotal} Google review{displayData.userRatingsTotal !== 1 ? "s" : ""}
                {usePlaceholder && " (placeholder)"}
              </span>
            </div>

            <ul className="m-0 list-none space-y-6 p-0" role="list">
              {displayData.reviews.map((review, i) => (
                <ReviewCard key={i} review={review} />
              ))}
            </ul>
          </div>

          {vendor.googleReviewsUrl && !usePlaceholder && (
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

          {usePlaceholder && vendor.googleReviewsUrl && (
            <p className="mt-6 text-center">
              <a
                href={vendor.googleReviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm ${linkGoogleClass}`}
              >
                See reviews on Google
              </a>
            </p>
          )}
        </>
      )}

      {!usePlaceholder && data!.reviews.length === 0 && data!.userRatingsTotal > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <StarRating rating={data!.rating} size="lg" />
            <span className="tabular-nums text-xl font-bold tracking-tight text-zinc-900">
              {data!.rating.toFixed(1)}
            </span>
          </div>
          <span className="text-sm font-medium text-zinc-700">
            Based on {data!.userRatingsTotal} Google review{data!.userRatingsTotal !== 1 ? "s" : ""}. No review
            text available to display.
          </span>
          {vendor.googleReviewsUrl && (
            <a
              href={vendor.googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-primary bg-secondary-2 small w-button inline-block ${ctaFocusClass}`}
            >
              View on Google
            </a>
          )}
        </div>
      )}
    </section>
  );
}
