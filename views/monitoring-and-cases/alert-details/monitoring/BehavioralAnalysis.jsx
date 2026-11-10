"use client";

// Compact behavioural read-out: three metric groups side by side, a ratio bar
// for pass-through, tone only on unusual changes, and the rest behind a
// disclosure. Metrics that fed a triggered rule carry a small marker so the
// two sections connect without repeating each other.

import { useState } from "react";
import { IconArrowDownRight, IconArrowUpRight, IconChevronDown } from "@tabler/icons-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { EmptyState, fmtDate } from "../components";

// Percentage changes: tone is reserved for genuinely large moves.
const changeTone = (n) => (n >= 100 ? "text-pink-700" : n >= 25 ? "text-yellow-700" : "text-heading");

export default function BehavioralAnalysis({ behavior }) {
  const { groups, secondary, window } = behavior;
  if (!groups.length && !secondary.length) {
    return <EmptyState>No behavioural context was recorded for this monitoring run.</EmptyState>;
  }
  const anyTriggered = [...groups.flatMap((g) => g.metrics), ...secondary].some((m) => m.triggered);

  return (
    <div className="flex flex-col gap-4">
      {groups.length > 0 && (
        <div className="grid grid-cols-1 divide-y divide-border rounded-lg border border-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {groups.map((g) => (
            <MetricGroup key={g.id} group={g} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        {window ? <span>Window: {fmtDate(window.start)} – {fmtDate(window.end)}</span> : <span />}
        {anyTriggered && (
          <span className="flex items-center gap-1.5">
            <TriggerDot /> Contributed to a triggered rule
          </span>
        )}
      </div>

      {secondary.length > 0 && <SecondaryIndicators metrics={secondary} />}
    </div>
  );
}

function MetricGroup({ group }) {
  return (
    <div className="flex flex-col gap-3.5 p-4">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{group.title}</span>
      {group.metrics.map((m) => (m.kind === "ratio" ? <RatioMetric key={m.key} metric={m} /> : <Metric key={m.key} metric={m} />))}
    </div>
  );
}

function MetricLabel({ metric }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {metric.label}
      {metric.triggered && <TriggerDot />}
    </span>
  );
}

function Metric({ metric }) {
  const isChange = metric.kind === "pctChange";
  const Arrow = metric.raw < 0 ? IconArrowDownRight : IconArrowUpRight;
  return (
    <div className="flex flex-col gap-0.5">
      <MetricLabel metric={metric} />
      <span
        className={cn(
          "flex items-center gap-1 text-lg font-semibold leading-6 tabular-nums",
          isChange ? changeTone(metric.raw) : "text-heading",
        )}
      >
        {isChange && metric.raw !== 0 && <Arrow className="size-4 shrink-0" />}
        {metric.value}
      </span>
    </div>
  );
}

/** 0–1 ratio as a bar, with the rule threshold marked when one exists. */
function RatioMetric({ metric }) {
  const pct = Math.max(0, Math.min(100, metric.raw * 100));
  const thresholdPct = metric.threshold !== null ? Math.max(0, Math.min(100, metric.threshold * 100)) : null;
  const over = thresholdPct !== null && pct >= thresholdPct;
  return (
    <div className="flex flex-col gap-1.5">
      <MetricLabel metric={metric} />
      <span className="text-lg font-semibold leading-6 tabular-nums text-heading">{metric.value}</span>
      <div
        className="relative h-1.5 w-full rounded-full bg-muted"
        role="meter"
        aria-label={metric.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", over ? "bg-danger" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
        {thresholdPct !== null && (
          <span
            className="absolute -top-1 h-3.5 w-px bg-foreground/60"
            style={{ left: `${thresholdPct}%` }}
            aria-hidden
          />
        )}
      </div>
      {thresholdPct !== null && (
        <span className="text-[11px] tabular-nums text-muted-foreground">Rule threshold {Math.round(thresholdPct)}%</span>
      )}
      <span className="text-[11px] leading-4 text-muted-foreground">Share of incoming funds sent on within the window.</span>
    </div>
  );
}

// Static context per metric — describes what the number is, never judges it.
const HINTS = {
  sender_amount_zscore_30d: "Standard deviations from the customer's 30-day average amount. Historical context only.",
};

function SecondaryIndicators({ metrics }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-left transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <IconChevronDown
            className={cn("size-4 text-muted-foreground transition-transform duration-150 ease-out", !open && "-rotate-90")}
          />
          <span className="text-[13px] font-medium text-heading">Additional Behavioral Indicators</span>
          <span className="text-xs tabular-nums text-muted-foreground">{metrics.length}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border px-4 py-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => (
            <div key={m.key} className="flex flex-col gap-0.5">
              <dt>
                <MetricLabel metric={m} />
              </dt>
              <dd className="text-[13px] font-semibold tabular-nums text-heading">{m.value}</dd>
              {HINTS[m.key] && <dd className="text-[11px] leading-4 text-muted-foreground">{HINTS[m.key]}</dd>}
            </div>
          ))}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TriggerDot() {
  return <span className="inline-block size-1.5 shrink-0 rounded-full bg-danger" aria-label="Contributed to a triggered rule" />;
}
