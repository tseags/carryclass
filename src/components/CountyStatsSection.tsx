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
  const sectionTitle = `${countyDisplayName} County by the Numbers`;

  const formatStat = (n: number | null) =>
    n != null ? `$${n}` : "—";

  const cards = [
    {
      key: "vendors",
      value: vendorCount > 0 ? String(vendorCount) : "0",
      description: "Approved Vendors",
    },
    {
      key: "initial",
      value: formatStat(avgInitial),
      description: "Average 16-hr initial course",
    },
    {
      key: "renewal",
      value: formatStat(avgRenewal),
      description: "Average 8-hr renewal course",
    },
  ] as const;

  return (
    <section
      className="county-stats-section relative z-[2] w-full overflow-visible border-y border-zinc-700/90 bg-zinc-950 py-14 sm:py-20"
      aria-labelledby="county-stats-heading"
    >
      <div className="mx-auto max-w-6xl overflow-visible px-4 py-1 sm:px-6">
        <header className="mb-10 w-full overflow-x-auto text-center sm:mb-12">
          <h2
            id="county-stats-heading"
            className="county-stats-section-heading inline-block min-w-min"
          >
            {sectionTitle}
          </h2>
        </header>

        <ul className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3 sm:gap-5 lg:max-w-5xl">
          {cards.map((card) => (
            <li key={card.key} className="group relative overflow-visible">
              <div
                className="pointer-events-none absolute -inset-10 z-0 rounded-[1.75rem] bg-[radial-gradient(ellipse_95%_85%_at_50%_88%,rgba(255,255,255,0.32),rgba(255,255,255,0.14)_32%,rgba(200,210,225,0.1)_52%,transparent_74%)] blur-3xl transition duration-300 group-hover:bg-[radial-gradient(ellipse_95%_85%_at_50%_88%,rgba(255,255,255,0.4),rgba(255,255,255,0.18)_32%,rgba(200,210,225,0.14)_52%,transparent_74%)]"
                aria-hidden
              />
              <div
                className="relative z-10 flex h-full min-h-[140px] flex-col justify-center rounded-xl border-2 border-zinc-400 bg-zinc-900/70 px-4 py-5 text-left shadow-sm transition duration-300 ease-out group-hover:-translate-y-1 group-hover:border-zinc-300 group-hover:bg-zinc-800/80 group-hover:shadow-lg group-hover:shadow-black/30 sm:min-h-[150px] sm:px-5 sm:py-6"
              >
                <p className="text-7xl font-bold leading-none tabular-nums text-white transition duration-300 group-hover:text-sky-200">
                  {card.value}
                </p>
                <p className="mt-3 text-sm font-medium leading-snug text-white sm:text-base">
                  {card.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
