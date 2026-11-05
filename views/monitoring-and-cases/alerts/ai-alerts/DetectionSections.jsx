"use client";

import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/utils";
import { detectorLabel, fieldLabel, formatMoney, riskVariants } from "./constants";

export function Section({ title, aside, children }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
        {aside && <span className="text-[11px] text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function DetectorBadges({ detectors = [] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {detectors.map((d) => (
        <Badge key={d} variant="outline" className="font-normal">
          {detectorLabel(d)}
        </Badge>
      ))}
    </div>
  );
}

const formatValue = (value) => {
  if (value == null || value === "") return "—";
  if (typeof value === "number") return Number.isInteger(value) ? value : value.toFixed(2);
  return String(value);
};

function Party({ title, party }) {
  return (
    <div className="min-w-0 flex-1 rounded-md border p-3">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-heading">{party?.name || "—"}</p>
      <p className="text-xs text-neutral-500">{party?.account || "—"}</p>
      <p className="mt-1 text-xs text-neutral-500">
        {[party?.institution, party?.country].filter(Boolean).join(", ") || "—"}
      </p>
    </div>
  );
}

export function TransactionDetails({ transaction }) {
  if (!transaction) return null;
  const facts = [
    ["Type", transaction.type],
    ["Channel", transaction.channel],
    ["Status", transaction.status],
    ["Cross-border", transaction.isCrossBorder ? "Yes" : "No"],
  ];

  return (
    <Section title="Transaction">
      <p className="text-xl font-semibold tabular-nums text-heading">
        {formatMoney(transaction.amount, transaction.currency)}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="capitalize text-heading">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="flex gap-2">
        <Party title="Sender" party={transaction.sender} />
        <Party title="Beneficiary" party={transaction.beneficiary} />
      </div>
    </Section>
  );
}

