"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

type BenefitIconName = "booking" | "dashboard" | "visibility";

export type InstructorBenefit = {
  title: string;
  description: string;
  icon: BenefitIconName;
};

function benefitSlugFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const fromQuery = new URLSearchParams(window.location.search).get("benefit");
  if (fromQuery) return fromQuery.toLowerCase();
  const fromHash = window.location.hash.replace(/^#/, "");
  return fromHash ? decodeURIComponent(fromHash).toLowerCase() : null;
}

function indexFromSlug(
  benefits: readonly InstructorBenefit[],
  slug: string | null,
): number | null {
  if (!slug) return null;
  const i = benefits.findIndex((b) => b.icon === slug);
  return i >= 0 ? i : null;
}

const SHOTS: Record<BenefitIconName, { src: string; alt: string }> = {
  booking: {
    src: "/images/for-instructors/bookings.png",
    alt: "Student booking page with a Stripe checkout card and the instructor payments dashboard.",
  },
  dashboard: {
    src: "/images/for-instructors/dashboard-v2.png",
    alt: "Full instructor dashboard with registrations, the next class, and an upcoming payout.",
  },
  visibility: {
    src: "/images/for-instructors/visibility-listings-v4.png",
    alt: "Student listings on CarryClass, with monthly visitors, listing views, and bookings.",
  },
};

function BenefitIcon({ type }: { type: BenefitIconName }) {
  const strokeProps = {
    stroke: "#c96442",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const svgProps = {
    width: 20,
    height: 20,
    viewBox: "0 0 22 22",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
  };

  if (type === "booking") {
    return (
      <svg {...svgProps}>
        <rect x="3.5" y="5" width="15" height="13" rx="2.5" {...strokeProps} />
        <path d="M3.5 9.5h15" {...strokeProps} />
        <path d="M7.5 3.5v3M14.5 3.5v3" {...strokeProps} />
        <path d="M8 13.5l2 2 4-4" {...strokeProps} />
      </svg>
    );
  }

  if (type === "dashboard") {
    return (
      <svg {...svgProps}>
        <rect x="3.5" y="4" width="7" height="5.5" rx="1.5" {...strokeProps} />
        <rect x="11.5" y="4" width="7" height="5.5" rx="1.5" {...strokeProps} />
        <rect x="3.5" y="12.5" width="15" height="5.5" rx="1.5" {...strokeProps} />
      </svg>
    );
  }

  return (
    <svg {...svgProps}>
      <circle cx="9.5" cy="9.5" r="5.5" {...strokeProps} />
      <path d="M13.5 13.5L18 18" {...strokeProps} />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={dir === "left" ? "M10 3.5L5.5 8 10 12.5" : "M6 3.5L10.5 8 6 12.5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BenefitsShowcase({
  benefits,
  initialIndex = 0,
}: {
  benefits: readonly InstructorBenefit[];
  initialIndex?: number;
}) {
  const safeInitial = initialIndex >= 0 && initialIndex < benefits.length ? initialIndex : 0;
  const [index, setIndex] = useState(safeInitial);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const suppressClick = useRef(false);
  const count = benefits.length;

  useEffect(() => {
    function scrollToBenefits() {
      const hash = window.location.hash.replace(/^#/, "");
      const target =
        (hash && document.getElementById(hash)) ||
        document.getElementById("for-instructors-benefits");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function applyFromLocation(scroll: boolean) {
      const next = indexFromSlug(benefits, benefitSlugFromLocation());
      if (next === null) return;
      setIndex(next);
      if (scroll) {
        // Next/Clerk hydration can reset scroll; retry briefly after paint.
        requestAnimationFrame(() => {
          scrollToBenefits();
          window.setTimeout(scrollToBenefits, 120);
          window.setTimeout(scrollToBenefits, 400);
        });
      }
    }

    applyFromLocation(true);
    const onHashChange = () => applyFromLocation(true);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [benefits]);

  function go(next: number, focus = false) {
    const i = (next + count) % count;
    setIndex(i);
    if (focus) tabRefs.current[i]?.focus();
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    function onUp(ev: PointerEvent) {
      window.removeEventListener("pointerup", onUp);
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) return;
      suppressClick.current = true;
      setIndex((current) => {
        const step = dx < 0 ? 1 : -1;
        return (current + step + count) % count;
      });
    }
    window.addEventListener("pointerup", onUp);
  }

  function onTabKeyDown(event: React.KeyboardEvent, i: number) {
    let next = i;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (i + 1) % count;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (i - 1 + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else return;
    event.preventDefault();
    go(next, true);
  }

  return (
    <div className="for-instructors-benefits__layout" onPointerDown={onPointerDown}>
      <div
        className="for-instructors-benefits__stack"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Why instructors use CarryClass"
      >
        {benefits.map((benefit, i) => {
          const active = i === index;
          return (
            <button
              key={benefit.icon}
              ref={(node) => {
                tabRefs.current[i] = node;
              }}
              type="button"
              role="tab"
              id={benefit.icon}
              className={`for-instructors-benefits__card${active ? " is-active" : ""}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                setIndex(i);
              }}
              onKeyDown={(event) => onTabKeyDown(event, i)}
            >
              <span className="for-instructors-benefits__head">
                <span className="for-instructors-benefits__icon" aria-hidden="true">
                  <BenefitIcon type={benefit.icon} />
                </span>
                <span className="for-instructors-benefits__title">{benefit.title}</span>
              </span>
              <span className="for-instructors-benefits__body" aria-hidden={!active}>
                <span className="for-instructors-benefits__body-inner">
                  <span className="for-instructors-benefits__copy">{benefit.description}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={benefits[index]?.icon}
        className="for-instructors-benefits__stage"
      >
        {benefits.map((benefit, i) => {
          const shot = SHOTS[benefit.icon];
          const active = i === index;
          return (
            <Image
              key={benefit.icon}
              src={shot.src}
              alt={active ? shot.alt : ""}
              fill
              sizes="(max-width: 991px) 100vw, 720px"
              className={`for-instructors-benefits__shot${active ? " is-active" : ""}`}
              aria-hidden={!active}
              draggable={false}
            />
          );
        })}
        <button
          type="button"
          className="for-instructors-benefits__nav for-instructors-benefits__nav--prev"
          aria-label="Previous"
          onClick={() => go(index - 1)}
        >
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          className="for-instructors-benefits__nav for-instructors-benefits__nav--next"
          aria-label="Next"
          onClick={() => go(index + 1)}
        >
          <Chevron dir="right" />
        </button>
      </div>
    </div>
  );
}
