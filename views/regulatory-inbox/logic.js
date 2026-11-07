/**
 * Regulatory Inbox and Uploads: the rules, with no React in them.
 *
 * The two screens (index.jsx, uploads.jsx) only render; everything that
 * decides something lives here so it can be tested in plain Node
 * (`npm test`, see __tests__/). Keep this file free of JSX and browser APIs.
 */
import { describeEvent } from "./event-types";

const DAY = 86_400_000;

// ── Inbox ─────────────────────────────────────────────────────────────────────

/** Whole days until `d` (negative = overdue), or null when there is no date. */
export const daysLeft = (d, now = Date.now()) => (d ? Math.ceil((new Date(d).getTime() - now) / DAY) : null);

/** Which payload field is the deadline, per event family. */
export const deadlineOf = (ev) => ev.payload?.deadline_date ?? ev.payload?.respond_by ?? ev.payload?.acknowledge_by ?? ev.payload?.acknowledge_due_at ?? ev.payload?.payment_due ?? ev.payload?.expiry ?? null;

/** True while the RO still owes a reply: the event has an action and has not been acknowledged. */
export const isOpen = (ev, meta) => !!meta.action && ev.status !== "acknowledged";

/** An event is unread until the RO opens it. */
export const isUnread = (ev) => ev.status === "delivered" || ev.status === "queued";

/** Rows for one tab: "open" (needs a reply), "all" (every message), "receipts" (delivery receipts only). */
export function filterInbox(events, filter) {
  return (events ?? [])
    .map((ev) => ({ ev, meta: describeEvent(ev) }))
    .filter(({ ev, meta }) => {
      if (filter === "receipts") return meta.tone === "receipt";
      if (meta.tone === "receipt") return false;
      if (filter === "open") return isOpen(ev, meta);
      return true;
    });
}

/** The four numbers in the inbox header. */
export function countInbox(events, now = Date.now()) {
  const all = (events ?? []).map((ev) => ({ ev, meta: describeEvent(ev) }));
  const overdue = ({ ev, meta }) => {
    const left = daysLeft(deadlineOf(ev), now);
    return isOpen(ev, meta) && left != null && left < 0;
  };
  return {
    open: all.filter(({ ev, meta }) => isOpen(ev, meta)).length,
    overdue: all.filter(overdue).length,
    unread: all.filter(({ ev, meta }) => meta.tone !== "receipt" && isUnread(ev)).length,
    receipts: all.filter(({ meta }) => meta.tone === "receipt").length,
  };
}

/** After a receipt call, copy the hub's new status onto the matching event. */
export const applyReceipt = (events, eventId, data) => events.map((e) => (e.eventId === eventId ? { ...e, status: data.status, receipts: data.receipts } : e));

// ── Uploads ───────────────────────────────────────────────────────────────────

/** Portal kinds → AFC OS `docType` (Submission.DOC_TYPES). */
export const KINDS = [
  { docType: "risk_assessment", label: "ML/TF risk assessment", hint: "XLSX, PDF" },
  { docType: "programme", label: "AML/CFT programme", hint: "DOCX, PDF" },
  { docType: "procedure", label: "Transaction monitoring programme", hint: "DOCX, PDF, XLSX" },
  { docType: "policy", label: "Policies & procedures", hint: "DOCX, PDF" },
  { docType: "customer_data", label: "Customer data dump", hint: "CSV, XLSX — only aggregates ever leave the analysis service" },
  { docType: "audit_report", label: "Audit or inspection report", hint: "PDF" },
];

export const MAX_FILES_PER_BATCH = 50;

export const kindLabel = (docType) => KINDS.find((k) => k.docType === docType)?.label ?? docType ?? null;

/** True for anything an MLTFPD officer uploaded for this organisation (docs/78 §8). */
export const isOnBehalf = (ev) => ev?.payload?.uploaded_by === "mltfpd";

/** Only the submission family belongs on the Uploads page, newest first (the hub returns oldest first). */
export const submissionEvents = (events) => [...(events ?? [])].reverse().filter((e) => e.type.startsWith("submission."));

/** Batch id shown to the RO and carried on every file: PORTAL-YYYYMMDD-XXXXXX. */
export function newBatchId(now = new Date(), random = Math.random) {
  const day = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `PORTAL-${day}-${random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0")}`;
}

/**
 * The `submission.received` event for one uploaded file.
 * `upload` is what the file vault returned ({ name, url, sha256, mimeType });
 * `sha256` is the hash computed in the browser, used when the vault gave none.
 */
export function buildSubmissionEvent({ docType, upload, sha256, sizeBytes, batchId, index, count, by }) {
  return {
    type: "submission.received",
    to: "afcos",
    subject: { kind: "Submission", uid: null },
    payload: {
      doc_type: docType,
      file: { name: upload.name, url: upload.url, sha256: upload.sha256 ?? sha256, mimeType: upload.mimeType, sizeBytes },
      batch: { id: batchId, index, count },
      by,
    },
    // One key per file in the batch: a retry of the same file is not registered twice.
    idempotencyKey: `portal:submission:${batchId}:${index}`,
  };
}

// ── Quarterly return ──────────────────────────────────────────────────────────

/** Latest calendar quarter that has ended, e.g. 2026-Q3: the period a quarterly return is normally filed for. */
export function latestClosedQuarter(now = new Date()) {
  const q = Math.floor(now.getUTCMonth() / 3);
  return q === 0 ? `${now.getUTCFullYear() - 1}-Q4` : `${now.getUTCFullYear()}-Q${q}`;
}

export const RETURN_FIELDS = ["strCount", "ctrCount", "txVolumeBdt"];

/** Returns the message to show, or null when the return can be filed. */
export function validateReturn(period, figures) {
  if (!/^[0-9]{4}-Q[1-4]$/.test(period)) return "Period looks like 2026-Q3";
  const bad = RETURN_FIELDS.some((k) => {
    const v = figures?.[k];
    return v === "" || v == null || Number.isNaN(Number(v)) || Number(v) < 0;
  });
  return bad ? "Enter the three figures as numbers" : null;
}

/** The `return.submitted` event AFC OS registers as a single-RO quarterly return. */
export function buildReturnEvent({ period, figures, by, now = Date.now() }) {
  return {
    type: "return.submitted",
    to: "afcos",
    subject: { kind: "DataReturn", uid: null },
    payload: { kind: "quarterly_compliance", period, figures: { strCount: Number(figures.strCount), ctrCount: Number(figures.ctrCount), txVolumeBdt: Number(figures.txVolumeBdt) }, by },
    idempotencyKey: `portal:return:quarterly_compliance:${period}:${now}`,
  };
}
