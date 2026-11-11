"use client";

import StepsList from "./StepsList";
import ChecklistCard from "./ChecklistCard";

export default function StepsChecklistPanel({ wizard }) {
  const { steps, activeStep, doneCount, goToStep, checklist, checkedCount, toggleCheck } = wizard;

  return (
    <aside className="flex min-h-0 w-[284px] shrink-0 flex-col border-t border-l border-b rounded-l-2xl   bg-neutral-100 text-white">
      <StepsList steps={steps} activeStep={activeStep} doneCount={doneCount} goToStep={goToStep} />
      <ChecklistCard checklist={checklist} checkedCount={checkedCount} toggleCheck={toggleCheck} />
    </aside>
  );
}
