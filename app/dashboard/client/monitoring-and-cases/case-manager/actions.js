'use server';

import { fetchWithAuth } from '@/services/serverApi';

const buildQuery = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  );
  return new URLSearchParams(clean).toString();
};

// ── Cases ─────────────────────────────────────────────────────────────────────

export const getCases = async (params = {}) => {
  const qs = buildQuery(params);
  const res = await fetchWithAuth(`cases${qs ? `?${qs}` : ''}`);
  return res.json();
};

export const getCaseById = async (id) => {
  const res = await fetchWithAuth(`cases/${id}`);
  return res.json();
};

// Aggregated analytics for the Case Manager dashboard (cards + charts).
export const getCaseAnalytics = async () => {
  const res = await fetchWithAuth('cases/analytics');
  return res.json();
};

export const createCase = async (payload) => {
  const res = await fetchWithAuth('cases', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const updateCase = async (id, payload) => {
  const res = await fetchWithAuth(`cases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.json();
};

// A fresh investigation over the same facts — classification, customer POIs
// and linked transactions come across; alerts, reports, notes and the audit
// trail stay with the source case.
export const duplicateCase = async (id) => {
  const res = await fetchWithAuth(`cases/${id}/duplicate`, { method: 'POST' });
  return res.json();
};

export const updateCaseStatus = async (id, status, closureReason) => {
  const res = await fetchWithAuth(`cases/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(closureReason && { closureReason }) }),
  });
  return res.json();
};

