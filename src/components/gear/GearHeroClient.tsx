"use client";

import { useState, useEffect } from "react";
import { GEAR_HERO } from "@/data/gear-page";

/**
 * Returns object-position x% so the gun stays visible on the right. At large
 * viewport widths, 140% pushes the image too far; we use smaller values so the
 * right side of the image (gun) stays in frame.
 */
function getObjectPositionX(width: number): string {
  if (width >= 1280) return "95%";
  if (width >= 1024) return "110%";
  if (width >= 768) return "125%";
  return "140%";
}

export function GearHeroClient() {
  const [objectPositionX, setObjectPositionX] = useState("140%");

  useEffect(() => {
    const update = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 0;
      setObjectPositionX(getObjectPositionX(w));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section
      className="relative flex min-h-[380px] items-center justify-start overflow-hidden bg-zinc-900 sm:min-h-[460px] md:min-h-[520px] lg:min-h-[560px] xl:min-h-[600px]"
      aria-label="Gear"
    >
      <img
        src={GEAR_HERO.backgroundImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-90"
        style={{
          objectPosition: `${objectPositionX} 55%`,
          transform: "scale(1.15)",
        }}
        fetchPriority="high"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.65) 25%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 70%, transparent 85%), linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.18) 100%)",
        }}
      />
      <div className="relative z-10 w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-12 lg:px-16 lg:py-14 xl:px-20 xl:py-16">
        <div className="max-w-xl text-left">
          <h1
            className="text-4xl font-bold tracking-tight drop-shadow-lg sm:text-5xl md:text-6xl"
            style={{ color: "#ffffff", fontWeight: 700 }}
          >
            {GEAR_HERO.title}
          </h1>
          <p className="mt-4 text-lg text-white drop-shadow sm:text-xl">
            Holsters, belts, eye & ear protection, and more — trusted for CCW
            training and everyday carry.
          </p>
        </div>
      </div>
    </section>
  );
}
