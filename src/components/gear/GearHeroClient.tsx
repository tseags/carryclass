"use client";

import { GEAR_HERO } from "@/data/gear-page";

export function GearHeroClient() {
  return (
    <section
      className="relative isolate overflow-hidden border-b border-zinc-800 bg-zinc-950"
      aria-label="Gear"
    >
      <div
        className="absolute inset-0 opacity-80"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 82% 44%, rgba(244,114,22,0.18) 0%, rgba(244,114,22,0.06) 14%, transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14 md:px-12 md:py-16 lg:px-16 lg:py-20 xl:px-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="max-w-2xl">
            <p className="text-xs text-zinc-400">
            Home <span className="mx-1 text-zinc-600">/</span> Gear
            </p>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-[#c96442]">
              CCW Training Essentials
            </p>
            <h1
              className="mt-4 max-w-[26ch] text-[2.2rem] font-medium leading-[1.06] tracking-tight sm:text-[2.7rem] md:text-[3rem]"
              style={{ color: "#ffffff", fontFamily: '"Lora", Georgia, serif' }}
            >
              {GEAR_HERO.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              View the best holsters, belts, PPE, and more — tested by CCW
              instructors and curated for your training day.
            </p>
          </div>

          <div className="hidden justify-self-end lg:block" aria-hidden="true">
            <div className="relative h-36 w-44 opacity-75">
              <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-300/30" />
              <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-300/40 bg-orange-300/10" />
              <div className="absolute bottom-3 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-orange-300/70" />
              <div className="absolute bottom-0 left-1/2 h-8 w-24 -translate-x-1/2 rounded-[100%] border-t border-orange-200/30" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
