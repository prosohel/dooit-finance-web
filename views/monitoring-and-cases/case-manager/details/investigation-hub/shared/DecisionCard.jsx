"use client";

import { IconArrowUpRight, IconCircleX, IconShieldSearch, IconCircleDot } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const ICONS = {
  investigate: IconShieldSearch,
  escalate: IconArrowUpRight,
  dismiss: IconCircleX,
};

// Icon tile colour per tone: tinted at rest, solid once chosen so the
// decision reads from across the screen.
const TONES = {
  primary: { rest: "bg-primary/[0.08] text-primary", on: "bg-primary text-white" },
  warning: { rest: "bg-warning/10 text-warning", on: "bg-warning text-white" },
  neutral: { rest: "bg-black/[0.03] text-muted-foreground", on: "bg-heading text-white" },
};

/**
 * A large, single-choice decision card (radio semantics) with an icon, a
 * label and a one-line consequence. Used when a step's options carry
 * `optionDetails` — e.g. triage, where each choice changes what happens next.
 */
export default function DecisionCard({ label, description, icon, tone = "primary", selected, onSelect, tabIndex, onKeyDown }) {
  const Icon = ICONS[icon] || IconCircleDot;
  const t = TONES[tone] || TONES.primary;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={!!selected}
      tabIndex={tabIndex}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        "group relative flex w-full items-center gap-4 rounded-xl border p-4 text-left outline-none",
        "transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99]",
        "focus-visible:ring-[3px] focus-visible:ring-primary/25",
        selected
          ? "border-primary/50 bg-primary/[0.04]"
          : "border-dashed border-black/[0.1] bg-white [@media(hover:hover)]:hover:border-black/[0.16] [@media(hover:hover)]:hover:bg-black/[0.015]",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[11px] transition-colors duration-200 ease-out",
          selected ? t.on : t.rest,
        )}
      >
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-tight tracking-[-0.005em] text-heading">{label}</span>
        {description && (
          <span className="mt-1 block text-[12.5px] leading-snug text-muted-foreground">{description}</span>
        )}
      </span>

      {/* Radio mark — the dot grows from a visible size, never from nothing. */}
      <span
        aria-hidden
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow] duration-200 ease-out",
          selected ? "bg-primary" : "bg-white ring-[1.5px] ring-inset ring-black/15",
        )}
      >
        <span
          className={cn(
            "size-[7px] rounded-full bg-white transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
            selected ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
      </span>
    </button>
  );
}
