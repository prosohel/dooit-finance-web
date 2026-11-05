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
        "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.99]",
        dense
          ? "rounded-md px-2 py-1.5 text-[13px] hover:bg-black/[0.03]"
          : "mb-2 w-full rounded-lg border px-4 py-3 text-[13.5px]",
        !dense &&
          (selected
            ? "border-primary/50 bg-primary/[0.04] text-heading shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_10%,transparent)]"
            : "border-border bg-white text-heading shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-muted-foreground/30"),
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center transition-colors duration-150",
          multi ? "rounded-[5px]" : "rounded-full",
          selected
            ? "bg-primary text-white"
            : "bg-white text-transparent ring-1 ring-inset ring-muted-foreground/35",
        )}
      >
        {multi ? (
          <IconCheck
            className={cn("size-3 transition-transform duration-150 ease-out", selected ? "scale-100" : "scale-75")}
            strokeWidth={3}
          />
        ) : (
          <span
            className={cn(
              "size-1.5 rounded-full bg-white transition-transform duration-150 ease-out",
              selected ? "scale-100" : "scale-0",
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
