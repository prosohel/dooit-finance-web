"use client";

import { cn } from "@/lib/utils";

export default function StepsList({ steps, activeStep, doneCount, goToStep }) {
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="flex flex-[1.35] min-h-0 flex-col overflow-hidden rounded-xl ">
      <div className="shrink-0   px-4 py-2.5">
        {/* <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full " />

        </div> */}
        <span className="text-[12.5px] font-bold ">STEPS OF INVESTIGATION</span>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-indigo-100">
            <div className="h-full rounded-full  transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] font-semibold ">
            {doneCount}/{steps.length}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {steps.map((step, i) => {
          const isCurrent = i === activeStep;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => goToStep(i)}
              className={cn(
                "my-0.5 flex w-full items-center gap-2.5 rounded-lg border-l-[3px] px-2.5 py-2 text-left transition-colors",
                isCurrent
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-transparent hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  step.done
                    ? "bg-primary text-white"
                    : isCurrent
                      ? "bg-indigo-600 text-white"
                      : "border border-border bg-muted text-muted-foreground",
                )}
              >
                {step.done ? "✓" : i + 1}
              </span>
              <span
                className={cn(
                  "text-[12.5px]",
                  isCurrent
                    ? "font-bold text-indigo-900"
                    : step.done
                      ? "font-medium text-heading"
                      : "text-muted-foreground",
                )}
              >
                {step.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
