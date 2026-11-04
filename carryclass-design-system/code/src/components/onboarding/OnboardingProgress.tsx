"use client";

import Link from "next/link";
import { Fragment } from "react";

const STEPS = [
  { num: 1, label: "Profile" },
  { num: 2, label: "Classes" },
  { num: 3, label: "Schedule" },
  { num: 4, label: "Cancellation" },
  { num: 5, label: "Payments" },
  { num: 6, label: "Go Live" },
];

interface Props {
  currentStep: number;
  completedStep: number; // highest step the user has reached
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 0 1.42l-7.5 7.5a1 1 0 0 1-1.42 0l-3.5-3.5a1 1 0 0 1 1.42-1.42l2.79 2.8 6.79-6.8a1 1 0 0 1 1.42 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function OnboardingProgress({ currentStep, completedStep }: Props) {
  const currentStepData = STEPS.find((s) => s.num === currentStep);
  const pct = (currentStep / STEPS.length) * 100;

  return (
    <div className="mb-6 rounded-2xl border border-neutral-300/70 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      {/* Mobile: compact single-line title + progress bar */}
      <div className="sm:hidden">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-semibold text-[#141413]">
            {currentStepData?.label}
          </span>
          <span className="shrink-0 text-xs font-medium text-zinc-500">
            Step {currentStep} of {STEPS.length}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-[#c96442] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Desktop: horizontal stepper */}
      <ol className="!m-0 !list-none !p-0 hidden w-full min-w-0 items-center sm:flex">
        {STEPS.map((step, i) => {
          const isCompleted = step.num < currentStep;
          const isCurrent = step.num === currentStep;
          const isAccessible = step.num <= completedStep || step.num === currentStep;
          const isLast = i === STEPS.length - 1;

          const circleClass = isCompleted
            ? "bg-emerald-600 text-white"
            : isCurrent
            ? "bg-[#141413] text-white"
            : "border border-neutral-300 bg-white text-zinc-400";

          const labelClass = isCurrent
            ? "font-semibold text-[#141413]"
            : isCompleted
            ? "font-medium text-zinc-700 group-hover:text-[#141413]"
            : "font-medium text-zinc-400";

          const stepNode = (
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${circleClass}`}
              >
                {isCompleted ? <CheckIcon /> : step.num}
              </span>
              <span className={`text-xs lg:text-sm ${labelClass}`}>{step.label}</span>
            </span>
          );

          return (
            <Fragment key={step.num}>
              <li className="flex shrink-0 items-center">
                {isAccessible && !isCurrent ? (
                  <Link
                    href={`/onboard/step/${step.num}`}
                    className="group no-underline"
                  >
                    {stepNode}
                  </Link>
                ) : (
                  stepNode
                )}
              </li>
              {!isLast && (
                <li
                  aria-hidden="true"
                  className={`mx-1 h-px min-w-2 flex-1 ${
                    isCompleted ? "bg-[#141413]" : "bg-neutral-300"
                  }`}
                />
              )}
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}
