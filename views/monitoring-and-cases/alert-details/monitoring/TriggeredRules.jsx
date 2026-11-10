"use client";

// One card per matched rule. The primary rule leads, is marked, and opens by
// default; secondary rules open too while the list is short, otherwise they
// collapse to their header so the list stays scannable.

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/utils";
import { RISK_LABEL } from "../alertAdapter";
import { EmptyState, fmtDate } from "../components";

const EXPAND_ALL_UP_TO = 3;

export default function TriggeredRules({ rules, summary }) {
  if (!rules.length) return <EmptyState>No rule matches were recorded for this monitoring run.</EmptyState>;
  return (
    <div className="flex flex-col gap-3">
      <SummaryLine summary={summary} />
      {rules.map((rule) => (
        <RuleCard key={rule.id} rule={rule} defaultOpen={rule.isPrimary || rules.length <= EXPAND_ALL_UP_TO} />
      ))}
    </div>
  );
}

function SummaryLine({ summary }) {
  const parts = [
    summary.evaluated
      ? `${summary.matched} of ${summary.evaluated} rules matched`
      : `${summary.matched} rule${summary.matched === 1 ? "" : "s"} matched`,
    summary.detectedBy.length ? `Detected by ${summary.detectedBy.join(", ")}` : null,
    summary.detectedAt ? `Evaluated ${fmtDate(summary.detectedAt)}` : null,
  ].filter(Boolean);
  return <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>;
}

export function SeverityPill({ label, score }) {
  if (!label && score === null) return null;
  return (
    <StatusPill variant={RISK_LABEL[label] || "muted"}>
      {label || "Score"}
      {score !== null ? <span className="tabular-nums opacity-70"> · {score}</span> : null}
    </StatusPill>
  );
}

function RuleCard({ rule, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const context = [rule.typology, rule.category].filter(Boolean).join(" · ");

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "rounded-lg border bg-white",
        rule.isPrimary ? "border-primary/30 ring-1 ring-primary/10" : "border-border",
      )}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <IconChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out",
              !open && "-rotate-90",
            )}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-heading">{rule.name}</span>
              {rule.ruleId && <span className="font-mono text-xs text-muted-foreground">{rule.ruleId}</span>}
              {rule.version !== null && <span className="text-[11px] text-muted-foreground/80">v{rule.version}</span>}
              {rule.isPrimary && (
                <span className="rounded bg-primary/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Primary
                </span>
              )}
            </div>
            {context && <span className="truncate text-xs text-muted-foreground">{context}</span>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {rule.caseType && <StatusPill variant="outline">{rule.caseType}</StatusPill>}
            <SeverityPill label={rule.severity} score={rule.score} />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="flex flex-col gap-3 px-4 pb-4 pl-11">
          {(rule.explanation || rule.conditionSummary) && (
            <div className="flex flex-col gap-1">
              {rule.explanation && <p className="text-[13px] leading-5 text-foreground">{rule.explanation}</p>}
              {rule.conditionSummary && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Rule logic:</span> {rule.conditionSummary}
                </p>
              )}
            </div>
          )}
          <ConditionTable conditions={rule.conditions} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const GRID = "grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3";

function ConditionTable({ conditions }) {
  if (!conditions.length) return null;
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className={cn(GRID, "bg-muted/60 px-3 py-1.5")}>
        {["Matched condition", "Expected", "Actual"].map((h, i) => (
          <span
            key={h}
            className={cn("text-[11px] font-medium uppercase tracking-wide text-muted-foreground", i > 0 && "text-right")}
          >
            {h}
          </span>
        ))}
      </div>
      {conditions.map((c) => (
        <div key={c.id} className={cn(GRID, "items-baseline border-t border-border px-3 py-2")}>
          <span className="truncate text-[13px] text-foreground" title={c.label}>{c.label}</span>
          <span className="truncate text-right text-[13px] tabular-nums text-muted-foreground">{c.expected ?? "—"}</span>
          <span className="truncate text-right text-[13px] font-semibold tabular-nums text-heading">{c.actual ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}
