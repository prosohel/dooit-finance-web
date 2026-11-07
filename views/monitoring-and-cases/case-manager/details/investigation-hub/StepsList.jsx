"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import RailHeading from "./shared/RailHeading";

/**
 * The investigation's steps as a vertical stepper: markers joined by a rail
 * that fills in behind completed steps, with the current step marked by a
 * faint teal wash so "where am I" reads at a glance.
 */
// Critically damped: the highlight glides to the new step and settles
// without overshoot — calm, as befits a compliance workflow.
const GLIDE = { type: "spring", bounce: 0, duration: 0.35 };

export default function StepsList({ steps, activeStep, doneCount, goToStep }) {
  const highlightId = useId();
  const reduceMotion = useReducedMotion();
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
                      "absolute left-[21px] top-[26px] h-[calc(100%-16px)] border-l transition-colors duration-300",
                      step.done ? "border-solid border-primary/40" : "border-dashed border-black/[0.14]",
                    )}
                  />
                )}
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-[10px] px-2.5 py-[7px] text-left outline-none",
                    "transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]",
                    "focus-visible:ring-2 focus-visible:ring-primary/30",
                    !isCurrent && "[@media(hover:hover)]:hover:bg-black/[0.025]",
                  )}
                >
                  {/* The current step's card is one shared element that moves
                      between rows, so "where am I" travels with you. */}
                  {isCurrent && (
                    <motion.span
                      layoutId={`step-highlight-${highlightId}`}
                      transition={reduceMotion ? { duration: 0 } : GLIDE}
                      aria-hidden
                      className="absolute inset-0 rounded-[10px] bg-primary/[0.05]"
                    />
                  )}
                  <span
                    className={cn(
                      "relative flex size-[22px] shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold tabular-nums transition-colors duration-150",
                      step.done
                        ? "bg-primary text-white"
                        : isCurrent
                          ? "bg-primary/[0.08] text-primary ring-[1.5px] ring-inset ring-primary"
                          : "border border-dashed border-black/[0.18] bg-white text-muted-foreground",
                    )}
                  >
                    {step.done ? <IconCheck className="size-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "relative truncate text-[13px] transition-colors duration-150",
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
