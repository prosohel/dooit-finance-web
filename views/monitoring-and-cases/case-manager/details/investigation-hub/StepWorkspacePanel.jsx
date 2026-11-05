"use client";

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
export default function StepWorkspacePanel({ caseData, caseId, onCaseChange, wizard, headerActions }) {
  const { steps, activeStep, goPrev, goNext, saveNow } = wizard;
  const step = steps[activeStep];
  const StepBody = STEP_RENDERERS[step.kind];
  const isSmr = step.kind === "smr";
  const isLast = activeStep === steps.length - 1;

  return (
    <section className="flex min-w-[460px] flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-6 border-b border-border/70 px-8 pb-5 pt-6">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            <span className="tabular-nums">
              Step {activeStep + 1}
              <span className="font-normal opacity-60"> / {steps.length}</span>
            </span>
            {step.rightLabel && (
              <>
                <span aria-hidden className="size-[3px] rounded-full bg-muted-foreground/40" />
                <span className="text-primary">{step.rightLabel}</span>
              </>
            )}
          </div>
          <h2 className="text-xl font-semibold tracking-[-0.01em] text-heading">{step.title}</h2>
          {step.subtitle && (
            <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-muted-foreground">{step.subtitle}</p>
          )}
        </div>
        {headerActions && <div className="flex shrink-0 items-center gap-2.5 pt-0.5">{headerActions}</div>}
      </header>

      {/* Keyed by step so each step starts at the top and settles in gently. */}
      <div key={activeStep} className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <div className="animate-in fade-in duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:slide-in-from-bottom-1">
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
