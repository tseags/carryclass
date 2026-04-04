"use client";

import Link from "next/link";
import { useRef } from "react";

export type CountyScrollTile = {
  slug: string;
  displayName: string;
  url: string;
};

type Props = {
  tiles: CountyScrollTile[];
};

export function CountyScrollClient({ tiles }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="section overflow-hidden home-page">
      <div className="container-default w-container">
        <div className="grid-2-columns title-and-btn-grid mg-bottom-24px">
          <h2 className="mg-bottom-0">View CCW Courses by County</h2>
          <div>
            <Link href="/ca" className="btn-secondary w-button">
              View Counties
            </Link>
          </div>
        </div>
        <div className="county-scroll-wrapper" style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => scroll("left")}
            className="county-scroll-arrow btn-circle-secondary slider-arrow---bottom-64px-left--16px"
            style={{ position: "absolute", left: "-24px", top: "50%", transform: "translateY(-50%)", zIndex: 2 }}
            aria-label="Scroll left"
          >
            <div className="line-rounded-icon">‹</div>
          </button>
          <div ref={scrollRef} className="county-cards-scroll">
            {tiles.map(({ slug, displayName, url: imageUrl }) => (
              <Link
                key={slug}
                href={`/ca/${slug}`}
                className="county-card text-decoration-none w-inline-block"
                style={{ color: "inherit", background: "transparent", border: "none", padding: 0 }}
              >
                <div
                  className="county-card-image-only relative w-full"
                  style={{ aspectRatio: "16/10", overflow: "hidden" }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full min-h-[120px] items-center justify-center bg-zinc-200"
                      aria-hidden
                    >
                      <span className="text-sm font-medium text-zinc-600">{displayName}</span>
                    </div>
                  )}
                </div>
                <span className="county-name-floating">
                  {displayName}, CA
                </span>
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="county-scroll-arrow btn-circle-primary slider-arrow---bottom-64px---right--16px"
            style={{ position: "absolute", right: "-24px", top: "50%", transform: "translateY(-50%)", zIndex: 2 }}
            aria-label="Scroll right"
          >
            <div className="line-rounded-icon">›</div>
          </button>
        </div>
      </div>
    </div>
  );
}
