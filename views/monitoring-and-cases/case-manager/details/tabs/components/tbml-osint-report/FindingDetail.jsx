"use client";

import { cn } from "@/lib/utils";

// The engine's RiskLevel enum runs to CRITICAL; without it a critical finding
// would fall through to the muted style and read as the mildest on the card.
const SEVERITY_KIND = { CRITICAL: "danger", HIGH: "danger", MEDIUM: "warn", LOW: "mute" };

const WRAP_STYLES = {
  danger: "border-danger/20 bg-danger/5",
  warn: "border-warning/30 bg-warning/5",
  mute: "border-border bg-muted/30",
};

const INDICATOR_TEXT = {
  danger: "text-danger",
  warn: "text-yellow-700",
  mute: "text-muted-foreground",
};

const SEVERITY_CHIP = {
  danger: "bg-danger/10 text-danger",
  warn: "bg-warning/10 text-yellow-700",
  mute: "bg-muted text-muted-foreground",
};

// A single TBML finding attached to a line item — indicator + severity on
// the left, the full description / evidence / recommendation on the right.
// Unlike the report-level finding rows, these are always expanded; only the
// containing "Product analysis & findings" section collapses.
export default function FindingDetail({ finding }) {
  const kind = SEVERITY_KIND[finding.severity] || "mute";

  return (
    <div className={cn("grid gap-3.5 rounded-lg border p-3.5 sm:grid-cols-[176px_1fr]", WRAP_STYLES[kind])}>
      <div className="flex flex-col gap-1">
        <span className={cn("font-mono text-[11px] font-semibold", INDICATOR_TEXT[kind])}>{finding.indicator}</span>
        <span className={cn("w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold", SEVERITY_CHIP[kind])}>
          {finding.severity} severity
        </span>
      </div>
      <div className="flex flex-col gap-1.5 text-xs leading-relaxed text-foreground">
        <p>{finding.description}</p>
        {finding.evidence && (
          <p>
            <strong className="font-semibold">Evidence. </strong>
            {finding.evidence}
          </p>
        )}
        {finding.recommendation && (
          <p>
            <strong className="font-semibold">Recommendation. </strong>
            {finding.recommendation}
          </p>
        )}
      </div>
    </div>
  );
}