export const assignInvestigators = async (id, investigatorId) => {
  const res = await fetchWithAuth(`cases/${id}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ investigatorId: investigatorId || null }),
  });
  return res.json();
};

// ── Alert linkage ─────────────────────────────────────────────────────────────

export const getCaseAlerts = async (id) => {
  const res = await fetchWithAuth(`cases/${id}/alerts`);
  return res.json();
};

export const linkAlerts = async (id, alertIds) => {
  const res = await fetchWithAuth(`cases/${id}/alerts`, {
    method: 'POST',
    body: JSON.stringify({ alertIds }),
  });
  return res.json();
};

export const unlinkAlert = async (id, alertId) => {
  const res = await fetchWithAuth(`cases/${id}/alerts/${alertId}`, {
    method: 'DELETE',
  });
  return res.json();
};

// ── SAR ───────────────────────────────────────────────────────────────────────

export const fileSAR = async (id, sarNotes) => {
  const res = await fetchWithAuth(`cases/${id}/sar`, {
    method: 'POST',
    body: JSON.stringify({ sarNotes }),
  });
  return res.json();
};

// ── Notes ─────────────────────────────────────────────────────────────────────

export const getCaseNotes = async (caseId) => {
  const res = await fetchWithAuth(`cases/${caseId}/notes`);
  return res.json();
};

export const addNote = async (caseId, payload) => {
  const res = await fetchWithAuth(`cases/${caseId}/notes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.json();
};

// ── Regulatory filings ────────────────────────────────────────────────────────

// Every report type filed against this case: ECDD, SMR, TTR, IFTI, GFS, RFI
// and the alert dismissal records. Returns
// { data: { ecdd, smr, ttr, ifti, gfs, rfi, dismissal }, summary: { counts, total, sarFiled } }.
export const getCaseReports = async (caseId) => {
  const res = await fetchWithAuth(`cases/${caseId}/reports`);
  return res.json();
};

// ── Audit ─────────────────────────────────────────────────────────────────────

// Draft a compliance report for a case: our API computes every figure and
// identity and asks the AI service only for the narrative sections (docs/74
// §6.3). `ref` may be a Case id or uid, or the originating Alert's id or uid.
// Returns our persisted report document, so callers map OUR field names.
// A dismissal is scoped to one alert, so it needs `alertId` (and optionally a
// `dismissalType` industry template code).
export const draftCaseReport = async (ref, type, { alertId, dismissalType, regenerate } = {}) => {
  const res = await fetchWithAuth(`cases/${ref}/reports/${type}/draft`, {
    method: 'POST',
    body: JSON.stringify({ alertId, dismissalType, regenerate }),
  });
  return res.json();
};

// Save an analyst's edits to the case's draft. Only the fields in `patch` are
// sent; each one that changes is marked analyst-owned, so a re-draft keeps it.
export const saveCaseReportEdits = async (caseId, type, patch) => {
  const res = await fetchWithAuth(`cases/${caseId}/reports/${type}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return res.json();
};

// Fresh AI prose for the case — returned for the analyst to pick from, never
// saved by this call.
export const suggestCaseReportNarrative = async (caseId, type) => {
  const res = await fetchWithAuth(`cases/${caseId}/reports/${type}/suggest`, { method: 'POST' });
  return res.json();
};

// The case's transaction analysis — every figure a report draft is built from.
// params: { from, to } for an ad-hoc window, { refresh: true } to recompute.
export const getCaseAnalysis = async (caseId, params = {}) => {
  const qs = buildQuery(params);
  const res = await fetchWithAuth(`cases/${caseId}/analysis${qs ? `?${qs}` : ''}`);
  return res.json();
};

// Pin the period the analysis covers. An empty body resets it to the default.
export const setCaseReviewWindow = async (caseId, { start, end } = {}) => {
  const res = await fetchWithAuth(`cases/${caseId}/review-window`, {
    method: 'PATCH',
    body: JSON.stringify({ start, end }),
  });
  return res.json();
};

export const getAuditLog = async (caseId) => {
  const res = await fetchWithAuth(`cases/${caseId}/audit`);
  return res.json();
};

// ── Devices ───────────────────────────────────────────────────────────────────

// Devices recorded for a customer (device telemetry registry, GET /devices).
// Response is advancedResults-shaped: { success, totalRecords, data }.
export const getCustomerDevices = async (customerId) => {
  const res = await fetchWithAuth(`devices?customer=${customerId}&limit=50`);
  return res.json();
};

// ── Investigators ─────────────────────────────────────────────────────────────

export const getInvestigators = async () => {
  const res = await fetchWithAuth('cases/investigators');
  return res.json();
};

// ── Alerts (used to pick alerts to link / escalate) ───────────────────────────

export const getAlerts = async (params = {}) => {
  const qs = buildQuery(params);
  const res = await fetchWithAuth(`alert${qs ? `?${qs}` : ''}`);
  return res.json();
};

export const reviewAlert = async (id) => {
  const res = await fetchWithAuth(`alert/${id}/review`, { method: 'PUT' });
  return res.json();
};

export const dismissAlert = async (id, payload = {}) => {
  const res = await fetchWithAuth(`alert/${id}/dismiss`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.json();
};

// payload: {} → create a new case · { attach: 'auto' } → attach to the
// customer's newest open case (else create) · { caseId } → attach to that case.
// The response carries `attached: true|false` so the caller can word its toast.
export const escalateAlertToCase = async (id, payload = {}) => {
  const res = await fetchWithAuth(`alert/${id}/escalate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.json();
};

// Open cases of the alert's customer the alert could be attached to.
export const getAttachableCases = async (alertId) => {
  const res = await fetchWithAuth(`alert/${alertId}/attachable-cases`);
  return res.json();
};

// ── Case ↔ customer (POI) linkage ────────────────────────────────────────────
export const linkCustomers = async (caseId, customerIds) => {
  const res = await fetchWithAuth(`cases/${caseId}/customers`, {
    method: 'POST',
    body: JSON.stringify({ customerIds }),
  });
  return res.json();
};

export const unlinkCustomer = async (caseId, customerId) => {
  const res = await fetchWithAuth(`cases/${caseId}/customers/${customerId}`, {
    method: 'DELETE',
  });
  return res.json();
};

// ── Persons of interest who are not customers ───────────────────────────────
// What the "Add person of interest" picker offers: tenant customers matching
// `q` (none when q is empty) and every party on the case's linked alerts.
export const getPoiCandidates = async (caseId, q = '') => {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  const res = await fetchWithAuth(`cases/${caseId}/poi-candidates${qs}`);
  return res.json();
};

// payload: POI fields, or `{ fromAlert: { alertId, slot }, ...overrides }` to
// take the person off a party slot on a linked alert's transaction.
export const addCasePoi = async (caseId, payload) => {
  const res = await fetchWithAuth(`cases/${caseId}/pois`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const updateCasePoi = async (caseId, poiId, payload) => {
  const res = await fetchWithAuth(`cases/${caseId}/pois/${poiId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const removeCasePoi = async (caseId, poiId) => {
  const res = await fetchWithAuth(`cases/${caseId}/pois/${poiId}`, {
    method: 'DELETE',
  });
  return res.json();
};

// ── Alert dismissal records (docs/74 §4.5)───────────────────────────────────
// `override: true` signs off despite our own blocking conditions (unverified
// KYC, a live SMR) — the API records who overrode and when.
export const approveDismissal = async (id, payload = {}) => {
  const res = await fetchWithAuth(`dismissal-report/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.json();
};

// ── Investigation Hub progress (docs/74 C18) ─────────────────────────────────
// The 12-step wizard's saved state. `null` data means the case has never been
// worked on, so the hub seeds its own empty defaults.
export const getCaseInvestigation = async (caseId) => {
  const res = await fetchWithAuth(`cases/${caseId}/investigation`);
  return res.json();
};

// Merges the keys it is given, so a partial save never blanks the rest.
export const saveCaseInvestigation = async (caseId, payload) => {
  const res = await fetchWithAuth(`cases/${caseId}/investigation`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.json();
};

// ── Case documents ───────────────────────────────────────────────────────────
// Evidence attached to a case. The bytes live in FileVault — upload there first
// (`fileUploadOnCloudinary` in @/app/actions, which posts to /file-vault/upload)
// and record the returned publicUrl here.

export const getCaseDocuments = async (caseId) => {
  const res = await fetchWithAuth(`cases/${caseId}/documents`);
  return res.json();
};

// payload: { name, url, mimeType, type, sizeBytes, tbml?: { reportId, submissionId, status, dbSource } }
export const addCaseDocument = async (caseId, payload) => {
  const res = await fetchWithAuth(`cases/${caseId}/documents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.json();
};

// Links a document already in the vault to the TBML run it was submitted to.
export const setCaseDocumentTbml = async (caseId, documentId, payload) => {
  const res = await fetchWithAuth(`cases/${caseId}/documents/${documentId}/tbml`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.json();
};

// Detaches the document from the case; the file itself stays in FileVault.
export const removeCaseDocument = async (caseId, documentId) => {
  const res = await fetchWithAuth(`cases/${caseId}/documents/${documentId}`, {
    method: 'DELETE',
  });
  return res.json();
};
