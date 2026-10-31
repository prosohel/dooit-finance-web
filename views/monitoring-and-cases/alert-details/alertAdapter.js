// views/monitoring-and-cases/alert-details/alertAdapter.js
//
// Shapes the raw `GET /alert/:id` document for the alert-details tabs.
// Contract (same as case-manager's caseAdapter): nothing is invented — a
// field with no backend source resolves to null / [] so the section that
// shows it falls through to its own empty state. Every path read here exists
// on the Alert / Customer / Transaction / RuleEngine / Case models.

const idOf = (ref) => (ref && typeof ref === "object" ? ref._id : ref) || null;
const isObj = (v) => v && typeof v === "object";
const str = (v) => (v === undefined || v === null || v === "" ? null : String(v));
const num = (v) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

// ── vocab used by the tabs ───────────────────────────────────────────────────

export const ALERT_STATUS = {
  new: { label: "New", variant: "info" },
  under_review: { label: "Under review", variant: "warning" },
  escalated_to_case: { label: "Escalated to case", variant: "danger" },
  dismissed: { label: "Dismissed", variant: "muted" },
  false_positive: { label: "False positive", variant: "success" },
};
export const CLOSED_STATUSES = ["dismissed", "false_positive", "escalated_to_case"];

export const PRIORITY = {
  critical: { label: "Critical priority", variant: "danger" },
  high: { label: "High priority", variant: "warning" },
  medium: { label: "Medium priority", variant: "info" },
  low: { label: "Low priority", variant: "outline" },
};

export const RISK_LABEL = {
  Critical: "danger",
  High: "danger",
  Medium: "warning",
  Low: "success",
  Info: "muted",
};

export const CASE_STATUS = {
  open: { label: "Open", variant: "info" },
  under_investigation: { label: "Under investigation", variant: "warning" },
  pending_review: { label: "Pending review", variant: "outline" },
  closed: { label: "Closed", variant: "success" },
  escalated: { label: "Escalated", variant: "danger" },
};

export const KYC_STATUS = {
  pending: { label: "Pending", variant: "muted" },
  in_review: { label: "In review", variant: "warning" },
  verified: { label: "Verified", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

export const AML_STATUS = {
  pending: { label: "Pending", variant: "muted" },
  clear: { label: "Clear", variant: "success" },
  flagged: { label: "Flagged", variant: "danger" },
  yellow: { label: "Needs review", variant: "warning" },
};

export const TXN_STATUS = {
  pending: "warning",
  completed: "success",
  failed: "danger",
  cancelled: "muted",
};

export const humanize = (s) =>
  s === undefined || s === null || s === ""
    ? null
    : String(s).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const riskLabelFromScore = (score) => {
  if (score === null || score === undefined) return null;
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  return "Low";
};

export const ageFrom = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86400e3));
};

// ── customer ─────────────────────────────────────────────────────────────────

const MASK = "***"; // roleEncryptionPlugin masks restricted fields for callers without the grant
const unmask = (v) => (v === MASK ? null : str(v));

