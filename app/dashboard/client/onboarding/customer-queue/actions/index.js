"use server";
import { getQueryString } from "@/lib/utils";
import { fetchWithAuth } from "@/services/serverApi";

export async function getCustomers(queryParams) {
  const queryString = getQueryString(queryParams);
  const url = `customer?isActive=true&${queryString}`;
  const response = await fetchWithAuth(url, {
    method: "GET",
  });

  return response.json();
}

export async function exportCustomersExcel(queryParams = {}) {
  const queryString = getQueryString(queryParams);
  const url = `customer/export${queryString ? `?${queryString}` : ""}`;
  const response = await fetchWithAuth(url, { method: "GET" });

  if (!response || typeof response.arrayBuffer !== "function") {
    return { success: false, error: "Network error while exporting" };
  }
  if (!response.ok) {
    return { success: false, error: `Export failed (${response.status})` };
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const cd = response.headers?.get?.("content-disposition") || "";
  const match = /filename="?([^"]+)"?/.exec(cd);
  const filename = match ? match[1] : `customers-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return { success: true, base64, filename };
}

// Sumsub-style per-customer KYC applicant report (PDF) — returns base64 for
// client-side download (same contract as exportCustomersExcel).
export async function exportCustomerKycPdf(id) {
  const response = await fetchWithAuth(`customer/${id}/kyc-export`, { method: "GET" });

  if (!response || typeof response.arrayBuffer !== "function") {
    return { success: false, error: "Network error while exporting" };
  }
  if (!response.ok) {
    return { success: false, error: `Export failed (${response.status})` };
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const cd = response.headers?.get?.("content-disposition") || "";
  const match = /filename="?([^"]+)"?/.exec(cd);
  const filename = match ? match[1] : `KYC_Report_${id}.pdf`;

  return { success: true, base64, filename };
}

// Manual KYC decision (approve / reject / status change) with audit note.
export async function updateCustomerKycStatus(id, body) {
  const response = await fetchWithAuth(`customer/${id}/kyc-status`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return response.json();
}

// Manual approve/reject of a single verification journey step (e.g. ID Document).
export async function reviewJourneyStep(customerId, journeyId, stepType, body) {
  const response = await fetchWithAuth(
    `customer/${customerId}/journeys/${journeyId}/steps/${stepType}/review`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return response.json();
}

// Reviewer-side customer documents (Documents tab).
export async function addCustomerDocuments(id, documents) {
  const response = await fetchWithAuth(`customer/${id}/documents`, {
    method: "POST",
    body: JSON.stringify({ documents }),
  });
  return response.json();
}

export async function removeCustomerDocument(id, url) {
  const response = await fetchWithAuth(`customer/${id}/documents?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
  });
  return response.json();
}

// ── Source of Funds (SOF) verification — QR/no-login upload flow ────────────
// The upload link/QR is keyed by customer id only (no rotating token) and is
// auto-provisioned server-side the first time it's read — nothing to
// "generate" from the UI.
export async function getSofVerification(customerId) {
  const response = await fetchWithAuth(`sof-verification/customer/${customerId}`, {
    method: "GET",
  });
  return response.json();
}

