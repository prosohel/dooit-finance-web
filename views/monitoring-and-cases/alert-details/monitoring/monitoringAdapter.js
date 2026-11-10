// views/monitoring-and-cases/alert-details/monitoring/monitoringAdapter.js
//
// Shapes `alert.monitoringResult` (AI-based alerts only) for the Overview tab.
// Same contract as alertAdapter: nothing is invented — a missing value
// resolves to null and the UI skips it. Internal fields (ruleRef,
// resolvedField paths, engine/source/logicSource, pipeline, subjectKey…) are
// read only to build labels and links, never passed to the UI.

// Local copy of alertAdapter's humanize — importing it would make the two
// adapters import each other.
const humanize = (s) =>
  s === undefined || s === null || s === ""
    ? null
    : String(s).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const str = (v) => (v === undefined || v === null || v === "" ? null : String(v));
const num = (v) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const MINUS = "−";

// ── formatting ──────────────────────────────────────────────────────────────

const fixed = (n, digits = 2) =>
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const signed = (n, digits = 2) => `${n < 0 ? MINUS : n > 0 ? "+" : ""}${fixed(n, digits)}`;

function formatDuration(secs) {
  const s = Math.round(secs);
  if (s < 60) return `${s}s`;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return h ? `${d}d ${h}h` : `${d}d`;
  if (h) return m ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/** Format a value by the kind of metric it is. `currency` only applies to money. */
export function formatValue(kind, value, currency) {
  const n = num(value);
  if (n === null) return value === undefined || value === null || value === "" ? null : String(value);
  switch (kind) {
    case "ratio":
      return `${fixed(n * 100)}%`;
    case "money":
      return `${currency ? `${currency} ` : ""}${fixed(n)}`;
    case "pctChange":
      return `${signed(n)}%`;
    case "percent":
      return `${fixed(n)}%`;
    case "duration":
      return formatDuration(n);
    case "zscore":
      return signed(n);
    case "count":
      return Math.round(n).toLocaleString("en-US");
    default:
      return Number.isInteger(n) ? n.toLocaleString("en-US") : fixed(n);
  }
}

// ── metric catalogue ────────────────────────────────────────────────────────
// key = the derived field name the rule engine uses (derived.<key>),
// ctx = the matching key on collectiveContext. Unknown fields still render,
// labelled from their name, so new engine fields don't disappear.

const METRICS = {
  sender_tx_count_24h: { ctx: "senderTxCount24h", label: "Transactions (24h)", kind: "count" },
  sender_sum_24h: { ctx: "senderSum24h", label: "Sender volume (24h)", kind: "money" },
  pass_through_ratio: { ctx: "passThroughRatio", label: "Pass-through ratio", kind: "ratio" },
  amount_pct_change_prev: { ctx: "amountPctChangePrev", label: "Amount vs previous", kind: "pctChange" },
  sender_tx_count_30d: { ctx: "senderTxCount30d", label: "Transactions (30 days)", kind: "count" },
  tx_freq_change_pct: { ctx: "txFreqChangePct", label: "Frequency change", kind: "pctChange" },
  sender_unique_beneficiaries_day: { ctx: "senderUniqueBeneficiariesDay", label: "Unique beneficiaries", kind: "count" },
  beneficiary_tx_count_24h: { ctx: "beneficiaryTxCount24h", label: "Beneficiary transactions (24h)", kind: "count" },
  beneficiary_unique_senders_day: { ctx: "beneficiaryUniqueSendersDay", label: "Unique senders to beneficiary", kind: "count" },
  sender_sum_last5: { ctx: "senderSumLast5", label: "Last 5 transactions total", kind: "money" },
  structuring_count_24h: { ctx: "structuringCount24h", label: "Structuring count (24h)", kind: "count" },
  secs_since_prev_sender_tx: { ctx: "secsSincePrevSenderTx", label: "Time since previous transaction", kind: "duration" },
  sender_amount_zscore_30d: { ctx: "senderAmountZscore30d", label: "30-day amount z-score", kind: "zscore" },
};

// Which metrics go where in Behavioral Analysis. Order = display order.
export const BEHAVIOR_GROUPS = [
  { id: "activity", title: "Last 24 hours", keys: ["sender_tx_count_24h", "sender_sum_24h", "sender_unique_beneficiaries_day"] },
  { id: "shift", title: "Change vs baseline", keys: ["amount_pct_change_prev", "tx_freq_change_pct", "sender_tx_count_30d"] },
  { id: "flow", title: "Money flow", keys: ["pass_through_ratio"] },
];
export const SECONDARY_METRICS = [
  "beneficiary_tx_count_24h",
  "beneficiary_unique_senders_day",
  "sender_sum_last5",
  "structuring_count_24h",
  "secs_since_prev_sender_tx",
  "sender_amount_zscore_30d",
];

const fieldKey = (path) => (path ? String(path).replace(/^derived\./, "") : null);
const looksLikePath = (s) => /[._]/.test(s) && !/\s/.test(s);

function metricMeta(key) {
  return METRICS[key] || { label: humanize(key?.split(".").pop()) || "Field", kind: "number" };
}

// ── rules ───────────────────────────────────────────────────────────────────

const OPERATORS = { gte: "≥", gt: ">", lte: "≤", lt: "<", eq: "=", neq: "≠", ne: "≠", in: "in", contains: "contains" };

function adaptCondition(c, currency, i) {
  const key = fieldKey(c?.resolvedField) || fieldKey(c?.field);
  const meta = metricMeta(key);
  // Rules authored in natural language carry a readable `field`; prefer it
  // unless the catalogue knows the metric or the field is a raw path.
  const human = str(c?.field) && !looksLikePath(c.field) ? c.field : null;
  const op = OPERATORS[c?.operator] || str(c?.operator);
  // A numeric threshold is formatted like the metric; a string one
  // ("50% vs previous") is the rule author's own wording, shown as-is.
  // Thresholds are round numbers, so drop a trailing ".00" (≥ 80%, not ≥ 80.00%).
  const expectedText =
    typeof c?.expected === "number"
      ? formatValue(meta.kind, c.expected, currency)?.replace(/\.00(?=%|$)/, "")
      : str(c?.expected);
  return {
    id: `${key || "field"}-${i}`,
    key,
    label: METRICS[key]?.label || human || meta.label,
    expected: expectedText ? [op, expectedText].filter(Boolean).join(" ") : null,
    actual: formatValue(meta.kind, c?.actual, currency),
    threshold: typeof c?.expected === "number" ? c.expected : null,
  };
}

function adaptRuleHit(r, currency, i) {
  const score = num(r.riskScore);
  return {
    id: str(r.ruleId) || `rule-${i}`,
    ruleId: str(r.ruleId),
    name: humanize(r.ruleName) || str(r.ruleId) || "Unnamed rule",
    version: num(r.ruleVersion),
    caseType: str(r.caseType),
    typology: str(r.domain),
    category: str(r.mainDomain),
    severity: str(r.riskLabel),
    score,
    explanation: str(r.explanation),
    conditionSummary: str(r.conditionSummary),
    conditions: (Array.isArray(r.matchedConditions) ? r.matchedConditions : []).map((c, j) => adaptCondition(c, currency, j)),
  };
}

/** Primary = the rule named in the first reason, else the highest-scoring. */
function pickPrimary(rules, mr) {
  const ref = str(mr.reasons?.[0]?.ref);
  const reason = str(mr.overall?.primaryReason) || "";
  const byRef = rules.find((r) => r.ruleId && (r.ruleId === ref || reason.includes(`Rule ${r.ruleId} `)));
  if (byRef) return byRef.id;
  const top = [...rules].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];
  return top?.id ?? null;
}

