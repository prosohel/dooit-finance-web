"use client";

import { Loader2, Plus, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { isRunning } from "./tbmlAdapter";

/**
 * Pills for each screening run on this case, plus the entry point into the
 * upload flow. A run still being worked on shows a spinner rather than a risk
 * score it does not have yet.
 */
export default function RunSwitcher({ runs, activeIndex, onSelect, onOpenUpload }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card p-3">
      {runs.map((run, i) => {
        const active = i === activeIndex;
        const running = isRunning(run.status);

        return (
          <button
            key={run.id}
            type="button"
            onClick={() => onSelect(i)}
            title={run.documentName || run.id}
            className={cn(
              "flex flex-col gap-0.5 rounded-lg border px-3 py-1.5 text-left transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted/50",
            )}
          >
            <span className="flex items-center gap-1.5 font-mono text-[11.5px] font-semibold">
              {running && <Loader2 className="size-3 animate-spin" />}
              {run.id}
              {/* The engine asking for a human read is the one thing worth
                  seeing before the run is even opened. */}
              {run.requiresReview && !running && (
                <ShieldAlert
                  className={cn("size-3", active ? "opacity-90" : "text-warning")}
                  aria-label="Analyst confirmation required"
                />
              )}
            </span>
            <span className={cn("text-[11px]", active ? "opacity-80" : "text-muted-foreground")}>
              {run.pillMeta}
            </span>
          </button>
        );
      })}

      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenUpload}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="size-3.5" />
        Run new screening
      </button>
    </div>
  );
}