export function adaptCustomer(c) {
  if (!isObj(c)) return null;
  const pf = c.personalKyc?.personal_form || {};
  const cd = pf.customer_details || {};
  const contact = pf.contact_details || {};
  const emp = pf.employment_details || {};
  const addr = pf.residential_address || {};
  const mail = pf.mailing_address || {};
  const fw = c.personalKyc?.funds_wealth || {};
  const sole = c.personalKyc?.sole_trader || {};
  const user = isObj(c.user) ? c.user : null;

  const kycName = [unmask(cd.given_name), unmask(cd.middle_name), unmask(cd.surname)].filter(Boolean).join(" ");
  const name = kycName || user?.name || null;
  const initials = name
    ? name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
    : "?";

  const fmtAddr = (a) => [a.address, a.suburb, a.state, a.postcode, a.country].filter(Boolean).join(", ") || null;

  // relations[] — the earliest registration is "customer since"
  const relations = Array.isArray(c.relations) ? c.relations : [];
  const primaryRel = relations.find((r) => r?.active) || relations[0] || null;
  const since = relations.map((r) => r?.registeredAt).filter(Boolean).sort()[0] || c.createdAt || null;

  // Risk virtuals — riskAssessment is a map of factor → { value, score }
  const factors = [];
  if (isObj(c.riskAssessment)) {
    for (const [key, v] of Object.entries(c.riskAssessment)) {
      if (isObj(v) && (typeof v.score === "number" || typeof v.value === "string")) {
        factors.push({ key, label: humanize(key), value: str(v.value), score: num(v.score) });
      }
    }
  }

  return {
    id: idOf(c),
    uid: str(c.uid),
    name,
    initials,
    email: unmask(contact.email) || user?.email || null,
    phone: unmask(contact.phone),
    photoUrl: user?.photoUrl || user?.avatar || null,
    dob: cd.date_of_birth || null,
    age: ageFrom(cd.date_of_birth),
    country: str(c.country) || str(addr.country),
    identificationNo: unmask(pf.identificationNo),
    residentialAddress: fmtAddr(addr),
    mailingAddress: fmtAddr(mail),
    occupation: str(emp.occupation),
    industry: str(emp.industry),
    employer: str(emp.employer_name),
    sourceOfFunds: str(fw.source_of_funds),
    sourceOfWealth: str(fw.source_of_wealth),
    accountPurpose: str(fw.account_purpose),
    tradingVolume: str(fw.estimated_trading_volume),
    soleTrader: sole.is_sole_trader ? sole.business_details?.business_name || "Yes" : null,
    kycStatus: str(c.kycStatus),
    kycVerifiedAt: c.kycVerifiedAt || null,
    kycRejectReason: str(c.kycRejectReason),
    isPep: !!c.isPep,
    sanction: !!c.sanction,
    amlStatus: str(c.amlStatus),
    amlLabels: Array.isArray(c.amlRiskLabels) ? c.amlRiskLabels : [],
    amlHits: Array.isArray(c.amlHits) ? c.amlHits.length : 0,
    amlCheckedAt: c.amlCheckedAt || null,
    amlVendor: str(c.amlVendor),
    consentToScreen: c.consentToScreen ?? null,
    riskScore: num(c.riskScore),
    riskLabel: str(c.riskLabel) || riskLabelFromScore(num(c.riskScore)),
    riskFactors: factors,
    documents: (Array.isArray(c.documents) ? c.documents : []).map((d) => ({
      name: str(d.name),
      url: str(d.url),
      type: str(d.docType) || str(d.type),
      uploadedAt: d.uploadedAt || null,
    })),
    relation: primaryRel
      ? { type: str(primaryRel.type), channel: str(primaryRel.onboardingChannel), active: !!primaryRel.active }
      : null,
    since,
    status: str(c.status),
    isActive: c.isActive ?? null,
    signals: Array.isArray(c.signals) ? c.signals : [],
  };
}

// ── transaction ──────────────────────────────────────────────────────────────

const PARTY_ROLES = ["sender", "receiver", "beneficiary", "intermediary"];

function adaptParty(role, p) {
  if (!isObj(p)) return null;
  const cust = isObj(p.customer) ? adaptCustomer(p.customer) : null;
  const name = str(p.name) || cust?.name || null;
  if (!name && !p.account && !p.institution && !cust) return null;
  return {
    role,
    name,
    account: str(p.account),
    institution: str(p.institution),
    country: str(p.institutionCountry),
    bic: str(p.bic),
    address: str(p.address),
    customerId: cust?.id || idOf(p.customer),
    customerUid: cust?.uid || null,
  };
}

const hasValues = (o) => isObj(o) && Object.values(o).some((v) => v !== undefined && v !== null && v !== "");

