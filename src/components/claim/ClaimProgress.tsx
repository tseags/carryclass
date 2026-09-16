const STEPS = [
  { num: 1, label: "Search" },
  { num: 2, label: "Verify" },
  { num: 3, label: "Enter code" },
] as const;

export type ClaimProgressStep = (typeof STEPS)[number]["num"];

interface Props {
  currentStep: ClaimProgressStep;
}

export function ClaimProgress({ currentStep }: Props) {
  const current = STEPS.find((s) => s.num === currentStep);
  const pct = (currentStep / STEPS.length) * 100;

  return (
    <div className="mb-6 rounded-2xl border border-neutral-300/70 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Claim · Pre-onboarding
      </p>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-semibold text-[#141413]">
          {current?.label}
        </span>
        <span className="shrink-0 text-xs font-medium text-zinc-500">
          Step {currentStep} of {STEPS.length}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-label={`Claim step ${currentStep} of ${STEPS.length}: ${current?.label ?? ""}`}
      >
        <div
          className="h-full rounded-full bg-[#c96442] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function claimStepToProgress(step: "search" | "channel" | "code" | "done"): ClaimProgressStep {
  switch (step) {
    case "search":
      return 1;
    case "channel":
      return 2;
    case "code":
    case "done":
      return 3;
  }
}
