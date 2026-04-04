"use client";

import { useState, useCallback, useEffect } from "react";

interface VendorPhotoGridProps {
  photos: string[];
  vendorName: string;
}

const GRID_PREVIEW_COUNT = 4;

export function VendorPhotoGrid({ photos, vendorName }: VendorPhotoGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const openLightbox = useCallback((i: number) => {
    setIndex(i);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") setIndex((i) => (i <= 0 ? photos.length - 1 : i - 1));
      if (e.key === "ArrowRight") setIndex((i) => (i >= photos.length - 1 ? 0 : i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, photos.length, closeLightbox]);

  if (!photos.length) return null;

  const previewPhotos = photos.slice(0, GRID_PREVIEW_COUNT);
  const moreCount = photos.length - GRID_PREVIEW_COUNT;
  const showMoreOverlay = moreCount > 0;

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3" aria-label={`${vendorName} photos`}>
        {previewPhotos.map((src, i) => (
          <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-zinc-200">
            <button
              type="button"
              onClick={() => openLightbox(i)}
              className="absolute inset-0 flex h-full w-full items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`View photo ${i + 1} of ${photos.length}`}
            >
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
                sizes="(max-width: 640px) 50vw, 25vw"
              />
            </button>
            {showMoreOverlay && i === GRID_PREVIEW_COUNT - 1 && (
              <button
                type="button"
                onClick={() => openLightbox(GRID_PREVIEW_COUNT)}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-blue-800 px-2.5 py-1.5 text-sm font-medium text-white shadow-md hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`View all ${photos.length} photos`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
                </svg>
                <span>{moreCount}+</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full p-2 text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close gallery"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div
            className="relative max-h-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[index]}
              alt={`${vendorName} photo ${index + 1} of ${photos.length}`}
              className="max-h-[85vh] w-auto rounded-lg object-contain"
            />
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-white/80">
              <span>{index + 1} / {photos.length}</span>
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIndex((i) => (i <= 0 ? photos.length - 1 : i - 1)); }}
                    className="rounded px-2 py-1 hover:bg-white/10"
                    aria-label="Previous photo"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIndex((i) => (i >= photos.length - 1 ? 0 : i + 1)); }}
                    className="rounded px-2 py-1 hover:bg-white/10"
                    aria-label="Next photo"
                  >
                    Next
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
