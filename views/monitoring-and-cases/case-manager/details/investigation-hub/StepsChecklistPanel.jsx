"use client";

import StepsList from "./StepsList";
import ChecklistCard from "./ChecklistCard";

export default function StepsChecklistPanel({ wizard }) {
  const { steps, activeStep, doneCount, goToStep, checklist, checkedCount, toggleCheck } = wizard;

  return (
    <div className="flex w-[296px] shrink-0 min-h-0 flex-col gap-[24px] bg-white">
      <StepsList steps={steps} activeStep={activeStep} doneCount={doneCount} goToStep={goToStep} />
      <ChecklistCard checklist={checklist} checkedCount={checkedCount} toggleCheck={toggleCheck} />
    </div>
  );
}
