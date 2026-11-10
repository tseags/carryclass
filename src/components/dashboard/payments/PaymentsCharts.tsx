"use client";

const ACCENT = "#C1440E";
const COMPARE = "#D1D5DB";

function toPath(values: number[], max: number, width: number, height: number): string {
  if (values.length === 0) return "";
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = values.length > 1 ? i * stepX : width / 2;
      const y = height - (max > 0 ? (v / max) * (height - 4) : 0) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/**
 * Line chart with an optional dashed comparison series. `solidUntil` splits the
 * primary line so the rest of today can render as a dashed baseline (Stripe-style).
 */
export function LineChart({
  values,
  compare,
  solidUntil,
  height = 80,
  fill = false,
  ariaLabel,
}: {
  values: number[];
  compare?: number[] | null;
  solidUntil?: number;
  height?: number;
  fill?: boolean;
  ariaLabel: string;
}) {
  const width = 300;
  const max = Math.max(1, ...values, ...(compare ?? []));
  const splitAt = solidUntil == null ? values.length - 1 : Math.min(solidUntil, values.length - 1);
  const solid = values.slice(0, splitAt + 1);
  const solidPath = toPath(solid, max, (width * Math.max(splitAt, 0)) / Math.max(values.length - 1, 1), height);
  const dashedPath =
    splitAt < values.length - 1
      ? toPath(values.slice(splitAt), max, (width * (values.length - 1 - splitAt)) / (values.length - 1), height)
      : "";
  const dashedOffset = (width * splitAt) / Math.max(values.length - 1, 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      {compare && compare.length > 0 && (
        <path
          d={toPath(compare, max, width, height)}
          fill="none"
          stroke={COMPARE}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {fill && solid.length > 1 && (
        <path
          d={`${solidPath} L${dashedOffset.toFixed(2)},${height} L0,${height} Z`}
          fill={ACCENT}
          fillOpacity={0.08}
          stroke="none"
        />
      )}
      <path d={solidPath} fill="none" stroke={ACCENT} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {dashedPath && (
        <g transform={`translate(${dashedOffset} 0)`}>
          <path
            d={dashedPath}
            fill="none"
            stroke={ACCENT}
            strokeOpacity={0.45}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}
    </svg>
  );
}

export function NoData({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg !border-2 border-dashed !border-[#E3DDD4] ${className}`}
    >
      <span className="rounded-md bg-[#F1ECE5] px-3 py-2 text-xs font-medium text-[#7A7268]">No data</span>
    </div>
  );
}
