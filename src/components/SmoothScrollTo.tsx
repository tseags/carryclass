"use client";

import { useCallback, type CSSProperties } from "react";

interface SmoothScrollToProps {
  targetId: string;
  className?: string;
  style?: CSSProperties;
  children: React.ReactNode;
}

export function SmoothScrollTo({ targetId, className, style, children }: SmoothScrollToProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const el = document.getElementById(targetId);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [targetId]
  );

  return (
    <a href={`#${targetId}`} onClick={handleClick} className={className} style={style}>
      {children}
    </a>
  );
}
