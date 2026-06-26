"use client";

import type { DashboardReview } from "@/lib/dashboard-db";
import { Drawer } from "./Drawer";
import { formatStudentName, formatLongDate } from "./dashboard-format";

interface Props {
  open: boolean;
  onClose: () => void;
  reviews: DashboardReview[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className={`h-4 w-4 ${n <= rating ? "text-[#C1440E]" : "text-gray-300"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.45 4.46a1 1 0 00.95.69h4.69c.97 0 1.37 1.24.59 1.81l-3.8 2.76a1 1 0 00-.36 1.12l1.45 4.46c.3.92-.75 1.69-1.54 1.12l-3.8-2.76a1 1 0 00-1.18 0l-3.8 2.76c-.79.57-1.84-.2-1.54-1.12l1.45-4.46a1 1 0 00-.36-1.12L2.33 9.9c-.78-.57-.38-1.81.59-1.81h4.69a1 1 0 00.95-.69l1.45-4.46z" />
        </svg>
      ))}
    </div>
  );
}

export function ReviewsDrawer({ open, onClose, reviews }: Props) {
  return (
    <Drawer open={open} onClose={onClose} title={`Your Reviews (${reviews.length})`}>
      {reviews.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.45 4.46a1 1 0 00.95.69h4.69c.97 0 1.37 1.24.59 1.81l-3.8 2.76a1 1 0 00-.36 1.12l1.45 4.46c.3.92-.75 1.69-1.54 1.12l-3.8-2.76a1 1 0 00-1.18 0l-3.8 2.76c-.79.57-1.84-.2-1.54-1.12l1.45-4.46a1 1 0 00-.36-1.12L2.33 9.9c-.78-.57-.38-1.81.59-1.81h4.69a1 1 0 00.95-.69l1.45-4.46z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">No reviews yet</p>
          <p className="mt-1 max-w-xs text-sm text-gray-500">
            Reviews are collected automatically after each class via your post-class
            follow-up email.
          </p>
        </div>
      ) : (
        <ul className="space-y-4 p-5">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatStudentName(review.authorName)}
                  </p>
                  {review.classDate && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      Class attended {formatLongDate(review.classDate)}
                    </p>
                  )}
                </div>
                <StarRating rating={review.rating} />
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {review.body}
              </p>
              <p className="mt-3 text-xs text-gray-400">
                Submitted {formatLongDate(review.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
