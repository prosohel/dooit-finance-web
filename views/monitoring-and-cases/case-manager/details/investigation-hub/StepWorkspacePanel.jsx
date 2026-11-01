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
export default function StepWorkspacePanel({ caseData, caseId, onCaseChange, wizard }) {
  const { steps, activeStep, goPrev, goNext } = wizard;
  const step = steps[activeStep];
  const StepBody = STEP_RENDERERS[step.kind];

  return (
    <div className="flex min-w-[460px] flex-1 flex-col overflow-hidden rounded-xl ">
      {/* <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-primary bg-primary/5 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-primary" />
          <span className="text-[13px] font-bold uppercase text-primary">{step.name}</span>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            Step {activeStep + 1} of {steps.length}
          </span>
        </div>
        {step.rightLabel && (
          <span className="text-xs font-semibold text-primary/80">{step.rightLabel}</span>
        )}
      </div> */}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-1 text-lg font-bold tracking-tight text-heading">{step.title}</div>
        <div className="mb-5 text-[13px] text-muted-foreground">{step.subtitle}</div>

        {step.kind === "smr" ? (
          <SmrStep caseId={caseId} wizard={wizard} />
        ) : (
          <>
            {StepBody && (
              <StepBody
                step={step}
                activeStep={activeStep}
                caseData={caseData}
                caseId={caseId}
                onCaseChange={onCaseChange}
                wizard={wizard}
              />
            )}
            <StepFooter
              onBack={goPrev}
              onNext={goNext}
              isFirst={activeStep === 0}
              isLast={activeStep === steps.length - 1}
            />
          </>
        )}
      </div>
    </div>
  );
}
