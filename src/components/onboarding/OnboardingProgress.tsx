"use client";

import Link from "next/link";

const STEPS = [
  { num: 1, label: "Profile", time: "~3 min" },
  { num: 2, label: "Classes", time: "~2 min" },
  { num: 3, label: "Schedule", time: "~3 min" },
  { num: 4, label: "Cancellation", time: "~1 min" },
  { num: 5, label: "Payments", time: "~2 min" },
  { num: 6, label: "Go Live", time: "~1 min" },
];

interface Props {
  currentStep: number;
  completedStep: number; // highest step the user has reached
}

export function OnboardingProgress({ currentStep, completedStep }: Props) {
  const currentStepData = STEPS.find((s) => s.num === currentStep);

  return (
    <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
      <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
        {/* Mobile: compact progress */}
        <div className="flex items-center justify-between mb-2 sm:hidden">
          <span className="text-sm font-semibold text-zinc-800">
            Step {currentStep} of 6 — {currentStepData?.label}
          </span>
          <span className="text-xs text-zinc-500">{currentStepData?.time} left</span>
        </div>
        <div className="sm:hidden w-full bg-zinc-100 rounded-full h-1.5 mb-1">
          <div
            className="bg-zinc-900 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>

        {/* Desktop: labeled steps */}
        <div className="hidden sm:flex items-center gap-1">
          {STEPS.map((step, i) => {
            const isCompleted = step.num < currentStep;
            const isCurrent = step.num === currentStep;
            const isAccessible = step.num <= completedStep || step.num === currentStep;
            const isUpcoming = step.num > currentStep;

            return (
              <div key={step.num} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`h-px w-6 mx-1 transition-colors ${
                      isCompleted || isCurrent ? "bg-zinc-800" : "bg-zinc-200"
                    }`}
                  />
                )}
                {isAccessible ? (
                  <Link
                    href={`/onboard/step/${step.num}`}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                      isCurrent
                        ? "bg-zinc-900 text-white"
                        : isCompleted
                        ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                        : "text-zinc-400"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? "bg-white text-zinc-900"
                          : isCompleted
                          ? "bg-zinc-300 text-zinc-700"
                          : "bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {isCompleted ? "✓" : step.num}
                    </span>
                    {step.label}
                  </Link>
                ) : (
                  <div
                    className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                      isUpcoming ? "text-zinc-300" : "text-zinc-400"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-zinc-100 text-zinc-400">
                      {step.num}
                    </span>
                    {step.label}
                  </div>
                )}
              </div>
            );
          })}
          <span className="ml-auto text-xs text-zinc-400">{currentStepData?.time} left</span>
        </div>
      </div>
    </div>
  );
}
