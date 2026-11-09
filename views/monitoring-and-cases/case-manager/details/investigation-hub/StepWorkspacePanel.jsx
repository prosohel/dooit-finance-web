"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import OptionsStep from "./steps/OptionsStep";
import DateRangeStep from "./steps/DateRangeStep";
import PoiStep from "./steps/PoiStep";
import NarrativeStep from "./steps/NarrativeStep";
import SmrStep from "./steps/smr/SmrStep";
import StepFooter from "./shared/StepFooter";

const STEP_RENDERERS = {
  options: OptionsStep,
  dateRange: DateRangeStep,
  poi: PoiStep,
  narrative: NarrativeStep,
};

// `caseId` / `onCaseChange` let a step write to the case itself (the POI step
// links customers and adds POIs) rather than only to the wizard's saved state.
// `headerActions` sits at the right of the step title (save status, OSINT).
export default function StepWorkspacePanel({
  caseData,
  caseId,
  onCaseChange,
  wizard,
  headerActions,
}) {
  const { steps, activeStep, goPrev, goNext, saveNow } = wizard;
  const step = steps[activeStep];
  const StepBody = STEP_RENDERERS[step.kind];
  const isSmr = step.kind === "smr";
  const isLast = activeStep === steps.length - 1;

  // Which way did we travel? Forward steps enter from the right, backward
  // steps from the left, so the motion matches the stepper's spatial order.
  const [nav, setNav] = useState({ step: activeStep, dir: 1 });
  if (nav.step !== activeStep) setNav({ step: activeStep, dir: activeStep > nav.step ? 1 : -1 });

  return (
    <section className="flex min-w-[460px] flex-1 flex-col overflow-hidden bg-white">
      <header className="shrink-0 px-8 pt-5">
        {/* <StepSegments steps={steps} activeStep={activeStep} /> */}

        <div className="mt-5 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-[22px] items-center rounded-full bg-primary/[0.07] px-2 text-[11px] font-semibold tabular-nums tracking-[0.01em] text-primary">
                Step {activeStep + 1}
                <span className="ml-1 font-medium opacity-60">of {steps.length}</span>
              </span>
              {step.rightLabel && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {step.rightLabel}
                </span>
              )}
            </div>
            <h2 className="text-sm font-semibold leading-[1.15] tracking-[-0.02em] text-heading mt-4">
              {step.title}
            </h2>
            {step.subtitle && (
              <p className="mt-1.5 max-w-[62ch] text-xs leading-relaxed text-muted-foreground">
                {step.subtitle}
              </p>
            )}
          </div>
          {headerActions && <div className="flex shrink-0 items-center gap-2">{headerActions}</div>}
        </div>
      </header>

      {/* Keyed by step so each step starts at the top. A soft mask at the top
          edge replaces a hard divider: content fades under the header. */}
      <div
        key={activeStep}
        className="min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-6 [mask-image:linear-gradient(to_bottom,transparent,black_20px,black_calc(100%-24px),transparent)]"
      >
        <div
          className={cn(
            "animate-in fade-in duration-[260ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
            nav.dir > 0 ? "motion-safe:slide-in-from-right-3" : "motion-safe:slide-in-from-left-3",
          )}
        >
          {isSmr ? (
            <SmrStep caseId={caseId} wizard={wizard} />
          ) : (
            StepBody && (
              <StepBody
                step={step}
                activeStep={activeStep}
                caseData={caseData}
                caseId={caseId}
                onCaseChange={onCaseChange}
                wizard={wizard}
              />
            )
          )}
        </div>
      </div>

      {!isSmr && (
        <StepFooter
          onBack={goPrev}
          onNext={goNext}
          onSave={saveNow}
          isFirst={activeStep === 0}
          isLast={isLast}
          nextName={isLast ? null : steps[activeStep + 1]?.name}
        />
      )}
    </section>
  );
}

/**
 * One hairline segment per step: solid when done, a soft tint for the step
 * in hand. A glanceable overview of the whole investigation; the rail is
 * the accessible source of truth, so this is decorative.
 */
function StepSegments({ steps, activeStep }) {
  return (
    <div aria-hidden className="flex gap-1">
      {steps.map((s, i) => (
        <span
          key={s.key}
          className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-black/[0.05]"
        >
          <span
            className={cn(
              "absolute inset-0 origin-left rounded-full transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
              s.done
                ? "scale-x-100 bg-primary"
                : i === activeStep
                  ? "scale-x-100 bg-primary/30"
                  : "scale-x-0 bg-primary",
            )}
          />
        </span>
      ))}
    </div>
  );
}
