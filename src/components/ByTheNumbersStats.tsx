"use client";

import { useEffect, useRef, useState } from "react";

type Stat = {
  number: string;
  label: string;
};

const STATS: Stat[] = [
  { number: "58", label: "California counties" },
  { number: "400+", label: "Instructor listings" },
  { number: "4", label: "Course types" },
  { number: "100%", label: "Sheriff-approved" },
  { number: "$125", label: "Avg initial price" },
  { number: "$85", label: "Avg renewal price" },
];

export function ByTheNumbersStats() {
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
      {STATS.map((stat, index) => (
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
