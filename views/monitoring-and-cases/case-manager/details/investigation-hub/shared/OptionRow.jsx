"use client";

import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * A selectable card/row used across the wizard for radio and checkbox style
 * choices (triage decisions, red-flag checklists, typologies, SMR service
 * lists...). `multi` only changes the mark's shape (square vs round) so
 * radio vs checkbox intent stays visually clear.
 */
export default function OptionRow({ label, selected, multi, onClick, dense = false }) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={!!selected}
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        "transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99]",
        dense
          ? "rounded-md px-2 py-1.5 text-[13px] [@media(hover:hover)]:hover:bg-black/[0.03]"
          : "mb-1 w-full items-center rounded-lg border px-4 py-3 text-[13.5px] text-heading",
        !dense &&
          (selected
            ? "border-primary/50 bg-primary/[0.04]"
            : "border-dashed border-transparent border-b-black/[0.08] bg-transparent [@media(hover:hover)]:hover:bg-black/[0.02]"),
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center transition-colors duration-150",
          multi ? "rounded-[5px]" : "rounded-full",
          selected
            ? "bg-primary text-white"
            : "bg-white text-transparent ring-[1.5px] ring-inset ring-black/[0.16]",
          dense && "mt-0.5",
        )}
      >
        {multi ? (
          <IconCheck
            className={cn(
              "size-3 transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
              selected ? "scale-100 opacity-100" : "scale-50 opacity-0",
            )}
            strokeWidth={3}
          />
        ) : (
          <span
            className={cn(
              "size-1.5 rounded-full bg-white transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
              selected ? "scale-100 opacity-100" : "scale-50 opacity-0",
            )}
          />
        )}
      </span>
      <span
        className={cn(
          "leading-snug",
          dense ? (selected ? "font-medium text-heading" : "text-muted-foreground") : selected && "font-medium",
        )}
      >
        {label}
      </span>
    </button>
  );
}
