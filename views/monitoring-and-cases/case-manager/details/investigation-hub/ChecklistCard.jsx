"use client";

import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export default function ChecklistCard({ checklist, checkedCount, toggleCheck }) {
  const pct = Math.round((checkedCount / checklist.length) * 100);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl ">
      <div className="shrink-0  px-4 py-2.5">
        {/* <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-success" />

        </div> */}
        <span className="text-[12.5px] font-bold text-success">INVESTIGATION CHECKLIST</span>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-success/15">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-success">
            {checkedCount} of {checklist.length}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-2.5">
        {checklist.map((item, i) => (
          <button
            key={item.text}
            type="button"
            onClick={() => toggleCheck(i)}
            className="flex w-full items-start gap-2.5 border-b border-border/60 py-2.5 text-left last:border-0"
          >
            <span
              className={cn(
                "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border text-[11px] font-bold",
                item.checked
                  ? "border-success bg-success text-white"
                  : "border-muted-foreground/30 bg-white text-transparent",
              )}
            >
              <IconCheck className="size-3" strokeWidth={3} />
            </span>
            <span
              className={cn(
                "text-[12.5px] leading-snug",
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
