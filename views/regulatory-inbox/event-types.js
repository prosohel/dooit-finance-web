/**
 * What each exchange event means to the reporting organisation and what it
 * can do about it. One entry per event type AFC OS / BFIU sends to a portal
 * (plans/integration/03 §4, the design's ten data contracts). Types not
 * listed are shown as plain notifications.
 *
 *   action   — the reply the RO can produce from this event (see ACTIONS)
 *   subjectOf(payload) — the regulator's reference shown in the list
 */
export const EVENT_TYPES = {
  // MLTFPD — requests and notices (RegulatoryRequest kinds: `${kind}.issued`)
  "rfi.issued": { label: "Request for information", from: "Bangladesh Bank · MLTFPD", tone: "action", action: "rfi.respond", subjectOf: (p) => p.rfi_number },
  "clarification.issued": { label: "Clarification request", from: "Bangladesh Bank · MLTFPD", tone: "action", action: "rfi.respond", subjectOf: (p) => p.rfi_number },
  "inspection_notice.issued": { label: "Inspection notice", from: "Bangladesh Bank · MLTFPD", tone: "action", action: "inspection.acknowledge", subjectOf: (p) => p.rfi_number },
  "inspection_report.issued": { label: "Inspection report", from: "Bangladesh Bank · MLTFPD", tone: "info", subjectOf: (p) => p.rfi_number },
  "finding.issued": { label: "Supervisory finding", from: "Bangladesh Bank · MLTFPD", tone: "action", subjectOf: (p) => p.rfi_number },
  "show_cause.issued": { label: "Show-cause notice", from: "Bangladesh Bank · MLTFPD", tone: "action", action: "penalty.respond", subjectOf: (p) => p.rfi_number },
  "follow_up.issued": { label: "Follow-up request", from: "Bangladesh Bank · MLTFPD", tone: "action", action: "rfi.respond", subjectOf: (p) => p.rfi_number },

  // Inspections
  "inspection.noticed": { label: "Inspection notice", from: "Bangladesh Bank · MLTFPD", tone: "action", action: "inspection.acknowledge", subjectOf: (p) => p.inspection },
  "inspection.report_issued": { label: "Inspection report issued", from: "Bangladesh Bank · MLTFPD", tone: "action", subjectOf: (p) => p.inspection },

  // Circulars (published is a broadcast to every portal)
  "circular.published": { label: "Circular published", from: "Bangladesh Bank · MLTFPD", tone: "action", action: "circular.acknowledge", subjectOf: (p) => p.circular_number },
  "circular.reminder": { label: "Circular acknowledgement overdue", from: "Bangladesh Bank · MLTFPD", tone: "urgent", action: "circular.acknowledge", subjectOf: (p) => p.circular_number },

  // Remediation
  "remediation.plan_approved": { label: "Remediation plan approved", from: "Bangladesh Bank · MLTFPD", tone: "info", action: "remediation.evidence", subjectOf: (p) => p.plan },
  "remediation.revision_requested": { label: "Remediation plan — revision requested", from: "Bangladesh Bank · MLTFPD", tone: "action", action: "remediation.plan", subjectOf: (p) => p.plan },
  "remediation.evidence_accepted": { label: "Remediation evidence accepted", from: "Bangladesh Bank · MLTFPD", tone: "info", action: "remediation.evidence", subjectOf: (p) => p.plan },
  "remediation.evidence_rejected": { label: "Remediation evidence rejected", from: "Bangladesh Bank · MLTFPD", tone: "action", action: "remediation.evidence", subjectOf: (p) => p.plan },
  "remediation.closed": { label: "Remediation plan closed", from: "Bangladesh Bank · MLTFPD", tone: "info", subjectOf: (p) => p.plan },
  "remediation.escalated": { label: "Remediation escalated to the Director", from: "Bangladesh Bank · MLTFPD", tone: "urgent", action: "remediation.evidence", subjectOf: (p) => p.plan },

  // Penalties
  "penalty.show_cause_issued": { label: "Show-cause notice", from: "Bangladesh Bank · MLTFPD", tone: "urgent", action: "penalty.respond", subjectOf: (p) => p.case },
  "penalty.decided": { label: "Penalty decision", from: "Bangladesh Bank · MLTFPD", tone: "action", action: "penalty.appeal", subjectOf: (p) => p.case },

  // BFIU freezing orders
  "freeze.issued": { label: "Freezing order", from: "BFIU", tone: "urgent", action: "freeze.execute", subjectOf: (p) => p.order_number },
  "freeze.extended": { label: "Freezing order extended", from: "BFIU", tone: "info", subjectOf: (p) => p.order_number },
  "freeze.released": { label: "Freezing order released", from: "BFIU", tone: "info", subjectOf: (p) => p.order_number },

  // EWRA / submissions
  "ewra.review_decided": { label: "EWRA review decision", from: "Bangladesh Bank · MLTFPD", tone: "info", subjectOf: (p) => p.review },
  "submission.received": { label: "Document uploaded on your behalf", from: "Bangladesh Bank · MLTFPD", tone: "info", subjectOf: (p) => p.submission_id },
  "submission.analysed": { label: "Document analysis ready", from: "AFC OS", tone: "info", subjectOf: (p) => p.submission_id },
  "submission.failed": { label: "Document analysis failed", from: "AFC OS", tone: "action", subjectOf: (p) => p.submission_id },

  // Receipts on events this tenant produced
  "receipt.delivered": { label: "Delivered to the regulator", from: "Exchange", tone: "receipt", subjectOf: (p) => p.subject?.uid },
  "receipt.read": { label: "Read by the regulator", from: "Exchange", tone: "receipt", subjectOf: (p) => p.subject?.uid },
  "receipt.acknowledged": { label: "Acknowledged by the regulator", from: "Exchange", tone: "receipt", subjectOf: (p) => p.subject?.uid },
};

