"use client";

const HERO_IMAGES: HeroImageColumns = [
  ["/images/jeferson-santu-2AZz7FXD3qI-unsplash.jpg", "/images/homepage-hero-tactical-class.png"],
  ["/images/concealed-carry-fundamentals-hero.png", "/images/jeferson-santu-HmK7MVxlo9M-unsplash.jpg", "/images/joel-moysuh-wJMzCNY7ZkM-unsplash.jpg"],
  ["/images/jay-rembert-LcAaVZXDTkI-unsplash.jpg", "/images/Screen-Shot-2025-10-29-at-8.44.49-AM.png"],
];

const FEATURED_HERO_IMAGE = "/images/homepage-hero-tactical-class.png";

const FEATURED_HERO_ALT = "CCW training class outdoors on a shooting range";

// Stagger delay for each column so they float slightly out of sync
const COLUMN_DELAYS = ["0s", "0.4s", "0.2s"];

export type HeroImageColumns = readonly (readonly string[])[];

export type HeroImagesProps = {
  /** Three columns of image paths; the middle column renders taller. */
  columns?: HeroImageColumns;
  /** Path of the one image rendered in a fixed 3:2 frame. */
  featuredImage?: string;
  featuredAlt?: string;
};

export function HeroImages({
  columns = HERO_IMAGES,
  featuredImage = FEATURED_HERO_IMAGE,
  featuredAlt = FEATURED_HERO_ALT,
}: HeroImagesProps = {}) {
  return (
    <div className="grid-3-columns top-section---grid-right">
      {columns.map((column, colIndex) => (
        <div key={colIndex} className={colIndex === 0 ? "top-section-grid-right---column first" : colIndex === 1 ? "top-section-grid-right---column second" : "top-section-grid-right---column third"}>
          <div className="grid-1-column gap-row-20px gap-row-12px-mbl">
            {column.map((src, imgIndex) => (
              <div
                key={imgIndex}
                className={
                  src === featuredImage
                    ? "hero-float-image home-hero-image--frame"
                    : "hero-float-image"
                }
                style={{ animationDelay: COLUMN_DELAYS[colIndex] }}
              >
                <img
                  src={src}
                  loading="eager"
                  alt={src === featuredImage ? featuredAlt : ""}
                  className={
                    src === featuredImage
                      ? "border-radius-8px home-hero-image--crop-3x2 home-hero-image--zoomed"
                      : "border-radius-8px"
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
