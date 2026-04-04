import Image from "next/image";
import { getPlaceReviews } from "@/lib/google-reviews";
import type { Vendor } from "@/types";
import type { GoogleReview } from "@/lib/google-reviews";

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

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={
            i <= full
              ? "text-amber-400"
              : half && i === full + 1
                ? "text-amber-400 opacity-80"
                : "text-zinc-200"
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
    <li className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {review.profilePhotoUrl ? (
            <Image
              src={review.profilePhotoUrl}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-300 text-sm font-medium text-zinc-700"
              aria-hidden
            >
              {review.authorName.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          <div>
            <p className="font-medium text-zinc-900">{review.authorName}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <StarRating rating={review.rating} />
              <span className="text-xs text-zinc-500">{review.relativeTime}</span>
            </div>
          </div>
        </div>
      </div>
      {review.text && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-700">{review.text}</p>
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
    <section className="mt-16 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="reviews-heading" className="text-lg font-semibold text-zinc-800">
          Reviews
        </h2>
        {!usePlaceholder && data!.reviews.length > 0 && vendor.googleReviewsUrl && (
          <a
            href={vendor.googleReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-zinc-600 underline hover:text-zinc-900"
          >
            View all on Google
          </a>
        )}
      </div>

      {usePlaceholder && (
        <p className="mt-2 text-xs text-zinc-500">
          Sample layout — real reviews from Google will appear here when Place ID is set.
        </p>
      )}

      {displayData.reviews.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-4 border-b border-zinc-200 pb-4">
            <div className="flex items-center gap-2">
              <StarRating rating={displayData.rating} />
              <span className="text-lg font-semibold text-zinc-900">{displayData.rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-zinc-600">
              Based on {displayData.userRatingsTotal} Google review{displayData.userRatingsTotal !== 1 ? "s" : ""}
              {usePlaceholder && " (placeholder)"}
            </span>
          </div>

          <ul className="mt-6 space-y-6" role="list">
            {displayData.reviews.map((review, i) => (
              <ReviewCard key={i} review={review} />
            ))}
          </ul>

          {vendor.googleReviewsUrl && !usePlaceholder && (
            <p className="mt-6 text-center">
              <a
                href={vendor.googleReviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary bg-secondary-2 small w-button inline-block"
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
                className="text-sm font-medium text-zinc-600 underline hover:text-zinc-900"
              >
                See reviews on Google
              </a>
            </p>
          )}
        </>
      )}

      {!usePlaceholder && data!.reviews.length === 0 && data!.userRatingsTotal > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-4 border-b border-zinc-200 pb-4">
          <div className="flex items-center gap-2">
            <StarRating rating={data!.rating} />
            <span className="text-lg font-semibold text-zinc-900">{data!.rating.toFixed(1)}</span>
          </div>
          <span className="text-sm text-zinc-600">
            Based on {data!.userRatingsTotal} Google review{data!.userRatingsTotal !== 1 ? "s" : ""}. No review text available to display.
          </span>
          {vendor.googleReviewsUrl && (
            <a
              href={vendor.googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary bg-secondary-2 small w-button inline-block"
            >
              View on Google
            </a>
          )}
        </div>
      )}
    </section>
  );
}
