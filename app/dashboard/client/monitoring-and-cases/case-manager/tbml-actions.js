"use server";

/**
 * TBML screening server actions.
 *
 * These call OUR API (/api/v1/tbml), not the OSINT Engine. The engine is
 * fronted by the backend so that:
 *
 *   • its tenant-wide API key never reaches a browser;
 *   • a run is scoped to a case, a client and the analyst who ordered it;
 *   • submitting does not block on an analysis that takes minutes — the API
 *     records the run and chases the result in the background;
 *   • a finished report is served from the API's cache, so reopening the tab
 *     costs a database read rather than a round-trip to the engine.
 *
 * See api/services/tbmlScreening.js for the background sweep and the caching
 * rules, and api/routes/tbml.js for the endpoints.
 */

import { fetchWithAuth } from "@/services/serverApi";

// ── Reading ──────────────────────────────────────────────────────────────────

/**
 * Every screening run recorded against a case, newest first. Headlines only —
 * status, risk, which document — with no engine call at all.
 */
export const getCaseTbmlReports = async (caseId) => {
  const res = await fetchWithAuth(`tbml/cases/${caseId}/reports`);
  return res.json();
};

/**
 * One run in full. The response is our stored record; `report` holds the
 * engine's cached payload (extract, per-product research, narrative) and
 * `files` its document list. Both are null until the run settles.
 */
export const getTbmlReport = async (reportId) => {
  const res = await fetchWithAuth(`tbml/reports/${reportId}`);
  return res.json();
};

/** Re-reads a run from the engine even when our copy looks settled. */
export const refreshTbmlReport = async (reportId) => {
  const res = await fetchWithAuth(`tbml/reports/${reportId}/refresh`, { method: "POST" });
  return res.json();
};

/**
 * Every search result the run saw, opened or not — the audit answer to "what
 * else did it look at, and why was that one skipped?". Fetched from the engine
 * on first request and cached from then on.
 */
export const getTbmlTrail = async (reportId) => {
  const res = await fetchWithAuth(`tbml/reports/${reportId}/trail`);
  return res.json();
};

// ── Screening ────────────────────────────────────────────────────────────────

/**
 * Screens a new trade document.
 *
 * `formData` carries the file (field `file`) and optionally `name` and `type`.
 * The API stores it in FileVault, attaches it to the case, and submits the same
 * bytes to the engine — one round-trip, so a stored document and a screening
 * run can never drift apart.
 *
 * Answers as soon as the engine accepts the document (202). The analysis lands
 * later; poll `getCaseTbmlReports` for it.
 */
export const screenNewDocument = async (caseId, formData) => {
  const res = await fetchWithAuth(
    `tbml/cases/${caseId}/screen`,
    { method: "POST", body: formData },
    false,
    false,
    true, // multipart — let fetch set the boundary
  );
  return res.json();
};

/**
 * Screens a document already attached to the case. The analyst uploaded it
 * once; the API reads the bytes back from the vault rather than making them
 * find the file again.
 */
export const screenStoredDocument = async (caseId, documentId) => {
  const res = await fetchWithAuth(`tbml/cases/${caseId}/screen`, {
    method: "POST",
    body: JSON.stringify({ documentId }),
  });
  
  return res.json();
};
