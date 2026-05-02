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
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}.${dd}.${yyyy}`;
}

function getInitials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "?";
  if (/^anonymous$/i.test(trimmed)) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatPreviewName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed || /^anonymous$/i.test(trimmed)) return "Anonymous";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() : "";
  return lastInitial ? `${first} ${lastInitial}` : first;
}

function inferSubmissionDays(body: string, fallbackDays: number): number {
  const matches = [...body.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g)];
  if (matches.length >= 2) {
    const first = matches[0];
    const last = matches[matches.length - 1];
    const start = new Date(
      `${first[3]}-${first[1].padStart(2, "0")}-${first[2].padStart(2, "0")}`
    );
    const end = new Date(
      `${last[3]}-${last[1].padStart(2, "0")}-${last[2].padStart(2, "0")}`
    );
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const dayMs = 1000 * 60 * 60 * 24;
      const diff = Math.round((end.getTime() - start.getTime()) / dayMs);
      if (diff > 0) return diff;
    }
  }
  return fallbackDays;
}

function TimelineReportsList({
  submissions,
  fallbackDays,
  onSeeAll,
  variant = "inline",
}: {
  submissions: CcwTimelineSubmission[];
  fallbackDays: number;
  onSeeAll?: () => void;
  variant?: "inline" | "modal";
}) {
  const rowClass =
    variant === "inline"
      ? "grid grid-cols-[minmax(0,1fr),auto] items-start gap-2 border-b border-[#edeae3] px-4 py-2 last:border-b-0 sm:px-5"
      : "grid grid-cols-[auto,1fr,auto] items-start gap-3 border-b border-[#edeae3] px-4 py-4 last:border-b-0 sm:px-5";
  const avatarClass =
    variant === "inline"
      ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ece8dd] text-[10px] font-semibold uppercase tracking-wide text-zinc-600"
      : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ece8dd] text-xs font-semibold uppercase tracking-wide text-zinc-600";

  return (
    <div className="overflow-hidden rounded-xl border border-[#cfc7b8] bg-white">
      {variant === "inline" ? (
        <div className="flex items-center justify-between gap-3 border-b border-[#edeae3] bg-[#f0eee7] px-4 py-3 sm:px-5">
          <p className="!m-0 inline-flex items-center leading-none text-[11px] font-semibold uppercase tracking-[0.11em] text-[#c86442]">
            Recent submissions
          </p>
          <button
            type="button"
            onClick={onSeeAll}
            className="text-xs font-semibold text-[#b75a3d] transition hover:text-[#8f4229] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b75a3d]"
          >
            See all
          </button>
        </div>
      ) : null}
      <ul>
        {submissions.map((s) => {
          const syntheticFallback = Math.max(14, Math.round(fallbackDays * 0.78));
          const days = inferSubmissionDays(s.body, syntheticFallback);
          return (
            <li
              key={s.id}
              className={rowClass}
            >
              {variant === "inline" ? null : (
                <div className={avatarClass}>
                  {getInitials(s.displayName)}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-1">
                  <span
                    className={
                      variant === "inline"
                        ? "text-[13px] font-semibold leading-tight text-zinc-900"
                        : "text-base font-semibold text-zinc-900"
                    }
                  >
                    {variant === "inline" ? formatPreviewName(s.displayName) : s.displayName}
                  </span>
                  <time
                    className={
                      variant === "inline"
                        ? "ml-1 text-[10px] font-medium tracking-wide text-zinc-500"
                        : "ml-1 text-xs font-medium tracking-wide text-zinc-500"
                    }
                    dateTime={s.submittedAt}
                  >
                    {formatShortDate(s.submittedAt)}
                  </time>
                </div>
                <p
                  className={
                    variant === "inline"
                      ? "mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-700"
                      : "mt-1 text-sm leading-relaxed text-zinc-700"
                  }
                >
                  {s.body}
                </p>
              </div>
              {variant === "inline" ? (
                <p className="shrink-0 whitespace-nowrap text-right text-[13px] font-semibold leading-tight text-zinc-900">
                  {days}{" "}
                  <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-zinc-500">
                    days
                  </span>
                </p>
              ) : (
                <div className="shrink-0 text-right">
                  <p className="text-[34px] leading-[0.95] tracking-tight text-zinc-900">{days}</p>
                  <p className="text-[11px] uppercase tracking-[0.13em] text-zinc-500">Days</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
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

  const activeLastSubmitted = active?.lastSubmittedAt ?? lastTimelineSubmittedCounty;
  const timelineEntries = useMemo(() => active?.submissions ?? [], [active]);
  const inlineEntries = useMemo(() => timelineEntries.slice(0, 2), [timelineEntries]);

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
      className="ccw-timeline-section relative z-[1] border-y border-[#e5e1d8] bg-[#fefcf9]"
      aria-labelledby="ccw-timeline-heading"
    >
      <div className="container-default w-container">
        <div className="mx-auto py-10 sm:py-12 lg:py-14">
          <div className="grid gap-8 md:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] md:items-start lg:gap-9">
            <div>
              <h2
                id="ccw-timeline-heading"
                className="text-[clamp(1.8rem,2.5vw,2.85rem)] font-medium leading-[1.06] text-[#1f1f1e]"
              >
                <span className="block">{countyDisplayName} County</span>
                <span className="block">CCW Timelines</span>
              </h2>
              <p className="mt-4 max-w-[30ch] text-[15px] leading-relaxed text-zinc-600">
                Estimated wait times from <strong>self-reported applicant experiences</strong> -
                initial, renewal, and add-a-gun - so you know what to expect from the{" "}
                {countyDisplayName} County Sheriff.
              </p>
              <button
                type="button"
                className="btn-primary bg-secondary-2 small mt-5 inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm"
                onClick={openSubmitModal}
              >
                Submit your timeline
              </button>
            </div>

            <div ref={feedRef} className="min-w-0 space-y-4 sm:space-y-5">
              <div
                role="tablist"
                aria-label="Timeline process type"
                className="inline-flex rounded-xl border border-[#e2ddd1] bg-[#edeae3] p-1"
              >
                {processes.map((m) => {
                  const isActive = m.process === selected;
                  return (
                    <button
                      key={m.process}
                      id={`ccw-process-tab-${m.process}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls="ccw-process-panel"
                      onClick={() => onSelectProcess(m.process)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b75a3d] ${
                        isActive
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <div
                id="ccw-process-panel"
                role="tabpanel"
                aria-labelledby={`ccw-process-tab-${selected}`}
                className="rounded-2xl border border-[#e2ddd1] bg-[#f2efe8] p-4 sm:p-5"
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c86442]">
                      Median wait time
                    </p>
                    <div className="mt-1.5 flex items-end gap-2">
                      <span className="text-[clamp(3.05rem,7vw,4.5rem)] font-medium leading-[0.86] tracking-tight text-zinc-900">
                        {active?.avgDays ?? "—"}
                      </span>
                      <span className="pb-1.5 text-[30px] leading-none text-zinc-900 sm:text-[32px]">
                        days
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-500">from submission to permit</p>
                  </div>
                  <dl className="grid w-full grid-cols-2 gap-x-5 gap-y-0.5 sm:w-auto sm:min-w-[230px] sm:content-start sm:self-start sm:justify-items-end">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Submissions
                    </dt>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Last submitted
                    </dt>
                    <dd className="text-[30px] leading-none text-zinc-900 sm:text-[32px]">
                      {active?.submissionCount ?? 0}
                    </dd>
                    <dd className="self-start text-sm leading-none text-zinc-700">
                      {formatShortDate(activeLastSubmitted)}
                    </dd>
                  </dl>
                </div>
              </div>

              {timelineEntries.length === 0 ? (
                <div className="rounded-xl border border-[#e2ddd1] bg-white px-4 py-6 sm:px-5">
                  <p className="text-sm text-zinc-700">
                    No data has been submitted for this process yet.
                  </p>
                  <button
                    type="button"
                    className="mt-3 text-sm font-medium text-[#b75a3d] underline hover:text-[#8f4229]"
                    onClick={openSubmitModal}
                  >
                    Submit the first timeline
                  </button>
                </div>
              ) : (
                <TimelineReportsList
                  submissions={inlineEntries}
                  fallbackDays={active?.avgDays ?? 90}
                  onSeeAll={() => setFeedExpanded(true)}
                />
              )}

              <p className="text-xs italic leading-snug text-zinc-500 sm:text-sm">
                Timelines vary by individual circumstances and change often. These timelines are
                estimates based on real submissions from CCW permit holders. Last timeline
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
                <h2 id={modalTitleId} className="text-base font-semibold text-zinc-900 sm:text-lg">
                  {countyDisplayName} County - {active?.label ?? "Timeline reports"}
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
                  <p className="text-sm text-zinc-600">Loading...</p>
                ) : active.submissions.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-700">No data has been submitted.</p>
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
                  <TimelineReportsList
                    variant="modal"
                    submissions={active.submissions}
                    fallbackDays={active.avgDays ?? 90}
                  />
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
                  className="!text-base font-semibold leading-tight text-zinc-900 sm:!text-[1.06rem]"
                >
                  How long did it take to get your permit, from application to issuance?
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
                      Thanks - we received your timeline. Our team will review it soon. (Saving to
                      the live feed is not wired up yet.)
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
                        Total cost <span className="font-normal text-zinc-500">(optional)</span>
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
                      <button type="submit" className="btn-primary bg-secondary-2 small w-button">
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
