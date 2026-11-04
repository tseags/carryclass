import Link from "next/link";
import {
  OTHER_CLASSES_HEADING,
  OTHER_CLASSES_NOTE,
  classesIndexPath,
  type PublicClassCard,
} from "@/lib/instructor-catalog";

function ClassCard({ card }: { card: PublicClassCard }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-[14px] border border-[#ebe9e2] !bg-white px-4 py-3.5 shadow-[0_1px_0_rgba(26,26,24,0.02)] sm:gap-4 sm:px-5 sm:py-4">
      <div className="min-w-0 flex-1">
        <h4 className="!m-0 text-[15px] font-semibold leading-[1.25] text-[#1f1f1d] sm:text-[16px]">
          {card.title}
        </h4>
        {card.subtitle ? (
          <p className="!mb-0 mt-0.5 text-[12px] leading-[1.35] text-[#77766f] line-clamp-2 sm:overflow-hidden sm:text-ellipsis sm:whitespace-nowrap sm:text-[13px]">
            {card.subtitle}
          </p>
        ) : null}
      </div>
      <p className="!m-0 shrink-0 self-center text-[20px] font-semibold leading-none tracking-[-0.02em] text-[#1f1f1d] sm:text-[26px]">
        {card.priceLabel}
      </p>
    </article>
  );
}

export function AvailableClasses({
  slug,
  ccw,
  other,
}: {
  slug: string;
  ccw: PublicClassCard[];
  other: PublicClassCard[];
}) {
  const empty = ccw.length === 0 && other.length === 0;
  return (
    <div>
      <h3 className="!m-0 min-w-0 text-[22px] font-semibold leading-[1.15] tracking-[-0.01em] text-[#1f1f1d] sm:text-[32px] lg:text-[40px]">
        <Link
          href={classesIndexPath(slug)}
          className="!text-inherit !no-underline hover:!text-[#c96442]"
        >
          Available Classes &amp; Prices
        </Link>
      </h3>
      <div className="mt-5 space-y-3">
        {empty ? (
          <article className="flex items-center justify-between gap-3 rounded-[14px] border border-[#ebe9e2] !bg-white px-4 py-3.5 sm:px-5 sm:py-4">
            <div>
              <h4 className="!m-0 text-[15px] font-semibold text-[#1f1f1d] sm:text-[16px]">CCW Class</h4>
              <p className="!mb-0 mt-0.5 text-[13px] text-[#77766f]">Call or email for current rates</p>
            </div>
            <p className="!m-0 shrink-0 self-center text-[20px] font-semibold text-[#1f1f1d] sm:text-[26px]">Contact</p>
          </article>
        ) : (
          ccw.map((card) => <ClassCard key={card.key} card={card} />)
        )}
      </div>
      {other.length > 0 && (
        <div className="mt-8">
          <h4 className="text-[20px] font-semibold leading-[1.2] text-[#1f1f1d] sm:text-[24px]">
            {OTHER_CLASSES_HEADING}
          </h4>
          <p className="mt-1 text-[14px] leading-[1.45] text-[#77766f] sm:text-[15px]">
            {OTHER_CLASSES_NOTE}
          </p>
          <div className="mt-4 space-y-3">
            {other.map((card) => (
              <ClassCard key={card.key} card={card} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
