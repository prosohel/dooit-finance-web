"use client";

import { cn } from "@/lib/utils";

/**
 * Section heading for the hub's left rail: an eyebrow label, a tabular
 * "done / total" count and a hairline progress bar. Shared by the steps list
 * and the checklist so both sections read as one system.
 */
export default function RailHeading({ label, done, total, barClassName }) {
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="shrink-0 px-5 pb-3 pt-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          <span className="font-semibold text-heading">{done}</span>
          <span className="mx-0.5 opacity-50">/</span>
          {total}
        </span>
      </div>
      <div
        className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-border/60"
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
            barClassName,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