export function adaptTransaction(t) {
  if (!isObj(t)) return null;
  const parties = PARTY_ROLES.map((r) => adaptParty(r, t[r])).filter(Boolean);
  return {
    id: idOf(t),
    uid: str(t.uid),
    amount: num(t.amount),
    currency: str(t.currency),
    amountAUD: num(t.convertedAmountAUD),
    type: str(t.type),
    subtype: str(t.subtype),
    channel: str(t.channel),
    status: str(t.status),
    timestamp: t.timestamp || t.createdAt || null,
    reference: str(t.reference),
    narrative: str(t.narrative),
    purpose: str(t.purpose),
    remittanceCode: str(t.remittancePurposeCode),
    riskScore: num(t.riskScore),
    riskFlags: Array.isArray(t.riskFlags) ? t.riskFlags : [],
    signals: Array.isArray(t.signals) ? t.signals : [],
    parties,
    crypto: hasValues(t.crypto) ? t.crypto : null,
    travelRule: hasValues(t.travelRule) ? t.travelRule : null,
    bullion: hasValues(t.bullion) ? t.bullion : null,
    forensic: hasValues(t.forensic) ? t.forensic : null,
    relatedPartyFlag: !!t.relatedPartyFlag,
    relatedPartyTxnId: str(t.relatedPartyTxnId),
    investigation: isObj(t.investigation)
      ? { caseId: idOf(t.investigation.case), caseUid: str(t.investigation.caseId), flagged: !!t.investigation.flagged, notes: str(t.investigation.investigatorNotes) }
      : null,
    evaluation: isObj(t.evaluation) ? t.evaluation : null,
  };
}

// ── rule / meta ──────────────────────────────────────────────────────────────

function adaptRule(r, alert) {
  // ruleRef may be unpopulated (deleted rule) — fall back to the snapshot on the alert
  if (!isObj(r)) {
    if (!alert.ruleId && !alert.ruleName) return null;
    return { id: idOf(alert.ruleRef), ruleId: str(alert.ruleId), ruleName: str(alert.ruleName), version: num(alert.ruleVersion), deleted: true };
  }
  return {
    id: idOf(r),
    ruleId: str(r.ruleId) || str(alert.ruleId),
    ruleName: str(r.ruleName) || str(alert.ruleName),
    version: num(alert.ruleVersion) ?? num(r.version),
    currentVersion: num(r.version),
    engine: str(r.engine),
    appliesTo: str(r.appliesTo),
    condition: str(r.ruleCondition),
    description: str(r.descriptiveExplanation),
    mainDomain: str(r.mainDomain),
    subdomain: str(r.ruleDomainSubdomain),
    category: str(r.category),
    caseType: str(r.caseType),
    riskScore: num(r.riskScore),
    riskLabel: str(r.riskLabel),
    status: str(r.status),
    hitCount: num(r.hitCount),
    lastFiredAt: r.lastFiredAt || null,
    cooldownMinutes: num(r.cooldownMinutes),
    dedupeBy: str(r.dedupeBy),
    slaHours: num(r.slaHours),
    actions: Array.isArray(r.actions) ? r.actions.map((a) => a?.type).filter(Boolean) : [],
    deleted: false,
  };
}

function adaptRuleMeta(m) {
  if (!isObj(m)) return null;
  const leaf = (l) => ({
    field: str(l?.field),
    operator: str(l?.operator),
    expected: l?.expected === undefined ? null : String(l.expected),
    actual: l?.actual === undefined ? null : Array.isArray(l.actual) ? l.actual.join(", ") : String(l.actual),
    found: l?.found ?? null,
    pass: !!l?.pass,
  });
  return {
    source: str(m.source),
    engine: str(m.engine),
    matched: Array.isArray(m.matched) ? m.matched.map(leaf) : [],
    missed: Array.isArray(m.missed) ? m.missed.map(leaf) : [],
    fieldMisses: Array.isArray(m.fieldMisses) ? m.fieldMisses : [],
    logic: m.logic ?? null,
    dsl: str(m.dsl),
    description: str(m.description),
    mainDomain: str(m.mainDomain),
    pendingActions: Array.isArray(m.pendingActions) ? m.pendingActions : [],
    evaluatedAt: m.evaluatedAt || null,
    // seedCaseWorkflow-era alerts carry {threshold, lookbackHours, matched: string}
    legacy: typeof m.matched === "string" ? m : null,
  };
}

// ── alert ────────────────────────────────────────────────────────────────────

