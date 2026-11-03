"use client";

import StepsList from "./StepsList";
import ChecklistCard from "./ChecklistCard";

export default function StepsChecklistPanel({ wizard }) {
  const { steps, activeStep, doneCount, goToStep, checklist, checkedCount, toggleCheck } = wizard;

  return (
    <aside className="flex w-[280px] shrink-0 min-h-0 flex-col border-r border-border bg-muted/20">
      <StepsList steps={steps} activeStep={activeStep} doneCount={doneCount} goToStep={goToStep} />
      <ChecklistCard checklist={checklist} checkedCount={checkedCount} toggleCheck={toggleCheck} />
    </aside>
  );
}
