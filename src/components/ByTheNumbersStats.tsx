import { AnimatedStatsGrid, type AnimatedStat } from "./AnimatedStatsGrid";

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
}: ByTheNumbersStatsProps): AnimatedStat[] {
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

export function ByTheNumbersStats(props: ByTheNumbersStatsProps) {
  return <AnimatedStatsGrid stats={buildStats(props)} />;
}
