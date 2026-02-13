"use client";

const HERO_IMAGES = [
  ["/images/jeferson-santu-2AZz7FXD3qI-unsplash.jpg", "/images/artem-zhukov-08M4vqU_Q-k-unsplash.jpg"],
  ["/images/Screen-Shot-2025-10-29-at-8.45.33-AM.png", "/images/jeferson-santu-HmK7MVxlo9M-unsplash.jpg", "/images/joel-moysuh-wJMzCNY7ZkM-unsplash.jpg"],
  ["/images/jay-rembert-LcAaVZXDTkI-unsplash.jpg", "/images/Screen-Shot-2025-10-29-at-8.44.49-AM.png"],
];

// Stagger delay for each column so they float slightly out of sync
const COLUMN_DELAYS = ["0s", "0.4s", "0.2s"];

export function HeroImages() {
  return (
    <div className="grid-3-columns top-section---grid-right">
      {HERO_IMAGES.map((column, colIndex) => (
        <div key={colIndex} className={colIndex === 0 ? "top-section-grid-right---column first" : colIndex === 1 ? "top-section-grid-right---column second" : "top-section-grid-right---column third"}>
          <div className="grid-1-column gap-row-20px gap-row-12px-mbl">
            {column.map((src, imgIndex) => (
              <div
                key={imgIndex}
                className="hero-float-image"
                style={{ animationDelay: COLUMN_DELAYS[colIndex] }}
              >
                <img
                  src={src}
                  loading="eager"
                  alt=""
                  className="border-radius-8px"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
