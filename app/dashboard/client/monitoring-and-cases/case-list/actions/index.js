"use server";

import { draftCaseReport } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { getQueryString } from "@/lib/utils";
import { fetchWithAuth } from "@/services/serverApi";

const endpoint = "alert";

export const getCaseDetails = async (id) => {
  const response = await fetchWithAuth(`${endpoint}/${id}`);
  return response.json();
};

// Unified reports (ECDD/SMR/TTR/IFTI/GFS/RFI) attached to a Case.
// `id` is a Case _id (e.g. alert.linkedCase).
export const getCaseReports = async (id) => {
  const response = await fetchWithAuth(`cases/${id}/reports`);
  return response.json();
};

export const getCaseList = async (queryParams) => {
  const queryString = getQueryString(queryParams);
  const response = await fetchWithAuth(`${endpoint}?${queryString}`);
  return response.json();
};

// ── Alert details page companions ───────────────────────────────────────────

// Appends an analyst note to alert.activity (type 'note').
export const addAlertNote = async (id, message) => {
  const response = await fetchWithAuth(`${endpoint}/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  return response.json();
};

// AuditLog entries scoped to this alert, newest first.
export const getAlertAudit = async (id) => {
  const response = await fetchWithAuth(`${endpoint}/${id}/audit`);
  return response.json();
};

// Other transactions of the alert's customer (any party role).
export const getRelatedTransactions = async (id, params = {}) => {
  const queryString = getQueryString(params);
  const response = await fetchWithAuth(`${endpoint}/${id}/related-transactions${queryString ? `?${queryString}` : ""}`);
  return response.json();
};

// Compliance reports raised from this alert (by alert ref, legacy caseNumber, linked case).
export const getAlertReports = async (id) => {
  const response = await fetchWithAuth(`${endpoint}/${id}/reports`);
  return response.json();
};

// Whitelisted field update (priority, riskLabel, slaDeadline, explanation…).
export const updateAlert = async (id, data) => {
  const response = await fetchWithAuth(`${endpoint}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.json();
};

// Sends an RFI email: type = initial | followup | final.
export const sendRFI = async (id, type = "initial") => {
  const response = await fetchWithAuth(`rfi/${id}/send?type=${type}`);
  return response.json();
};

export const createRFI = async (data) => {
  const response = await fetchWithAuth(`rfi/new`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.json();
};

// Optional filters are passed straight through to advancedResults, e.g.
// { alert: alertId } scopes the list to one alert's RFIs (alert-details tab).
export const getRFIList = async (queryParams = {}) => {
  const queryString = getQueryString(queryParams);
  const response = await fetchWithAuth(queryString ? `rfi?${queryString}` : `rfi`);
  return response.json();
};

export const getRFIById = async (id) => {
  const response = await fetchWithAuth(`rfi/${id}`);
  return response.json();
};

// Draft this case's RFI — the AI proposes the requested items and covering
// letter; deadlines, addressee and the tipping-off check are ours.
export const draftRfiReport = async (ref, opts) => draftCaseReport(ref, 'rfi', opts);

export const assignAnalyst = async (data, id) => {
  const response = await fetchWithAuth(`alert/${id}/assign-analyst`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.json();
};