export function adaptAlert(a) {
  if (!isObj(a)) return null;
  const analyst = isObj(a.analyst) ? { id: idOf(a.analyst), name: str(a.analyst.name), email: str(a.analyst.email) } : null;
  const linkedCase = isObj(a.linkedCase)
    ? {
        id: idOf(a.linkedCase),
        uid: str(a.linkedCase.uid),
        title: str(a.linkedCase.title),
        status: str(a.linkedCase.status),
        priority: str(a.linkedCase.priority),
        caseType: str(a.linkedCase.caseType),
        assignedTo: isObj(a.linkedCase.assignedTo) ? str(a.linkedCase.assignedTo.name) : null,
      }
    : idOf(a.linkedCase)
      ? { id: idOf(a.linkedCase), uid: null, title: null, status: null }
      : null;

  const activity = Array.isArray(a.activity) ? a.activity : [];
  const entry = (e) => ({
    type: str(e.type) || "activity",
    title: str(e.title),
    message: str(e.message),
    by: isObj(e.createdBy) ? str(e.createdBy.name) : null,
    byId: idOf(e.createdBy),
    at: e.createdAt || null,
  });
  const timeline = activity.map(entry).sort((x, y) => new Date(y.at || 0) - new Date(x.at || 0));

  const embeddedAudit = (Array.isArray(a.auditLogs) ? a.auditLogs : []).map((l) => ({
    action: str(l.action),
    by: isObj(l.performedBy) ? str(l.performedBy.name) : null,
    at: l.timestamp || null,
    oldValue: l.oldValue ?? null,
    newValue: l.newValue ?? null,
    remark: str(l.remark),
    source: "alert",
  }));

  const status = str(a.status) || "new";
  return {
    id: idOf(a),
    uid: str(a.uid),
    status,
    statusMeta: ALERT_STATUS[status] || { label: humanize(status), variant: "outline" },
    isClosed: CLOSED_STATUSES.includes(status),
    statusReason: str(a.statusReason),
    closedAt: a.closedAt || null,
    priority: str(a.priority) || "medium",
    caseType: str(a.caseType),
    origin: str(a.alertOrigin),
    riskScore: num(a.riskScore),
    riskLabel: str(a.riskLabel),
    explanation: str(a.explanation),
    slaDeadline: a.slaDeadline || null,
    slaStatus: str(a.slaStatus),
    isOverdue: !!a.isOverdue,
    deduplicationKey: str(a.deduplicationKey),
    createdAt: a.createdAt || null,
    updatedAt: a.updatedAt || null,
    createdBy: idOf(a.createdBy),
    client: idOf(a.client),
    branch: idOf(a.branch),
    analyst,
    rule: adaptRule(a.ruleRef, a),
    ruleMeta: adaptRuleMeta(a.ruleMeta),
    customer: adaptCustomer(a.customer),
    transaction: adaptTransaction(a.transaction),
    linkedCase,
    notify: isObj(a.notify) ? { id: idOf(a.notify), uid: str(a.notify.uid), status: str(a.notify.status), notes: str(a.notify.notes), at: a.notify.createdAt || null } : null,
    timeline: timeline.filter((e) => e.type !== "note"),
    notes: timeline.filter((e) => e.type === "note"),
    embeddedAudit,
    metadata: isObj(a.metadata) ? a.metadata : {},
  };
}

/** GET /alert/:id/audit rows → the same shape as embeddedAudit. */
export function adaptAuditRows(rows = []) {
  return rows.map((l) => ({
    action: str(l.action),
    by: str(l.user?.name) || str(l.actor?.name) || str(l.actorName),
    at: l.createdAt || l.timestamp || null,
    oldValue: l.beforeValue ?? null,
    newValue: l.afterValue ?? null,
    remark: str(l.details),
    source: "audit",
  }));
}

/** Merge embedded + collection audit rows, dedupe same action within 2s, newest first. */
export function mergeAudit(embedded = [], collection = []) {
  const all = [...collection, ...embedded];
  const seen = [];
  const out = [];
  for (const row of all.sort((x, y) => new Date(y.at || 0) - new Date(x.at || 0))) {
    const t = new Date(row.at || 0).getTime();
    const dup = seen.find((s) => s.action === row.action && Math.abs(s.t - t) < 2000);
    if (dup) continue;
    seen.push({ action: row.action, t });
    out.push(row);
  }
  return out;
}
