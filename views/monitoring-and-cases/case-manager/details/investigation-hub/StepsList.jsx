"use client";

import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export default function StepsList({ steps, activeStep, doneCount, goToStep }) {
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="flex flex-[1.35] min-h-0 flex-col">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-heading">Investigation Steps</span>
          <span className="rounded-md border border-border bg-white px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {doneCount} of {steps.length}
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-border/70">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {steps.map((step, i) => {
          const isCurrent = i === activeStep;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => goToStep(i)}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                isCurrent ? "bg-primary/10" : "hover:bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  step.done
                    ? "bg-primary text-white"
                    : isCurrent
                      ? "border-[1.5px] border-primary bg-white text-primary"
                      : "border-[1.5px] border-muted-foreground/30 bg-white text-muted-foreground",
                )}
              >
                {step.done ? <IconCheck className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  "truncate text-[13px]",
                  isCurrent
                    ? "font-semibold text-primary"
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
      </nav>
    </div>
  );
}
