"use client";

import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export default function ChecklistCard({ checklist, checkedCount, toggleCheck }) {
  const pct = Math.round((checkedCount / checklist.length) * 100);

  return (
    <div className="flex flex-1 min-h-0 flex-col border-t border-border">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-heading">Checklist</span>
          <span className="rounded-md border border-border bg-white px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {checkedCount} of {checklist.length}
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-border/70">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {checklist.map((item, i) => (
          <button
            key={item.text}
            type="button"
            role="checkbox"
            aria-checked={item.checked}
            onClick={() => toggleCheck(i)}
            className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
          >
            <span
              className={cn(
                "mt-px flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                item.checked
                  ? "border-success bg-success text-white"
                  : "border-muted-foreground/40 bg-white text-transparent",
              )}
            >
              <IconCheck className="size-3" strokeWidth={3} />
            </span>
            <span
              className={cn(
                "text-[13px] leading-snug",
                item.checked ? "text-muted-foreground line-through" : "text-heading",
              )}
            >
              {item.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
