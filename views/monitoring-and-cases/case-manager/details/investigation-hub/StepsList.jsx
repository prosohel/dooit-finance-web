"use client";

import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import RailHeading from "./shared/RailHeading";

/**
 * The investigation's steps as a vertical stepper: markers joined by a rail
 * that fills in behind completed steps, with the current step lifted onto a
 * white card so "where am I" reads at a glance.
 */
export default function StepsList({ steps, activeStep, doneCount, goToStep }) {
  return (
    <div className="flex min-h-0 flex-[1.35] flex-col">
      <RailHeading label="Investigation steps" done={doneCount} total={steps.length} barClassName="bg-primary" />

      <nav aria-label="Investigation steps" className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
        <ol>
          {steps.map((step, i) => {
            const isCurrent = i === activeStep;
            const isLast = i === steps.length - 1;
            return (
              <li key={step.key} className="relative">
                {/* Connector to the next marker; solid once this step is done. */}
                {!isLast && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-[21px] top-[26px] h-[calc(100%-16px)] w-px",
                      step.done ? "bg-primary/35" : "bg-border",
                    )}
                  />
                )}
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-lg px-2.5 py-[7px] text-left outline-none",
                    "transition-[background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]",
                    "focus-visible:ring-2 focus-visible:ring-primary/30",
                    isCurrent
                      ? "bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06),0_0_0_1px_rgba(16,24,40,0.06)]"
                      : "hover:bg-black/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-[22px] shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold tabular-nums transition-colors duration-150",
                      step.done
                        ? "bg-primary text-white"
                        : isCurrent
                          ? "bg-white text-primary ring-[1.5px] ring-primary"
                          : "bg-white text-muted-foreground ring-1 ring-border",
                    )}
                  >
                    {step.done ? <IconCheck className="size-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "truncate text-[13px]",
                      isCurrent
                        ? "font-semibold text-heading"
                        : step.done
                          ? "text-heading"
                          : "text-muted-foreground",
                    )}
                  >
                    {step.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
