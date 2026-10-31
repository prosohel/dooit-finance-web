"use client";

import { cn } from "@/lib/utils";
import { formatNumber, buildTotalsLine } from "./reportHelpers";

const COLUMNS = "44px minmax(220px,1fr) 90px 90px 70px 100px 100px 80px";

function Cell({ value, missingLabel = "missing", className, align }) {
  const isMissing = value == null || value === "";
  return (
    <span
      className={cn(
        "px-2 py-3 text-xs",
        align === "right" && "text-right",
        isMissing ? "text-danger" : "text-foreground",
        className,
      )}
    >
      {isMissing ? missingLabel : value}
    </span>
  );
}

// Raw table of the line items exactly as extracted from the source
// document — deliberately un-editorialised so an analyst can see at a
// glance which fields the model actually found versus left blank.
export default function ExtractedProductsTable({ run }) {
  const totalsLine = buildTotalsLine(run.documentExtract, run.gap);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <span className="text-xs font-semibold tracking-wide text-heading uppercase">Products as extracted</span>
        <span className="text-[11px] text-muted-foreground">fields left empty were not present on the document</span>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[720px] border-b border-border bg-muted/30 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase"
          style={{ gridTemplateColumns: COLUMNS }}
        >
          <span className="px-2 py-2.5 pl-5">#</span>
          <span className="px-2 py-2.5">Description</span>
          <span className="px-2 py-2.5">HS code</span>
          <span className="px-2 py-2.5 text-right">Quantity</span>
          <span className="px-2 py-2.5">Unit</span>
          <span className="px-2 py-2.5 text-right">Unit price</span>
          <span className="px-2 py-2.5 text-right">Total price</span>
          <span className="px-2 py-2.5">Currency</span>
        </div>

        {run.products.map((p) => (
          <div
            key={p.lineNumber}
            className="grid min-w-[720px] items-start border-b border-border/60 last:border-b-0"
            style={{ gridTemplateColumns: COLUMNS }}
          >
            <span className="px-2 py-3 pl-5 font-mono text-xs text-muted-foreground">{String(p.lineNumber).padStart(3, "0")}</span>
            <span className="px-2 py-3 pr-3 text-xs leading-relaxed text-foreground">{p.description}</span>
            <Cell value={p.hsCode} missingLabel="—" />
            <Cell value={p.quantity} align="right" />
            <Cell value={p.unit} missingLabel="—" />
            <span className="px-2 py-3 text-right font-mono text-xs font-semibold text-heading">{formatNumber(p.unitPrice)}</span>
            <span className="px-2 py-3 text-right font-mono text-xs text-heading">{formatNumber(p.totalPrice)}</span>
            <Cell value={p.currency} />
          </div>
        ))}
      </div>

      <div className="bg-muted/30 px-5 py-3">
        <span className="font-mono text-[11px] text-muted-foreground">{totalsLine}</span>
      </div>
    </div>
  );
}
