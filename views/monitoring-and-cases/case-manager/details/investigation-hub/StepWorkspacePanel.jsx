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

  return (
    <section className="flex min-w-[460px] flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Step {activeStep + 1} of {steps.length}
            {step.rightLabel && <span className="normal-case tracking-normal"> · {step.rightLabel}</span>}
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-heading">{step.title}</h2>
          {step.subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{step.subtitle}</p>}
        </div>
        {headerActions && <div className="flex shrink-0 items-center gap-3 pt-0.5">{headerActions}</div>}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
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

      {!isSmr && (
        <StepFooter
          onBack={goPrev}
          onNext={goNext}
          onSave={saveNow}
          isFirst={activeStep === 0}
          isLast={activeStep === steps.length - 1}
        />
      )}
    </section>
  );
}
