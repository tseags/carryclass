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
      eyebrow: "APPROVED COURSES",
      value: vendorCount > 0 ? String(vendorCount) : "0",
    },
    {
      key: "initial",
      eyebrow: "AVG 16-HR-INITIAL",
      value: formatStat(avgInitial),
    },
    {
      key: "renewal",
      eyebrow: "AVG 8-HR-RENEWAL",
      value: formatStat(avgRenewal),
    },
  ] as const;

  return (
    <section
      className="county-stats-section relative z-[2] w-full overflow-visible border-y border-[#d9d1c5] bg-[#f2efe8] py-8 sm:py-10"
      aria-labelledby="county-stats-heading"
    >
      <div className="mx-auto max-w-6xl overflow-visible px-4 sm:px-6">
        <header className="mb-6 w-full overflow-x-auto text-center sm:mb-8">
          <h2
            id="county-stats-heading"
            className="county-stats-section-heading inline-block min-w-min text-[#141413] whitespace-normal sm:whitespace-nowrap"
          >
            {sectionTitle}
          </h2>
        </header>

        <ul className="mx-auto flex w-full max-w-5xl flex-wrap justify-center gap-4 sm:gap-5">
          {cards.map((card) => (
            <li key={card.key} className="group relative flex shrink-0 justify-center">
              <div
                className="relative z-10 flex h-[8.75rem] w-[11.5rem] flex-col rounded-xl border border-[#ded7cb] bg-[#fbfaf6] px-4 py-3 text-left shadow-[0_1px_0_rgba(255,255,255,0.95),0_4px_14px_rgba(55,45,27,0.06)] transition duration-300 ease-out group-hover:-translate-y-0.5 group-hover:shadow-[0_1px_0_rgba(255,255,255,0.95),0_8px_22px_rgba(55,45,27,0.09)] sm:h-[10.5rem] sm:w-[15.25rem] sm:px-5 sm:py-4"
              >
                <p className="text-sm font-semibold uppercase leading-tight tracking-[0.06em] text-[#c86442] sm:text-base sm:whitespace-nowrap">
                  {card.eyebrow}
                </p>
                <div className="flex min-h-0 flex-1 flex-col justify-center">
                  <p className="text-5xl font-semibold leading-none tabular-nums text-[#141413] transition-colors duration-300 group-hover:text-[#c86442] sm:text-6xl">
                    {card.value}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
