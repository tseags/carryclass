"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import type {
  CcwProcessMetrics,
  CcwTimelineProcess,
  CcwTimelineSubmission,
} from "@/types/ccw-timeline";

export interface CcwTimelineSectionProps {
  data: {
    countySlug: string;
    countyDisplayName: string;
    lastTimelineSubmittedCounty: string | null;
    processes: CcwProcessMetrics[];
  };
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}.${dd}.${yyyy}`;
}

function TimelineReportsList({
  submissions,
  variant = "inline",
}: {
  submissions: CcwTimelineSubmission[];
  variant?: "inline" | "modal";
}) {
  const cardClass =
    variant === "modal"
      ? "rounded-md border border-zinc-100 bg-white px-4 py-3 shadow-sm"
      : "rounded-md border border-white/25 bg-zinc-100 px-3 py-2.5 shadow-sm";
  const bodyClass =
    variant === "modal"
      ? "mt-2 whitespace-pre-wrap text-base leading-relaxed text-zinc-700"
      : "mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800";
  const nameClass =
    variant === "modal"
      ? "text-base font-semibold text-zinc-900"
      : "text-sm font-semibold text-zinc-900";
  const dateClass =
    variant === "modal" ? "shrink-0 text-xs text-zinc-500" : "shrink-0 text-xs text-zinc-700";

  return (
    <ul className="space-y-4">
      {submissions.map((s) => (
        <li key={s.id} className={cardClass}>
          <div className="flex items-baseline justify-between gap-2">
            <span className={nameClass}>{s.displayName}</span>
            <time className={dateClass} dateTime={s.submittedAt}>
              {formatShortDate(s.submittedAt)}
            </time>
          </div>
          <p className={bodyClass}>{s.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function CcwTimelineSection({ data }: CcwTimelineSectionProps) {
  const { countyDisplayName, countySlug, lastTimelineSubmittedCounty, processes } = data;

  const defaultProcess = useMemo((): CcwTimelineProcess => {
    const withData = processes.find((p) => p.submissions.length > 0);
    return withData?.process ?? processes[0]?.process ?? "initial";
  }, [processes]);

  const [selected, setSelected] = useState<CcwTimelineProcess>(defaultProcess);
  const [feedExpanded, setFeedExpanded] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formProcess, setFormProcess] = useState<CcwTimelineProcess>(defaultProcess);
  const [formDateStarted, setFormDateStarted] = useState("");
  const [formDateFinished, setFormDateFinished] = useState("");
  const [formTotalCost, setFormTotalCost] = useState("");
  const [formBody, setFormBody] = useState("");
  const [portalReady, setPortalReady] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const anyModalOpen = feedExpanded || submitModalOpen;

  const openSubmitModal = useCallback(() => {
    setFormDisplayName("");
    setFormBody("");
    setFormDateStarted("");
    setFormDateFinished("");
    setFormTotalCost("");
    setFormProcess(selected);
    setSubmitSuccess(false);
    setSubmitModalOpen(true);
  }, [selected]);

  const closeSubmitModal = useCallback(() => {
    setSubmitModalOpen(false);
    setSubmitSuccess(false);
  }, []);

  useEffect(() => {
    setSelected(defaultProcess);
  }, [defaultProcess]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!anyModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (submitModalOpen) closeSubmitModal();
      else setFeedExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [anyModalOpen, submitModalOpen, closeSubmitModal]);

  useEffect(() => {
    if (!anyModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [anyModalOpen]);

  const active = useMemo(
    () => processes.find((p) => p.process === selected) ?? processes[0],
    [processes, selected]
  );

  const scrollFeedIntoView = useCallback(() => {
    feedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const onSelectProcess = useCallback(
    (p: CcwTimelineProcess) => {
      setSelected(p);
      queueMicrotask(scrollFeedIntoView);
    },
    [scrollFeedIntoView]
  );

  const modalTitleId = "ccw-timeline-feed-modal-title";
  const submitModalTitleId = "ccw-timeline-submit-modal-title";

  const handleSubmitTimeline = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formBody.trim()) return;
    setSubmitSuccess(true);
  };

  return (
    <section
      id="ccw-timeline"
      className="ccw-timeline-section relative z-[1] border-b border-zinc-200 bg-white"
      aria-labelledby="ccw-timeline-heading"
    >
      <div className="container-default w-container">
        <div className="mx-auto overflow-visible py-10 sm:py-12 lg:py-14">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10 xl:gap-14">
            {/* Left ~40% */}
            <div className="w-full shrink-0 lg:w-[38%] lg:max-w-md lg:pt-1">
              <h2
                id="ccw-timeline-heading"
                className="heading-h2-size mg-bottom-0"
              >
                <span className="block">{countyDisplayName} County</span>
                <span className="block">CCW Timelines</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
                Estimated wait times from <strong>self-reported</strong> applicant
                experiences—initial, renewal, and modification—so you know what to expect
                in {countyDisplayName} County.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="btn-primary bg-secondary-2 small w-button inline-block w-full text-center sm:w-auto"
                  onClick={openSubmitModal}
                >
                  Submit your timeline
                </button>
              </div>
            </div>

            {/* Right ~60%: cards + feed */}
            <div className="flex w-full min-w-0 flex-1 flex-col gap-4 lg:gap-5">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-5 lg:gap-6">
                {processes.map((m) => {
                  const isActive = m.process === selected;
                  const showMetric = m.avgDays != null;
                  return (
                    <div
                      key={m.process}
                      className="flex min-w-0 flex-col"
                    >
                      <p className="text-lg font-semibold leading-snug text-zinc-900 sm:text-xl">
                        {m.label}
                      </p>
                      <div className="mt-1 pt-3">
                        <button
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => onSelectProcess(m.process)}
                          className={`w-full cursor-pointer rounded-md text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                            isActive ? "bg-blue-50/80" : "hover:bg-zinc-50"
                          }`}
                        >
                          {showMetric ? (
                            <>
                              <span className="block text-4xl font-bold tabular-nums tracking-tight text-zinc-900 sm:text-5xl">
                                {m.avgDays}
                              </span>
                              <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                                avg. days
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="block text-4xl font-bold tabular-nums tracking-tight text-zinc-900 sm:text-5xl">
                                —
                              </span>
                              <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                                No data has been submitted.
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat-style feed — short frame; scroll inside; expand opens modal */}
              <div
                id="ccw-timeline-submit"
                ref={feedRef}
                className="scroll-mt-28 flex h-[min(160px,26vh)] min-h-[120px] flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 sm:h-[min(200px,32vh)] sm:min-h-[140px]"
                role="region"
                aria-label="Timeline reports for selected process"
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-700 px-3 py-2 sm:px-4">
                  <span className="min-w-0 truncate text-xs font-medium uppercase tracking-wide text-zinc-200">
                    Wait times from previous applicants
                  </span>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center rounded-md border border-zinc-500 bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-100 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    aria-expanded={feedExpanded}
                    aria-haspopup="dialog"
                    aria-controls={feedExpanded ? "ccw-timeline-feed-modal" : undefined}
                    aria-label="Expand timeline reports"
                    onClick={() => setFeedExpanded(true)}
                  >
                    <svg
                      className="h-3.5 w-3.5 text-zinc-100"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </button>
                </div>
                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3"
                  aria-live="polite"
                >
                  {!active ? (
                    <p className="text-sm text-zinc-300">Loading…</p>
                  ) : active.submissions.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-zinc-200">
                        No data has been submitted.
                      </p>
                      <button
                        type="button"
                        className="text-left text-sm font-medium text-blue-300 underline hover:text-blue-200"
                        onClick={openSubmitModal}
                      >
                        Submit the first timeline
                      </button>
                    </div>
                  ) : (
                    <TimelineReportsList submissions={active.submissions} />
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs italic leading-snug text-zinc-500 sm:text-sm">
                Timelines vary by individual circumstances and change often. These timelines
                are estimates based on real submissions from CCW permit holders. Last timeline
                submitted: {formatShortDate(lastTimelineSubmittedCounty)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {portalReady &&
        feedExpanded &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-zinc-900/50 backdrop-blur-[1px]"
              aria-label="Close expanded timeline"
              onClick={() => setFeedExpanded(false)}
            />
            <div
              id="ccw-timeline-feed-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={modalTitleId}
              className="relative z-[201] flex max-h-[min(920px,96vh)] w-full max-w-[min(1200px,96vw)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
                <h2
                  id={modalTitleId}
                  className="text-base font-semibold text-zinc-900 sm:text-lg"
                >
                  {active?.label ?? "Timeline reports"}
                </h2>
                <button
                  type="button"
                  className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  aria-label="Close"
                  onClick={() => setFeedExpanded(false)}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                {!active ? (
                  <p className="text-sm text-zinc-600">Loading…</p>
                ) : active.submissions.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-700">
                      No data has been submitted.
                    </p>
                    <button
                      type="button"
                      className="text-left text-sm font-medium text-blue-700 underline hover:text-blue-900"
                      onClick={() => {
                        setFeedExpanded(false);
                        openSubmitModal();
                      }}
                    >
                      Submit the first timeline
                    </button>
                  </div>
                ) : (
                  <TimelineReportsList variant="modal" submissions={active.submissions} />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {portalReady &&
        submitModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-zinc-900/50 backdrop-blur-[1px]"
              aria-label="Close form"
              onClick={closeSubmitModal}
            />
            <div
              id="ccw-timeline-submit-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={submitModalTitleId}
              className="ccw-timeline-submit-modal-root relative z-[211] flex max-h-[min(640px,92vh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
                <h2
                  id={submitModalTitleId}
                  className="text-base font-semibold text-zinc-900 sm:text-lg"
                >
                  Submit your {countyDisplayName} County timeline
                </h2>
                <button
                  type="button"
                  className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  aria-label="Close"
                  onClick={closeSubmitModal}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                {submitSuccess ? (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-zinc-700">
                      Thanks — we received your timeline. Our team will review it soon. (Saving
                      to the live feed is not wired up yet.)
                    </p>
                    <button
                      type="button"
                      className="btn-primary bg-secondary-2 small w-button"
                      onClick={closeSubmitModal}
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={handleSubmitTimeline}>
                    <input name="county" type="hidden" value={countySlug} readOnly />
                    <div>
                      <label
                        htmlFor="ccw-timeline-display-name"
                        className="mb-1 block text-sm font-medium text-zinc-800"
                      >
                        Name
                      </label>
                      <input
                        id="ccw-timeline-display-name"
                        name="displayName"
                        type="text"
                        autoComplete="nickname"
                        placeholder="e.g. Marcus T. or Anonymous"
                        value={formDisplayName}
                        onChange={(e) => setFormDisplayName(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                      <p className="mt-1 text-xs text-zinc-500">
                        Shown publicly with your timeline. Leave blank to use Anonymous.
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="ccw-timeline-process"
                        className="mb-1 block text-sm font-medium text-zinc-800"
                      >
                        Process type
                      </label>
                      <select
                        id="ccw-timeline-process"
                        name="process"
                        value={formProcess}
                        onChange={(e) =>
                          setFormProcess(e.target.value as CcwTimelineProcess)
                        }
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        {processes.map((p) => (
                          <option key={p.process} value={p.process}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="ccw-timeline-date-started"
                          className="mb-1 block text-sm font-medium text-zinc-800"
                        >
                          Date started
                        </label>
                        <input
                          id="ccw-timeline-date-started"
                          name="dateStarted"
                          type="date"
                          value={formDateStarted}
                          onChange={(e) => setFormDateStarted(e.target.value)}
                          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="ccw-timeline-date-finished"
                          className="mb-1 block text-sm font-medium text-zinc-800"
                        >
                          Date finished
                        </label>
                        <input
                          id="ccw-timeline-date-finished"
                          name="dateFinished"
                          type="date"
                          value={formDateFinished}
                          onChange={(e) => setFormDateFinished(e.target.value)}
                          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="ccw-timeline-total-cost"
                        className="mb-1 block text-sm font-medium text-zinc-800"
                      >
                        Total cost{" "}
                        <span className="font-normal text-zinc-500">(optional)</span>
                      </label>
                      <input
                        id="ccw-timeline-total-cost"
                        name="totalCost"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="e.g. 150"
                        value={formTotalCost}
                        onChange={(e) => setFormTotalCost(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ccw-timeline-body"
                        className="mb-1 block text-sm font-medium text-zinc-800"
                      >
                        Share more about your experience
                      </label>
                      <textarea
                        id="ccw-timeline-body"
                        name="body"
                        required
                        rows={6}
                        value={formBody}
                        onChange={(e) => setFormBody(e.target.value)}
                        placeholder="Key dates and milestones (applied, interview, permit in hand, etc.)"
                        className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <p className="text-xs text-zinc-500">
                      By submitting, you confirm this reflects your experience. This is not legal
                      advice.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        type="submit"
                        className="btn-primary bg-secondary-2 small w-button"
                      >
                        Send timeline
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                        onClick={closeSubmitModal}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
