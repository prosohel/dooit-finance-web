"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { detectorLabel, fieldLabel, formatMoney, RISK_LABELS } from "./constants";

function Metric({ label, children, caption }) {
  return (
    <div className="px-4 py-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="mt-0.5 text-[22px] font-semibold leading-tight text-heading tabular-nums">
        {children}
      </div>
      {caption && <p className="mt-0.5 text-[11px] text-muted-foreground">{caption}</p>}
    </div>
  );
}

/** A ranked list with a proportion bar behind each count. */
function CountList({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="px-4 py-3">
      <span className="text-[11px] font-semibold text-heading">{title}</span>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Nothing to show</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((row) => (
            <li key={row.key} className="text-xs" title={row.title}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-neutral-700">{row.label}</span>
                <span className="font-medium tabular-nums text-heading">{row.count}</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-muted">
                <div className="h-1 rounded-full bg-primary/70" style={{ width: `${(row.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const joinCounts = (obj = {}) =>
  Object.entries(obj)
    .map(([key, count]) => `${key} ${count}`)
    .join(" · ");

export default function AiAlertSummary({ summary, loading }) {
  if (!summary) {
    return loading ? <Skeleton className="h-[230px] w-full rounded-xl" /> : null;
  }

  const riskRows = RISK_LABELS.filter((label) => summary.byRiskLabel?.[label])
    .reverse()
    .map((label) => ({ key: label, label, count: summary.byRiskLabel[label] }));

  const detectorRows = Object.entries(summary.byDetector || {}).map(([key, count]) => ({
    key,
    label: detectorLabel(key),
    count,
  }));

  const ruleRows = (summary.topRules || []).map((rule) => ({
    key: rule.ruleId,
    label: `${rule.ruleId} · ${rule.ruleName}`,
    title: rule.caseType,
    count: rule.count,
  }));

  const fieldRows = (summary.topFields || []).map((f) => ({
    key: f.field,
    label: fieldLabel(f.field),
    title: f.field,
    count: f.count,
  }));

  return (
    <Card className="gap-0 overflow-hidden border-border py-0 shadow-sm">
      <div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0">
        <Metric label="Flagged transactions" caption={joinCounts(summary.byCaseType)}>
          {summary.total ?? 0}
        </Metric>
        <Metric label="Amount flagged">
          {summary.amountByCurrency?.length ? (
            <div className="space-y-0.5">
              {summary.amountByCurrency.map((row, index) => (
                <p key={row.currency} className={index > 0 ? "text-sm font-medium" : undefined}>
                  {formatMoney(row.sum, row.currency)}
                </p>
              ))}
            </div>
          ) : (
            "—"
          )}
        </Metric>
        <Metric label="Alerts created" caption={joinCounts(summary.byDetectorCombination)}>
          {summary.alerts?.created ?? 0}
        </Metric>
        <Metric label="Score bands" caption="Transactions per risk score range">
          <span className="text-sm font-medium">{joinCounts(summary.scoreBands) || "—"}</span>
        </Metric>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border border-t border-border md:grid-cols-2 md:divide-x lg:grid-cols-4 lg:divide-y-0">
        <CountList title="Risk levels" rows={riskRows} />
        <CountList title="Detectors" rows={detectorRows} />
        <CountList title="Top rules" rows={ruleRows} />
        <CountList title="Top triggered fields" rows={fieldRows} />
      </div>
    </Card>
  );
}