// payload: { email?, caseId? } — email falls back to the customer's KYC address
// if omitted; caseId links the RFI this raises to that case.
export async function sendSofVerificationEmail(customerId, payload = {}) {
  const response = await fetchWithAuth(`sof-verification/${customerId}/send-email`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.json();
}

// payload: { status: "verified" | "rejected" | "needs_review", note? }
export async function reviewSofDocument(customerId, docId, payload) {
  const response = await fetchWithAuth(
    `sof-verification/${customerId}/documents/${docId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return response.json();
}

// Re-run OCR on a stored document (e.g. after an OCR outage left it
// needs_review) — the API pulls the file back from the vault itself.
export async function reprocessSofDocument(customerId, docId) {
  const response = await fetchWithAuth(
    `sof-verification/${customerId}/documents/${docId}/reprocess`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return response.json();
}

export async function getCustomerStats(queryParams = {}) {
  const queryString = getQueryString(queryParams);
  const url = `customer/stats${queryString ? `?${queryString}` : ""}`;
  const response = await fetchWithAuth(url, {
    method: "GET",
  });
  return response.json();
}

// Staff-side standalone document OCR — session auth, no invite token needed
// (unlike onboarding-journey/ocr-document). Payload: { cardType?, documents: [{ url, docType }] }.
export const ocrStaffDocument = async (payload) => {
  const response = await fetchWithAuth("ocr/document", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.json();
};

// Manual import of an individual customer (doc 59) — creates the customer,
// links/creates the portal user and queues the background Sumsub chain.
export const manualImportCustomer = async (payload) => {
  const response = await fetchWithAuth("customer/manual-import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const sendInvite = async (inviteData) => {
  const response = await fetchWithAuth("customer/invite", {
    method: "POST",
    body: JSON.stringify(inviteData),
  });
  return response.json();
};

export const getCustomerById = async (id) => {
  const response = await fetchWithAuth(`customer/${id}`, {
    method: "GET",
  });
  return response.json();
};

// ── AML matches (per-hit compliance review) ──────────────────────────────────
export const getAmlMatches = async (customerId) => {
  const response = await fetchWithAuth(`sumsub/aml-matches/${customerId}`, {
    method: "GET",
  });
  return response.json();
};

export const updateAmlMatch = async (id, body) => {
  const response = await fetchWithAuth(`sumsub/aml-matches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return response.json();
};

// Apply one disposition to many matches at once.
// patch: { matchStatus?, riskLevel?, whitelisted?, reviewStatus?, reviewNote? }
export const bulkUpdateAmlMatches = async (ids, patch) => {
  const response = await fetchWithAuth("sumsub/aml-matches/bulk", {
    method: "PATCH",
    body: JSON.stringify({ ids, ...patch }),
  });
  return response.json();
};

export const createInstantReport = async (reportData) => {
  const response = await fetchWithAuth("report-notify/new", {
    method: "POST",
    body: JSON.stringify(reportData),
  });
  return response.json();
};

export const getCustomerTransactions = async (customerId) => {
  const response = await fetchWithAuth(`transaction?customer=${customerId}`, {
    method: "GET",
  });
  return response.json();
};

export const getCustomerRelations = async (payload) => {
  const url = `http://31.97.71.194:5055/api/v1/hierarchy/analyze `;
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.json();
};

export const getCustomerRelationsGraph = async (id) => {
  const url = `http://31.97.71.194:5055/api/v1/relationships/${id}`;
  const response = await fetch(url, {
    method: "GET",
  });
  return response.json();
};
// ── OSINT Engine (https://osint.dooit.ai/docs) ───────────────────────────────
// Adverse-media / open-source screening for a customer or company. Server-side
// only: the engine authenticates with a shared X-API-Key that must never reach
// a browser, which is why every call below lives in this "use server" module.
//
// TBML screening is NOT here — it goes through our own API (/api/v1/tbml),
// which owns the key, scopes a run to a case and caches the result. See
// app/dashboard/client/monitoring-and-cases/case-manager/tbml-actions.js.

// `NEXT_PUBLIC_OSINT_URL` is configured pointing at the SearXNG sub-path
// (…/api/v1/osint_searx), but every call here appends its own path segment.
// Taking it literally produced …/osint_searx/osint_searx, which 404s — the
// whole OSINT tab was dead. Trim the sub-path so both spellings of the env var
// resolve to the service root.
const OSINT_BASE_URL = (
  process.env.OSINT_API_URL ||
  process.env.NEXT_PUBLIC_OSINT_URL ||
  "https://osint.dooit.ai/api/v1"
)
  .replace(/\/+$/, "")
  .replace(/\/osint_searx$/, "");

// Prefer the server-only names. The NEXT_PUBLIC_ fallbacks keep existing
// deployments working; the prefix marks a value as safe to ship to the browser,
// which this key is not.
const X_API_KEY = process.env.OSINT_API_KEY || process.env.NEXT_PUBLIC_OSINT_API_KEY || "";

// 1 = production records, 2 = stage. The engine has no default and rejects a
// request that omits it rather than routing to production on the caller's
// behalf; anything but an explicit 1 resolves to stage here for the same reason.
const dbSource = () =>
  Number(process.env.OSINT_DB_SOURCE ?? process.env.NEXT_PUBLIC_DB_SOURCE) === 1 ? 1 : 2;

/**
 * One request to the engine, with the key attached and the db_source stamped.
 *
 * Always resolves: an error page or an empty body comes back as
 * `{ detail: ... }` rather than throwing, because these run inside server
 * actions where a throw reaches the client as an opaque error.
 */
const osintFetch = async (path, { method = "GET", body } = {}) => {
  const url = new URL(`${OSINT_BASE_URL}${path}`);
  url.searchParams.set("db_source", String(dbSource()));

  try {
    const response = await fetch(url, {
      method,
      ...(body && { body: JSON.stringify({ ...body, db_source: dbSource() }) }),
      headers: {
        ...(body && { "Content-Type": "application/json" }),
        "X-API-Key": X_API_KEY,
      },
      cache: "no-store",
    });

    return await response.json();
  } catch (error) {
    console.error("[osint] request failed:", path, error.message);
    return { detail: "The OSINT service could not be reached." };
  }
};

export const createOSINTdata = async (data) => osintFetch("/osint_searx", { method: "POST", body: data });

export const getOSINTdata = async (entityType, entityId) =>
  osintFetch(`/osint_searx/${entityType}/${entityId}`);

export const getOSINTdataSources = async (entityType, entityId) =>
  osintFetch(`/osint_searx/${entityType}/${entityId}/sources`);

// Screenshots live under /osint, not /osint_searx — and, like everything else
// here, need the key: this call used to go out bare and come back 401.
export const getOSINTScreenshots = async (entityType, entityId) =>
  osintFetch(`/osint/${entityType}/${entityId}/screenshots`);
