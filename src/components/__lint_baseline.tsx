"use client";

import { useEffect, useRef, useState } from "react";

type Stat = {
  number: string;
  label: string;
};

export type ByTheNumbersStatsProps = {
  instructorCount: number;
  avgInitialPrice: number | null;
  avgRenewalPrice: number | null;
};

function formatPrice(n: number | null): string {
  return n != null ? `$${n}` : "—";
}

function buildStats({
  instructorCount,
  avgInitialPrice,
  avgRenewalPrice,
}: ByTheNumbersStatsProps): Stat[] {
  return [
    { number: "58", label: "California counties" },
    {
      number: instructorCount.toLocaleString("en-US"),
      label: "Sheriff-approved instructors",
    },
    { number: formatPrice(avgInitialPrice), label: "Avg initial price" },
    { number: formatPrice(avgRenewalPrice), label: "Avg renewal price" },
  ];
}

export function ByTheNumbersStats({
  instructorCount,
  avgInitialPrice,
  avgRenewalPrice,
}: ByTheNumbersStatsProps) {
  const stats = buildStats({ instructorCount, avgInitialPrice, avgRenewalPrice });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`by-the-numbers__stats${isVisible ? " is-visible" : ""}`}
      role="list"
    >
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="by-the-numbers__stat"
          role="listitem"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <div className="by-the-numbers__stat-number">{stat.number}</div>
          <div className="by-the-numbers__stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
