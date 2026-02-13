"use client";

import Link from "next/link";
import { useRef } from "react";
import { getCountyDisplayName } from "@/data/counties";

const COUNTY_SLUGS = [
  "los-angeles",
  "san-diego",
  "orange",
  "riverside",
  "san-bernardino",
  "sacramento",
];

const COUNTY_IMAGE_MAP: Record<string, string> = {
  "los-angeles": "/images/los-angeles.png",
  "san-diego": "/images/San-Diego---2.png",
  "orange": "/images/Orange-County.png",
  "riverside": "/images/riverside.png",
  "san-bernardino": "/images/san-bernardino.jpg",
  "sacramento": "/images/sacramento-2.jpg",
};

function getCountyImage(slug: string): string {
  return COUNTY_IMAGE_MAP[slug] ?? "/images/jeferson-santu-2AZz7FXD3qI-unsplash-p-500.jpg";
}

export function CountyScrollSection() {
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
            {COUNTY_SLUGS.map((slug) => (
              <Link
                key={slug}
                href={`/ca/${slug}`}
                className="county-card text-decoration-none w-inline-block"
                style={{ color: "inherit", background: "transparent", border: "none", padding: 0 }}
              >
                <div className="county-card-image-only" style={{ aspectRatio: "16/10", overflow: "hidden" }}>
                  <img
                    src={getCountyImage(slug)}
                    loading="lazy"
                    alt=""
                    className="link-item---image"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <span className="county-name-floating">
                  {getCountyDisplayName(slug)}, CA
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
