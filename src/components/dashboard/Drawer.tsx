"use client";

import { useEffect } from "react";
import { DASH_BORDER } from "./dashboard-theme";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional sticky footer (e.g. action buttons). */
  footer?: React.ReactNode;
}

/** Reusable right-side slide-over with a backdrop. */
export function Drawer({ open, onClose, title, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-[#1F1B16]/30 backdrop-blur-[1px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white text-[#1F1B16] shadow-[0_0_48px_-12px_rgba(31,27,22,0.35)] transition-transform duration-300 ease-out sm:rounded-l-2xl ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className={`flex items-center justify-between border-b px-5 py-4 sm:px-6 ${DASH_BORDER}`}>
          <h2 className="!m-0 !text-base !font-semibold !leading-snug tracking-tight !text-[#1F1B16]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-lg !bg-transparent p-1.5 text-[#A39B91] transition-colors hover:!bg-[#F1ECE5] hover:text-[#1F1B16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C1440E]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className={`border-t bg-[#FBF9F6] px-5 py-4 sm:px-6 ${DASH_BORDER}`}>{footer}</div>
        )}
      </div>
    </div>
  );
}
