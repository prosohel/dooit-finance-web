"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { chipClass, formatNumber } from "./reportHelpers";

function FieldRow({ label, value }) {
  const isEmpty = value == null || value === "" || (Array.isArray(value) && !value.length);
  const display = isEmpty ? "—" : Array.isArray(value) ? value.join(", ") : value;
  return (
    <div className="flex items-baseline justify-between gap-3 bg-card px-3 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-right text-[11px]", isEmpty ? "text-muted-foreground/50" : "font-medium text-heading")}>{display}</span>
    </div>
  );
}

// Per-product OSINT card in the side rail: the reference range banner,
// a compact fields grid, price sources, and the raw findings the research
// pass surfaced (collapsed by default — these are supporting detail, not
// the headline).
export default function OsintResultCard({ result }) {
  const [open, setOpen] = useState(false);
  const hasRange = result.referenceLow != null && result.referenceHigh != null;
  const rangeLine = hasRange
    ? `${formatNumber(result.referenceLow)} – ${formatNumber(result.referenceHigh)}${result.unit ? ` / ${result.unit}` : ""}`
    : "not benchmarked";

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border/70 bg-background p-3.5">
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-[10.5px] text-muted-foreground/70">{result.productKey}</span>
        <span className="text-xs font-semibold leading-snug text-heading">{result.productDescription}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold", chipClass(result.dataAvailability?.startsWith("SUFFICIENT") ? "ok" : "mute"))}>
          {result.dataAvailability}
        </span>
        <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold", chipClass(result.sanctionedJurisdiction ? "danger" : "ok"))}>
          {result.sanctionedJurisdiction ? "SANCTIONED JURISDICTION" : "NO SANCTIONS FLAG"}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-3 rounded-md bg-primary px-3 py-2.5">
        <span className="text-[10px] font-semibold tracking-wide text-primary-foreground/70 uppercase">Reference range</span>
        <span className="font-mono text-[13px] font-semibold text-primary-foreground">{rangeLine}</span>
      </div>

      <div className="flex flex-col gap-px overflow-hidden rounded-md border border-border/60 bg-border/60">
        <FieldRow label="HS Code" value={result.hsCode} />
        <FieldRow label="Unit Basis" value={result.unit} />
        <FieldRow label="Mid Price" value={result.referenceMid != null ? formatNumber(result.referenceMid) : null} />
        <FieldRow label="Currency" value={result.currency} />
        <FieldRow label="Observations" value={result.observations} />
        {/* How much of the range came from the stated product versus goods of
            the same class — the difference between a benchmark and an analogy. */}
        <FieldRow label="Exact Matches" value={result.exactMatchObservations} />
        <FieldRow label="Comparables" value={result.comparableObservations} />
        <FieldRow label="Typical Origins" value={result.typicalOrigins} />
        <FieldRow label="Typical Routes" value={result.typicalRoutes} />
        <FieldRow label="HS Codes Observed" value={result.hsCodesObserved} />
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">{result.availabilityNote}</p>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Price sources</span>
        <div className="flex flex-wrap gap-1.5">
          {(result.priceSources?.length ? result.priceSources : ["none used"]).map((src) => (
            <span key={src} className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[11px] text-primary">
              {src}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Aggregated findings</span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
            {open ? "Collapse" : "Expand"}
            {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </span>
        </button>
        {open && (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-2.5">
            {result.findings.map((f, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <span className="font-mono text-[10.5px] text-primary">{f.source}</span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">{f.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
