"use client";

import Link from "next/link";

const PER_PAGE = 12;

interface VendorsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  searchParamsString: string;
}

function pageUrl(searchParamsString: string, page: number): string {
  const p = new URLSearchParams(searchParamsString);
  if (page <= 1) p.delete("page");
  else p.set("page", String(page));
  const q = p.toString();
  return q ? `/vendors?${q}` : "/vendors";
}

export function VendorsPagination({
  currentPage,
  totalPages,
  totalCount,
  searchParamsString,
}: VendorsPaginationProps) {
  if (totalPages <= 1) {
    return (
      <div className="vendors-pagination" role="navigation" aria-label="Vendor list">
        <span className="vendors-pagination-count">
          Showing {totalCount} instructor{totalCount !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  const from = (currentPage - 1) * PER_PAGE + 1;
  const to = Math.min(currentPage * PER_PAGE, totalCount);

  return (
    <div className="vendors-pagination" role="navigation" aria-label="Vendor list pagination">
      <span className="vendors-pagination-count">
        Showing {from}–{to} of {totalCount}
      </span>
      <div className="vendors-pagination-bar">
        <Link
          href={pageUrl(searchParamsString, currentPage - 1)}
          className="vendors-pagination-btn vendors-pagination-prev"
          aria-label="Previous page"
          style={{ visibility: currentPage <= 1 ? "hidden" : "visible" }}
        >
          ←
        </Link>
        <div className="vendors-pagination-dots">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={pageUrl(searchParamsString, p)}
              className={`vendors-pagination-dot ${p === currentPage ? "active" : ""}`}
              aria-label={`Page ${p}`}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </Link>
          ))}
        </div>
        <Link
          href={pageUrl(searchParamsString, currentPage + 1)}
          className="vendors-pagination-btn vendors-pagination-next"
          aria-label="Next page"
          style={{ visibility: currentPage >= totalPages ? "hidden" : "visible" }}
        >
          →
        </Link>
      </div>
    </div>
  );
}

export { PER_PAGE };
