import type { Vendor } from "@/types";
import { getCountyStats } from "@/lib/county-stats";

interface CountyStatsSectionProps {
  vendors: Vendor[];
  countyDisplayName: string;
}

export function CountyStatsSection({
  vendors,
  countyDisplayName,
}: CountyStatsSectionProps) {
  const { vendorCount, avgInitial, avgRenewal } = getCountyStats(vendors);
  const countyLine = `${countyDisplayName} County`;

  const formatStat = (n: number | null) =>
    n != null ? `$${n}` : "—";

  const cards = [
    {
      label: "Instructors",
      value: vendorCount > 0 ? String(vendorCount) : "0",
      lines: ["Approved vendors in", countyLine],
    },
    {
      label: "16-hour initial",
      value: formatStat(avgInitial),
      lines: ["Avg 16-hr initial course in", countyLine],
    },
    {
      label: "8-hour renewal",
      value: formatStat(avgRenewal),
      lines: ["Avg 8-hr renewal course in", countyLine],
    },
  ] as const;

  return (
    <section
      className="w-full border-y border-zinc-800/80 bg-zinc-950 py-14 sm:py-20"
      aria-labelledby="county-stats-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-10 text-center sm:mb-12">
          <p className="text-sm font-medium tracking-wide text-zinc-500">
            By the numbers
          </p>
          <h2
            id="county-stats-heading"
            className="mt-2 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Local training, in numbers.
          </h2>
        </header>

        <ul className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {cards.map((card) => (
            <li key={card.label}>
              <div
                className="group h-full rounded-xl border border-zinc-800/90 bg-zinc-900/70 p-6 text-left shadow-sm transition duration-300 ease-out hover:-translate-y-1 hover:border-zinc-600 hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-black/30"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  {card.label}
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums text-white transition duration-300 group-hover:text-sky-300">
                  {card.value}
                </p>
                <div className="mt-3 space-y-0.5 text-sm leading-snug text-zinc-400">
                  {card.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
