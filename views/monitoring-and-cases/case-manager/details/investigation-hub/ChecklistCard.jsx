"use client";

import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import RailHeading from "./shared/RailHeading";

export default function ChecklistCard({ checklist, checkedCount, toggleCheck }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-border/70">
      <RailHeading label="Checklist" done={checkedCount} total={checklist.length} barClassName="bg-success" />

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
        {checklist.map((item, i) => (
          <button
            key={item.text}
            type="button"
            role="checkbox"
            aria-checked={item.checked}
            onClick={() => toggleCheck(i)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg px-2.5 py-[7px] text-left outline-none",
              "transition-[background-color,transform] duration-150 ease-out hover:bg-black/[0.03] active:scale-[0.98]",
              "focus-visible:ring-2 focus-visible:ring-primary/30",
            )}
          >
            <span
              className={cn(
                "mt-px flex size-4 shrink-0 items-center justify-center rounded-[5px] transition-colors duration-150",
                item.checked ? "bg-success text-white" : "bg-white text-transparent ring-1 ring-inset ring-muted-foreground/35",
              )}
            >
              <IconCheck
                className={cn(
                  "size-3 transition-transform duration-150 ease-out",
                  item.checked ? "scale-100" : "scale-75",
                )}
                strokeWidth={3}
              />
            </span>
            <span
              className={cn(
                "text-[13px] leading-snug transition-colors duration-150",
                item.checked ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-heading",
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
