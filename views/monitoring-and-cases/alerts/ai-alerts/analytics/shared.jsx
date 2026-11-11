"use client";

// Shared pieces for the monitoring analytics dashboard: palette, number
// formatting, the section frame and the hover hint.
//
// Colours are hex literals from globals.css rather than var() — recharts and
// the network graph write them into SVG presentation attributes, where CSS
// variables are not reliably resolved.

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const COLORS = {
  primary: "#005964",
  primaryLight: "#25737d",
  primaryTint: "#a9c7cb",
  purple: "#402e7a",
  warning: "#f6b500",
  danger: "#ca2f7f",
  info: "#17a2b8",
  muted: "#bdbdbd",
  grid: "#f0eeef",
};

export const CASE_COLORS = {
  Fraud: COLORS.primary,
  AML: COLORS.purple,
  Compliance: COLORS.primaryLight,
  TF: COLORS.info,
};

export const RISK_COLORS = {
  Low: COLORS.info,
  Medium: COLORS.primaryTint,
  High: COLORS.warning,
  Critical: COLORS.danger,
};

// Sequential ramp: a higher score band is a darker shade of the primary.
export const SCORE_BAND_COLORS = [COLORS.primaryTint, COLORS.primaryLight, COLORS.primary];

const integer = new Intl.NumberFormat("en-US");
export const formatCount = (n) => (n == null ? "—" : integer.format(n));

/** Share of a whole, kept honest at the extremes: 2 of 975 is "0.2%", not "0%". */
export const formatShare = (part, whole) => {
  if (!whole) return "—";
  const pct = (part / whole) * 100;
  if (pct > 0 && pct < 0.1) return "<0.1%";
  return `${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%`;
};

/** Section frame: a title row with optional context and controls, then content. */
export function Section({ title, aside, action, className, children }) {
  return (
    <section className={cn("min-w-0 px-5 py-4", className)}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="text-[13px] font-semibold text-heading">{title}</h3>
          {aside && <span className="truncate text-[11px] text-muted-foreground">{aside}</span>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Small segmented control — used for the case-type filter. */
export function Segmented({ value, options, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-md bg-smoke-200 p-0.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-[color,background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.97]",
              selected
                ? "bg-white text-heading shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                : "text-muted-foreground hover:text-heading"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * One provider for every hint in the dashboard, so after the first tooltip
 * opens, moving down a list of bars opens the next one instantly instead of
 * waiting out the delay again. (The shared ui/tooltip wraps each tooltip in its
 * own provider, which defeats that.)
 */
export function HintProvider({ children }) {
  return (
    <TooltipPrimitive.Provider delayDuration={250} skipDelayDuration={400}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Hint({ content, children, side = "top" }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        {/* Radix marks a skip-delay open as "instant-open": those skip the
            entrance animation too, so scanning down a list doesn't flicker. */}
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-50 max-w-64 origin-(--radix-tooltip-content-transform-origin) rounded-lg border border-border bg-white px-2.5 py-2 text-xs shadow-md animate-in fade-in-0 zoom-in-95 duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100 data-[state=instant-open]:animate-none"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/** Label/value lines inside a tooltip. */
export function HintRows({ title, rows }) {
  return (
    <div className="space-y-0.5">
      {title && <p className="mb-1 font-semibold text-heading">{title}</p>}
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium tabular-nums text-heading">{value}</span>
        </div>
      ))}
    </div>
  );
}

/** Recharts tooltip body in the same style as Hint. */
export function ChartHint({ active, payload, render }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-2.5 py-2 text-xs shadow-md">
      {render(payload[0].payload)}
    </div>
  );
}

/** A labelled horizontal bar list. Bars grow from the left via scaleX, so a
 *  filter change retargets them smoothly instead of re-rendering a chart. */
export function BarList({ rows, max, color = COLORS.primary, labelWidth = "16rem" }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-1">
      {rows.map((row) => (
        <Hint key={row.key} content={row.hint} side="top">
          <li
            tabIndex={0}
            className="grid cursor-default grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-md px-1.5 py-1 outline-none transition-colors duration-150 hover:bg-smoke-200/70 focus-visible:bg-smoke-200/70 sm:grid-cols-[minmax(0,var(--label-w))_minmax(0,1fr)_auto]"
            style={{ "--label-w": labelWidth }}
          >
            <div className="flex min-w-0 items-center gap-1.5 text-xs">{row.label}</div>
            <div className="col-span-2 row-start-2 h-1.5 overflow-hidden rounded-full bg-smoke-200 sm:col-span-1 sm:row-start-auto">
              <div
                className="h-full w-full origin-left rounded-full transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ transform: `scaleX(${row.count / top})`, backgroundColor: row.color || color }}
              />
            </div>
            <span className="col-start-2 row-start-1 text-right text-xs font-semibold tabular-nums text-heading sm:col-start-auto sm:row-start-auto">
              {formatCount(row.count)}
            </span>
          </li>
        </Hint>
      ))}
    </ul>
  );
}