// ── entry point ─────────────────────────────────────────────────────────────

export function adaptMonitoringResult(mr) {
  if (!isObj(mr)) return null;
  const currency = str(mr.transaction?.currency);
  const ctx = isObj(mr.collectiveContext) ? mr.collectiveContext : {};

  const hits = (Array.isArray(mr.ruleHits) ? mr.ruleHits : []).filter(isObj).map((r, i) => adaptRuleHit(r, currency, i));
  const primaryId = pickPrimary(hits, mr);
  const rules = hits
    .map((r) => ({ ...r, isPrimary: r.id === primaryId }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || (b.score ?? -1) - (a.score ?? -1));

  // Fields that fed a triggered rule, and the numeric thresholds they crossed.
  const triggered = new Set(
    [
      ...(Array.isArray(mr.triggeredFields) ? mr.triggeredFields.map((f) => fieldKey(f?.field)) : []),
      ...rules.flatMap((r) => r.conditions.map((c) => c.key)),
    ].filter(Boolean),
  );
  const thresholds = {};
  for (const r of rules) for (const c of r.conditions) if (c.key && c.threshold !== null) thresholds[c.key] ??= c.threshold;

  const metric = (key) => {
    const meta = METRICS[key];
    const raw = num(ctx[meta.ctx]);
    if (raw === null) return null;
    return {
      key,
      label: meta.label,
      kind: meta.kind,
      raw,
      value: formatValue(meta.kind, raw, currency),
      triggered: triggered.has(key),
      threshold: thresholds[key] ?? null,
    };
  };

  const groups = BEHAVIOR_GROUPS.map((g) => ({ ...g, metrics: g.keys.map(metric).filter(Boolean) })).filter((g) => g.metrics.length);
  const secondary = SECONDARY_METRICS.map(metric).filter(Boolean);

  const overall = isObj(mr.overall) ? mr.overall : {};
  return {
    rules,
    summary: {
      matched: num(mr.ruleHitCount) ?? rules.length,
      evaluated: num(mr.pipeline?.rulesEvaluated),
      detectedBy: (Array.isArray(overall.detectedBy) ? overall.detectedBy : []).map((d) => (d === "rule" ? "Rule engine" : humanize(d))),
      detectedAt: mr.detectedAt || mr.createdAt || null,
    },
    behavior: {
      groups,
      secondary,
      window: isObj(mr.window) && mr.window.start && mr.window.end ? { start: mr.window.start, end: mr.window.end } : null,
    },
  };
}
