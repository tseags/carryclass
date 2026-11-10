"use client";

import type { DashboardReview } from "@/lib/dashboard-db";
import { Drawer } from "./Drawer";
import { formatStudentName, formatLongDate } from "./dashboard-format";
import { DASH_CARD, DASH_INK, DASH_MUTED } from "./dashboard-theme";

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
          className={`h-4 w-4 ${n <= rating ? "text-[#C1440E]" : "text-[#E3DDD4]"}`}
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
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#C1440E]/10">
            <svg className="h-6 w-6 text-[#C1440E]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.45 4.46a1 1 0 00.95.69h4.69c.97 0 1.37 1.24.59 1.81l-3.8 2.76a1 1 0 00-.36 1.12l1.45 4.46c.3.92-.75 1.69-1.54 1.12l-3.8-2.76a1 1 0 00-1.18 0l-3.8 2.76c-.79.57-1.84-.2-1.54-1.12l1.45-4.46a1 1 0 00-.36-1.12L2.33 9.9c-.78-.57-.38-1.81.59-1.81h4.69a1 1 0 00.95-.69l1.45-4.46z" />
            </svg>
          </div>
          <p className={`!m-0 text-sm font-semibold ${DASH_INK}`}>No reviews yet</p>
          <p className={`!mb-0 !mt-1 max-w-xs text-sm ${DASH_MUTED}`}>
            Reviews are collected automatically after each class via your post-class
            follow-up email.
          </p>
        </div>
      ) : (
        <ul className="!m-0 !block space-y-3 !p-5 sm:!p-6">
          {reviews.map((review) => (
            <li key={review.id} className={`${DASH_CARD} p-4 sm:p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`!m-0 text-sm font-semibold ${DASH_INK}`}>
                    {formatStudentName(review.authorName)}
                  </p>
                  {review.classDate && (
                    <p className={`!mb-0 !mt-0.5 text-xs ${DASH_MUTED}`}>
                      Class attended {formatLongDate(review.classDate)}
                    </p>
                  )}
                </div>
                <StarRating rating={review.rating} />
              </div>
              <p className="!mb-0 !mt-3 whitespace-pre-line text-sm leading-relaxed text-[#3D3730]">
                {review.body}
              </p>
              <p className={`!mb-0 !mt-3 text-xs ${DASH_MUTED}`}>
                Submitted {formatLongDate(review.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
