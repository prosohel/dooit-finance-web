"use client";

import { CASE_COLORS, RISK_COLORS, formatCount, formatShare } from "./shared";

function Kpi({ label, value, caption, dot }) {
  return (
    <div className="min-w-0 px-5 py-4">
      <div className="flex items-center gap-1.5">
        {dot && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} />}
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-heading tabular-nums">
        {formatCount(value)}
      </p>
      {caption && <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{caption}</p>}
    </div>
  );
}

export default function KpiRow({ summary }) {
  const total = summary.total ?? 0;
  const risk = summary.byRiskLabel || {};
  const cases = summary.byCaseType || {};

  // "High-risk" is High and Critical together; Critical is called out because
  // it is the label an analyst triages first and is easily lost inside the sum.
  const critical = risk.Critical ?? 0;
  const highRisk = (risk.High ?? 0) + critical;

  const created = summary.alerts?.created;
  const updated = summary.alerts?.updated;
  const alertsCaption =
    created != null ? `${formatCount(created)} new alerts · ${formatCount(updated ?? 0)} updated` : null;

  return (
    // Separated by whitespace, not rules: four numbers don't need boxes.
    <div className="grid grid-cols-2 md:grid-cols-4">
      <Kpi label="Total detections" value={total} caption={alertsCaption} />
      <Kpi
        label="High-risk detections"
        value={highRisk}
        dot={critical ? RISK_COLORS.Critical : RISK_COLORS.High}
        caption={`${formatCount(critical)} critical · ${formatShare(highRisk, total)} of total`}
      />
      <Kpi
        label="Fraud cases"
        value={cases.Fraud ?? 0}
        dot={CASE_COLORS.Fraud}
        caption={`${formatShare(cases.Fraud ?? 0, total)} of detections`}
      />
      <Kpi
        label="AML cases"
        value={cases.AML ?? 0}
        dot={CASE_COLORS.AML}
        caption={`${formatShare(cases.AML ?? 0, total)} of detections`}
      />
    </div>
  );
}
