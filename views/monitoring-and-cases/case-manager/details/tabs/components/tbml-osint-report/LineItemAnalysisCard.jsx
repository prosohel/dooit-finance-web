"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import PriceComparisonBar from "./PriceComparisonBar";
import FindingDetail from "./FindingDetail";
import { chipClass, computePriceDeviation, formatNumber } from "./reportHelpers";

const RISK_TO_CHIP = { HIGH: "danger", MEDIUM: "warn", MED: "warn", LOW: "ok", INSUFFICIENT_DATA: "mute" };

// One declared line item: the declared-vs-market comparison up top, and a
// collapsible "product analysis & findings" section underneath with the
// reference basis, the TBML findings for this line, and the market
// evidence quotes that back the reference range.
export default function LineItemAnalysisCard({ lineItem, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const { reference } = lineItem;

  const deviation = lineItem.testable ? computePriceDeviation({ declared: lineItem.declared, mid: reference?.mid }) : null;
  const riskChipKind = RISK_TO_CHIP[lineItem.riskLevel] || "mute";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex max-w-[460px] flex-col gap-1">
          <span className="font-mono text-[11px] text-muted-foreground">
            LINE {String(lineItem.lineNumber).padStart(3, "0")}
            {lineItem.testable ? (
              <span className={cn("ml-2 rounded px-1.5 py-0.5 font-sans text-[10px] font-bold", chipClass(riskChipKind))}>
                RISK {lineItem.riskScore}
              </span>
            ) : (
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-sans text-[10px] font-bold text-muted-foreground">
                NOT TESTABLE
              </span>
            )}
          </span>
          <span className="text-sm font-semibold text-heading">{lineItem.title}</span>
        </div>

        <div className="flex gap-6 text-right">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Declared</p>
            <p className="font-mono text-lg font-semibold text-heading">{formatNumber(lineItem.declared)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Market mid</p>
            <p className="font-mono text-lg font-semibold text-muted-foreground">{reference?.mid != null ? formatNumber(reference.mid) : "n/a"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Deviation</p>
            <p className={cn("font-mono text-lg font-semibold", deviation ? chipClass(deviation.kind).split(" ").pop() : "text-muted-foreground")}>
              {deviation ? deviation.label : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Declared vs market band */}
      {reference && (lineItem.testable || reference.low != null) && (
        <PriceComparisonBar
          low={reference.low}
          high={reference.high}
          mid={lineItem.testable ? reference.mid : null}
          declared={lineItem.testable ? lineItem.declared : null}
          testable={lineItem.testable}
          unit={
            !lineItem.testable
              ? `${reference.currency || ""} ${formatNumber(reference.low)} - ${formatNumber(reference.high)} ${reference.unit || ""}`.trim()
              : null
          }
          note={!lineItem.testable ? lineItem.blockedNote : null}
        />
      )}

      {/* Blocked-on-data note, when there's no reference range to show at all */}
      {lineItem.notRequired && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-3.5 py-3">
          <span className="text-xs font-semibold text-muted-foreground">Not price-benchmarked</span>
          <span className="text-xs text-muted-foreground">Tax adjustments are not tested against market data.</span>
        </div>
      )}

      {/* Findings toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 border-l-[3px] border-l-primary bg-primary/5 px-3.5 py-2.5 text-left hover:bg-primary/10"
      >
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="text-[11px] font-bold tracking-wide text-primary uppercase">Product analysis &amp; findings</span>
          <span className="rounded border border-primary/20 bg-card px-1.5 py-0.5 text-[11px] font-semibold text-primary">
            {lineItem.findings.length ? lineItem.findings.length : "no"} finding{lineItem.findings.length === 1 ? "" : "s"}
          </span>
        </span>
        {open ? <ChevronUp className="size-3.5 text-primary" /> : <ChevronDown className="size-3.5 text-primary" />}
      </button>

      {open && (
        <div className="flex flex-col gap-4 rounded-lg border border-primary/15 bg-primary/[0.02] p-4">
          <div className="flex flex-wrap gap-6 text-xs">
            {reference && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">Reference range</span>
                  <span className="w-fit rounded bg-primary/10 px-1.5 py-0.5 font-mono font-semibold text-primary">
                    {reference.currency} {formatNumber(reference.low)} – {formatNumber(reference.high)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">Unit basis</span>
                  <span className="w-fit rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">{reference.unit}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">Observations</span>
                  <span className="w-fit rounded bg-primary/10 px-1.5 py-0.5 font-mono font-semibold text-primary">{reference.observations}</span>
                </div>
              </>
            )}
            {/* Two different questions the engine answers separately: whether
                the DECLARED price could be tested, and whether market data was
                found at all. "Market SUFFICIENT / declared NONE" is the normal
                shape of "we found a price, but not in a comparable unit". */}
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">Price testable</span>
              <span className={cn("w-fit rounded px-1.5 py-0.5 font-semibold", chipClass(lineItem.dataAvailability?.startsWith("SUFFICIENT") ? "ok" : "mute"))}>
                {lineItem.dataAvailability}
              </span>
            </div>
            {lineItem.marketDataAvailability && (
              <div className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">Market data</span>
                <span className={cn("w-fit rounded px-1.5 py-0.5 font-semibold", chipClass(lineItem.marketDataAvailability.startsWith("SUFFICIENT") ? "ok" : "mute"))}>
                  {lineItem.marketDataAvailability}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">Risk</span>
              <span className={cn("w-fit rounded px-1.5 py-0.5 font-semibold", chipClass(riskChipKind))}>
                {lineItem.riskLevel} · {lineItem.riskScore}
              </span>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{lineItem.summary}</p>

          {lineItem.findings.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                Findings ({lineItem.findings.length})
              </span>
              {lineItem.findings.map((f, i) => (
                <FindingDetail key={`${f.indicator}-${i}`} finding={f} />
              ))}
            </div>
          )}

          {lineItem.marketEvidence?.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-dashed border-border pt-3">
              <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                Market evidence used
                {/* Say how much is not shown, so the list never reads as the
                    whole basis when it is a sample of it. */}
                {lineItem.marketEvidenceTotal > lineItem.marketEvidence.length && (
                  <span className="ml-1.5 font-normal normal-case">
                    — showing {lineItem.marketEvidence.length} of {lineItem.marketEvidenceTotal};
                    the rest are in References
                  </span>
                )}
              </span>
              {lineItem.marketEvidence.map((e, i) => (
                <p key={i} className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-mono text-primary">{e.source}</span> — {e.quote}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
