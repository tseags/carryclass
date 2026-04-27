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

  const getRange = (value: number | null, spread: number) => {
    if (value == null) return null;
    const min = Math.max(0, Math.round(value - spread));
    const max = Math.round(value + spread);
    const span = Math.max(1, max - min);
    const markerPercent = ((value - min) / span) * 100;
    return { min, max, markerPercent: Math.max(0, Math.min(100, markerPercent)) };
  };

  const initialRange = getRange(avgInitial, 30);
  const renewalRange = getRange(avgRenewal, 18);

  const cards = [
    {
      key: "vendors",
      eyebrow: "TOTAL APPROVED",
      value: vendorCount > 0 ? String(vendorCount) : "0",
      description: "Approved Vendors",
      range: null,
    },
    {
      key: "initial",
      eyebrow: "AVG 16-HR-INITIAL",
      value: formatStat(avgInitial),
      description: `across ${vendorCount > 0 ? vendorCount : 0} ${countyDisplayName} County vendors`,
      range: initialRange,
    },
    {
      key: "renewal",
      eyebrow: "AVG 8-HR-RENEWAL",
      value: formatStat(avgRenewal),
      description: "typically half the initial cost",
      range: renewalRange,
    },
  ] as const;

  return (
    <section
      className="county-stats-section relative z-[2] w-full overflow-visible border-y border-[#d9d1c5] bg-[#f2efe8] py-14 sm:py-20"
      aria-labelledby="county-stats-heading"
    >
      <div className="mx-auto max-w-6xl overflow-visible px-4 py-1 sm:px-6">
        <header className="mb-10 w-full overflow-x-auto text-center sm:mb-12">
          <h2
            id="county-stats-heading"
            className="county-stats-section-heading inline-block min-w-min text-[#141413] whitespace-normal sm:whitespace-nowrap"
          >
            {sectionTitle}
          </h2>
        </header>

        <ul className="mx-auto grid w-full max-w-5xl grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6 sm:gap-5">
          {cards.map((card) => (
            <li key={card.key} className="group relative overflow-visible">
              <div
                className="relative z-10 flex h-full min-h-[112px] flex-col rounded-2xl border border-[#ded7cb] bg-[#fbfaf6] px-4 py-3 text-left shadow-[0_1px_0_rgba(255,255,255,0.95),0_8px_20px_rgba(55,45,27,0.08)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_1px_0_rgba(255,255,255,0.95),0_12px_26px_rgba(55,45,27,0.12)] sm:px-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#c86442] sm:text-xs">
                  {card.eyebrow}
                </p>
                <p className="mt-1 text-5xl font-semibold leading-none tabular-nums text-[#141413] sm:text-6xl">
                  {card.value}
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-[#66645f] sm:text-base">
                  {card.description}
                </p>
                {card.range ? (
                  <div className="mt-auto pt-3">
                    <div className="relative h-2.5 rounded-full bg-[#e8e4d9]">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-[#c86442]"
                        style={{ width: `${card.range.markerPercent}%` }}
                      />
                      <span
                        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d9d1c5] bg-white"
                        style={{ left: `${card.range.markerPercent}%` }}
                        aria-hidden
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-2xl font-medium text-[#88857d] sm:text-[1.55rem]">
                      <span>${card.range.min}</span>
                      <span>${card.range.max}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
