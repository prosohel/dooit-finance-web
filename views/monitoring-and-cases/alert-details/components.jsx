"use client";

// Small presentational pieces shared by the alert-details tabs. Anything that
// already exists in the app (StatusPill, CollapsibleSection, RiskScoreGauge,
// SlaCountdown, ReasonAlertDialog) is imported where used, not re-invented.

import { StatusPill } from "@/components/ui/StatusPill";
import { cn, dateShowFormatWithTime, formatAUD } from "@/lib/utils";
import { RISK_LABEL, humanize } from "./alertAdapter";

export const fmtDate = (d) => (d ? dateShowFormatWithTime(d) : "—");
export const fmtMoney = (amount, currency) =>
  amount === null || amount === undefined ? "—" : formatAUD(amount, currency || "AUD");

/** Label over value — the key/value cell used across every tab. */
export function Field({ label, value, mono, className }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("truncate text-[13px] text-foreground", mono && "font-mono text-xs", empty && "text-muted-foreground")}>
        {empty ? "—" : value}
      </span>
    </div>
  );
}

export function FieldGrid({ cols = 2, children, className }) {
  return (
    <div
      className={cn("grid gap-x-6 gap-y-3", className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

export function Mono({ children, className }) {
  return <span className={cn("font-mono text-xs", className)}>{children}</span>;
}

export function IdChip({ children, className }) {
  return (
    <span
      className={cn(
        "rounded border bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-heading",
        className
      )}
    >
      {children}
    </span>
  );
}

export function RiskPill({ label, score }) {
  if (!label && score === null) return <StatusPill variant="muted">—</StatusPill>;
  return (
    <StatusPill variant={RISK_LABEL[label] || "outline"}>
      {label || "—"}
      {score !== null && score !== undefined ? ` · ${score}` : ""}
    </StatusPill>
  );
}

export function EmptyState({ children, className }) {
  return (
    <div className={cn("flex items-center justify-center rounded-lg border border-dashed border-border p-5 text-[13px] text-muted-foreground", className)}>
      {children}
    </div>
  );
}

/** Lightweight table with the same visual as the case-manager sections. */
export function SimpleTable({ columns, rows, emptyText = "Nothing to show", rowKey }) {
  if (!rows?.length) return <EmptyState>{emptyText}</EmptyState>;
  const template = columns.map((c) => c.width || "1fr").join(" ");
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <div style={{ minWidth: columns.length * 110 }}>
          <div className="grid gap-3 bg-muted px-3 py-2" style={{ gridTemplateColumns: template }}>
            {columns.map((c) => (
              <span key={c.key} className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {c.header}
              </span>
            ))}
          </div>
          {rows.map((row, i) => (
            <div
              key={rowKey ? rowKey(row, i) : i}
              className="grid items-center gap-3 border-t border-border px-3 py-2.5"
              style={{ gridTemplateColumns: template }}
            >
              {columns.map((c) => (
                <div key={c.key} className="min-w-0 truncate text-[13px] text-foreground">
                  {c.render ? c.render(row) : row[c.key] ?? "—"}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Tag({ children, variant = "outline" }) {
  return <StatusPill variant={variant}>{children}</StatusPill>;
}

export const labelOf = (map, key, fallback) => map?.[key]?.label ?? fallback ?? humanize(key) ?? "—";
export const variantOf = (map, key, fallback = "outline") => map?.[key]?.variant ?? fallback;
