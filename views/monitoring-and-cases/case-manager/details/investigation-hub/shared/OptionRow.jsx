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
        "flex items-start gap-3 text-left transition-colors",
        dense
          ? "rounded-md px-2 py-1.5 text-[13px] hover:bg-muted/50"
          : "mb-2 w-full rounded-lg border px-4 py-3 text-sm",
        !dense &&
          (selected
            ? "border-primary/60 bg-primary/5 text-heading ring-1 ring-primary/20"
            : "border-border bg-white text-heading hover:border-muted-foreground/30 hover:bg-muted/30"),
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center border transition-colors",
          multi ? "rounded" : "rounded-full",
          selected ? "border-primary bg-primary text-white" : "border-muted-foreground/40 bg-white text-transparent",
        )}
      >
        {multi ? (
          <IconCheck className="size-3" strokeWidth={3} />
        ) : (
          <span className={cn("size-1.5 rounded-full", selected ? "bg-white" : "bg-transparent")} />
        )}
      </span>
      <span
        className={cn(
          dense ? "text-muted-foreground" : selected ? "font-medium" : "",
          selected && dense && "font-medium text-heading",
        )}
      >
        {label}
      </span>
    </button>
  );
}