export function describeEvent(ev) {
  const t = EVENT_TYPES[ev.type] ?? { label: ev.type, from: ev.from?.app === "bfiu" ? "BFIU" : "AFC OS", tone: "info", subjectOf: () => null };
  const subject = t.subjectOf?.(ev.payload ?? {}) ?? ev.subject?.uid ?? null;
  return { ...t, subject };
}

/**
 * Replies the RO can send. `build(ev, form)` returns the event to produce:
 * { type, to, subject, payload }. Field shapes follow the AFC OS handlers
 * (api_afc_os/services/exchange/handlers.js) so the officer's screen updates
 * the moment the worker runs.
 */
export const ACTIONS = {
  "rfi.respond": {
    title: "Respond to the request",
    submit: "Send response to MLTFPD",
    fields: ["text", "items", "attachments"],
    build: (ev, f) => ({
      type: "rfi.responded",
      to: "afcos",
      subject: { kind: "RegulatoryRequest", uid: ev.payload.rfi_number },
      payload: { rfi_number: ev.payload.rfi_number, response_text: f.text, items_answered: f.items, attachments: f.attachments, by: f.by },
    }),
  },
  "circular.acknowledge": {
    title: "Acknowledge the circular",
    submit: "Acknowledge receipt",
    fields: ["note", "attachments"],
    note: "Acknowledgement is due within 14 days of publication. Attach implementation evidence when you have it; the officer accepts it on their side.",
    build: (ev, f) => ({
      type: f.attachments?.length ? "circular.evidence" : "circular.acknowledged",
      to: "afcos",
      // `circular` is the register uid (CIR-…) from the event's subject — unique even when numbers repeat across years.
      subject: { kind: "Circular", uid: ev.subject?.uid ?? ev.payload.circular_number },
      payload: { circular: ev.subject?.uid ?? null, circular_number: ev.payload.circular_number, by: f.by, at: new Date().toISOString(), note: f.note, evidence_documents: f.attachments },
    }),
  },
  "inspection.acknowledge": {
    title: "Acknowledge the inspection notice",
    submit: "Acknowledge notice",
    fields: ["note"],
    build: (ev, f) => ({
      type: "inspection.acknowledged",
      to: "afcos",
      subject: { kind: "Inspection", uid: ev.payload.inspection ?? ev.payload.rfi_number },
      payload: { inspection_id: ev.payload.inspection ?? ev.payload.rfi_number, by: f.by, note: f.note },
    }),
  },
  "remediation.plan": {
    title: "Submit the remediation plan",
    submit: "Submit plan",
    fields: ["milestones", "note"],
    note: "One line per milestone: finding · action · owner · due date (YYYY-MM-DD).",
    build: (ev, f) => ({
      type: "remediation.plan",
      to: "afcos",
      subject: { kind: "RemediationPlan", uid: ev.payload.plan },
      payload: { plan_id: ev.payload.plan, milestones: f.milestones, by: f.by, note: f.note },
    }),
  },
  "remediation.evidence": {
    title: "Submit remediation evidence",
    submit: "Submit evidence",
    fields: ["milestone", "note", "attachments"],
    build: (ev, f) => ({
      type: "remediation.evidence",
      to: "afcos",
      subject: { kind: "RemediationPlan", uid: ev.payload.plan },
      payload: { plan_id: ev.payload.plan, milestone: f.milestone, evidence_documents: f.attachments, note: f.note, by: f.by },
    }),
  },
  "penalty.respond": {
    title: "Respond to the show-cause notice",
    submit: "Send response",
    fields: ["text", "attachments"],
    build: (ev, f) => ({
      type: "penalty.response",
      to: "afcos",
      subject: { kind: "PenaltyCase", uid: ev.payload.case ?? ev.payload.rfi_number },
      payload: { case: ev.payload.case ?? ev.payload.rfi_number, response_text: f.text, summary: f.text.slice(0, 400), attachments: f.attachments, by: f.by },
    }),
  },
  "penalty.appeal": {
    title: "Lodge an appeal",
    submit: "Lodge appeal",
    fields: ["text", "attachments"],
    note: "State the grounds. The appeal is recorded on the penalty case and reviewed by the Director.",
    build: (ev, f) => ({
      type: "penalty.appeal",
      to: "afcos",
      subject: { kind: "PenaltyCase", uid: ev.payload.case },
      payload: { case: ev.payload.case, grounds: f.text, attachments: f.attachments, by: f.by },
    }),
  },
  "freeze.execute": {
    title: "Confirm execution of the freezing order",
    submit: "Confirm accounts frozen",
    fields: ["accountsFrozen", "balanceAtFreeze", "note"],
    note: "Execution must be confirmed within the order's target window. Account holder names never travel over the exchange.",
    build: (ev, f) => ({
      type: "freeze.executed",
      to: "bfiu",
      subject: { kind: "FreezingOrder", uid: ev.payload.order_number },
      payload: { order_number: ev.payload.order_number, accounts_frozen: Number(f.accountsFrozen), balance_at_freeze: f.balanceAtFreeze ? Number(f.balanceAtFreeze) : null, note: f.note, by: f.by },
    }),
  },
};
