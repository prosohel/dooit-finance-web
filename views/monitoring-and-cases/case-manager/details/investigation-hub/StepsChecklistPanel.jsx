"use client";

import StepsList from "./StepsList";
import ChecklistCard from "./ChecklistCard";

export default function StepsChecklistPanel({ wizard }) {
  const { steps, activeStep, doneCount, goToStep, checklist, checkedCount, toggleCheck } = wizard;

  return (
    <aside className="flex min-h-0 w-[284px] shrink-0 flex-col border-r border-border/70 bg-[#f8f8f9]">
      <StepsList steps={steps} activeStep={activeStep} doneCount={doneCount} goToStep={goToStep} />
      <ChecklistCard checklist={checklist} checkedCount={checkedCount} toggleCheck={toggleCheck} />
    </aside>
  );
}
