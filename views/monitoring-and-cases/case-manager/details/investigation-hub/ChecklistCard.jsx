"use client";

import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import RailHeading from "./shared/RailHeading";

export default function ChecklistCard({ checklist, checkedCount, toggleCheck }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The rail's one seam: dashed and inset, so it divides without boxing. */}
      <span aria-hidden className="mx-5 my-1 shrink-0 border-t border-dashed border-black/[0.09]" />
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
              "flex w-full items-start gap-3 rounded-[10px] px-2.5 py-[7px] text-left outline-none",
              "transition-[background-color,transform] duration-150 ease-out [@media(hover:hover)]:hover:bg-black/[0.025] active:scale-[0.98]",
              "focus-visible:ring-2 focus-visible:ring-primary/30",
            )}
          >
            <span
              className={cn(
                "mt-px flex size-4 shrink-0 items-center justify-center rounded-[5px] transition-colors duration-150",
                item.checked ? "bg-success text-white" : "bg-white text-transparent ring-[1.5px] ring-inset ring-black/[0.14]",
              )}
            >
              <IconCheck
                className={cn(
                  "size-3 transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                  item.checked ? "scale-100 opacity-100" : "scale-50 opacity-0",
                )}
                strokeWidth={3}
              />
            </span>
            <span
              className={cn(
                "text-[13px] leading-snug transition-colors duration-150",
                item.checked ? "text-muted-foreground/80 line-through decoration-muted-foreground/30" : "text-heading",
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