/** "Why flagged": one bar per field, weighted across every detector. */
export function TriggeredFields({ fields = [] }) {
  if (!fields.length) return null;
  const max = Math.max(...fields.map((f) => f.weight || 0), 0.0001);

  return (
    <Section title="Why flagged" aside="Weight across all detectors">
      <ul className="space-y-2.5">
        {fields.map((f) => (
          <li key={f.field} className="text-xs">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate font-medium capitalize text-heading" title={f.field}>
                {fieldLabel(f.field)}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{f.weight?.toFixed(2)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(f.weight / max) * 100}%` }} />
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-muted-foreground">
              <span className="truncate">Value: {formatValue(f.value)}</span>
              <span className="shrink-0">{(f.detectors || []).map(detectorLabel).join(" + ")}</span>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Reasons({ reasons = [] }) {
  if (!reasons.length) return null;
  return (
    <Section title="Reasons">
      <ul className="space-y-1.5">
        {reasons.map((reason, index) => (
          <li key={`${reason.ref}-${index}`} className="flex gap-2 text-xs text-neutral-700">
            <Badge variant="outline" className="h-fit shrink-0 font-normal">
              {detectorLabel(reason.detector)}
            </Badge>
            <span>{reason.text}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function RuleHits({ hits = [] }) {
  if (!hits.length) return null;
  return (
    <Section title="Rule hits" aside={`${hits.length} rule${hits.length > 1 ? "s" : ""}`}>
      <div className="space-y-2">
        {hits.map((hit) => (
          <div key={hit.ruleRef || hit.ruleId} className="rounded-md border p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-medium text-heading">{hit.ruleId}</span>
              <span className="text-neutral-600">{hit.ruleName}</span>
              <StatusPill variant={riskVariants[hit.riskLabel]}>{hit.riskLabel}</StatusPill>
              <span className="ml-auto text-muted-foreground">{hit.caseType}</span>
            </div>
            {hit.conditionSummary && <p className="mt-1.5 text-heading">{hit.conditionSummary}</p>}
            {hit.explanation && <p className="mt-0.5 text-muted-foreground">{hit.explanation}</p>}
            {hit.matchedConditions?.length > 0 && (
              <table className="mt-2 w-full table-fixed text-left">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="w-1/2 py-1 font-normal">Field</th>
                    <th className="py-1 font-normal">Operator</th>
                    <th className="py-1 font-normal">Expected</th>
                    <th className="py-1 font-normal">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {hit.matchedConditions.map((c, index) => (
                    <tr key={`${c.field}-${index}`} className="border-t">
                      <td className="truncate py-1 pr-2" title={c.field}>
                        {fieldLabel(c.field)}
                      </td>
                      <td className="py-1 font-mono">{c.operator}</td>
                      <td className="py-1 tabular-nums">{formatValue(c.expected)}</td>
                      <td className="py-1 font-medium tabular-nums text-heading">{formatValue(c.actual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function FactorList({ title, factors = [], tone }) {
  if (!factors.length) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] text-muted-foreground">{title}</p>
      <ul className="space-y-0.5">
        {factors.map((f) => (
          <li key={`${f.rank}-${f.feature}`} className="flex justify-between gap-2">
            <span className="truncate" title={f.fields?.join(", ")}>
              {f.feature.replace(/_/g, " ")} <span className="text-muted-foreground">= {formatValue(f.value)}</span>
            </span>
            <span className={cn("shrink-0 tabular-nums", tone)}>
              {f.contribution > 0 ? "+" : ""}
              {f.contribution?.toFixed(3)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModelCard({ model }) {
  const highProbability = model.probabilities?.High;

  return (
    <div className="space-y-2 rounded-md border p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-heading">{detectorLabel(model.detector)}</span>
        <StatusPill variant={riskVariants[model.riskLabel]}>{model.riskLabel}</StatusPill>
      </div>
      <p className="text-muted-foreground">
        {model.algorithm} · {model.explainer}
      </p>
      <dl className="grid grid-cols-3 gap-2">
        <div>
          <dt className="text-muted-foreground">Score</dt>
          <dd className="font-medium tabular-nums text-heading">{model.riskScore}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">P(High)</dt>
          <dd className="font-medium tabular-nums text-heading">
            {highProbability != null ? `${(highProbability * 100).toFixed(1)}%` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Threshold</dt>
          <dd className="font-medium tabular-nums text-heading">{model.threshold}</dd>
        </div>
      </dl>
      <FactorList title="Top factors" factors={model.topFactors} tone="text-danger" />
      <FactorList title="Mitigating factors" factors={model.mitigatingFactors} tone="text-success" />
    </div>
  );
}

export function ModelDetections({ detections }) {
  const models = [detections?.ml, detections?.dl].filter(Boolean);
  if (!models.length) return null;

  return (
    <Section title="Model detections">
      <div className="grid gap-2 sm:grid-cols-2">
        {models.map((model) => (
          <ModelCard key={model.detector} model={model} />
        ))}
      </div>
    </Section>
  );
}

const CONTEXT_FIELDS = [
  ["senderTxCount24h", "Sender txns (24h)"],
  ["senderSum24h", "Sender sum (24h)"],
  ["senderSumLast5", "Sender sum (last 5)"],
  ["senderUniqueBeneficiariesDay", "Unique beneficiaries (day)"],
  ["beneficiaryTxCount24h", "Beneficiary txns (24h)"],
  ["beneficiaryUniqueSendersDay", "Unique senders to beneficiary (day)"],
  ["senderTxCount30d", "Sender txns (30d)"],
  ["senderAmountZscore30d", "Amount z-score (30d)"],
  ["amountPctChangePrev", "Change vs previous (%)"],
  ["txFreqChangePct", "Frequency change (%)"],
  ["structuringCount24h", "Structuring count (24h)"],
  ["passThroughRatio", "Pass-through ratio"],
];

export function CollectiveContext({ context }) {
  if (!context) return null;
  const rows = CONTEXT_FIELDS.filter(([key]) => context[key] != null);
  if (!rows.length) return null;

  return (
    <Section title="Collective context">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
        {rows.map(([key, label]) => (
          <div key={key}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums text-heading">{formatValue(context[key])}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
