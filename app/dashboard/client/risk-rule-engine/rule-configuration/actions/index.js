'use server';

import { fetchWithAuth, BASE_URL } from "@/services/serverApi";
import { auth } from "@/auth";

const safeJson = async (res) => {
  try {
    const data = await res.json();
    // API errors arrive as { success:false, error:"…" } — the UI reads
    // `message`, so normalise or every server error shows as a generic toast.
    if (data && data.message === undefined && typeof data.error === "string") {
      data.message = data.error;
    }
    return data;
  } catch {
    return { success: false, message: `HTTP ${res.status}` };
  }
};

// ── Read ─────────────────────────────────────────────────────────────────────

export const getAllRules = async (query = "") => {
  const qs = query ? `?${query}` : "";
  const response = await fetchWithAuth(`rule-engine${qs}`);
  return safeJson(response);
};

export const getRuleById = async (id) => {
  const response = await fetchWithAuth(`rule-engine/${id}`);
  return safeJson(response);
};

// ── Write ────────────────────────────────────────────────────────────────────

export const createRule = async (data) => {
  const response = await fetchWithAuth("rule-engine/new", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return safeJson(response);
};

export const updateRule = async (id, data) => {
  const response = await fetchWithAuth(`rule-engine/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return safeJson(response);
};

// Convenience wrapper around updateRule for the on-row toggle
export const toggleRuleActive = async (id, isActive) =>
  updateRule(id, { status: isActive ? 'active' : 'paused' });

// Toggle visibleToClients on a system rule — dooit only
export const toggleRuleVisibility = async (id) => {
  const response = await fetchWithAuth(`rule-engine/${id}/visibility`, {
    method: "PATCH",
  });
  return safeJson(response);
};

export const deleteRule = async (id) => {
  const response = await fetchWithAuth(`rule-engine/${id}`, {
    method: "DELETE",
  });
  return safeJson(response);
};

// ── Metadata ──────────────────────────────────────────────────────────────────

export const getRuleDomains = async () => {
  const response = await fetchWithAuth("rule-engine/domains");
  return safeJson(response);
};

// ── CSV ──────────────────────────────────────────────────────────────────────
//
// Export — return a Blob via the auth header. We can't use <a href> directly
// because the API requires a Bearer token.
export const exportRulesCsv = async () => {
  const session = await auth();
  const token = session?.user?.accessToken;
  const res = await fetch(`${BASE_URL}rule-engine/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await safeJson(res);
    return { success: false, message: msg?.message || `HTTP ${res.status}` };
  }
  const buf = await res.arrayBuffer();
  return {
    success: true,
    // base64 so it survives the server→client serialization boundary
    data: Buffer.from(buf).toString("base64"),
    filename: "rule-engine.csv",
  };
};

// Import — `formData` comes from the client component (FormData with `file`).
// We forward to the API with the bearer token. Don't set Content-Type;
// the runtime sets the multipart boundary for us.
export const importRulesCsv = async (formData) => {
  const session = await auth();
  const token = session?.user?.accessToken;
  const res = await fetch(`${BASE_URL}rule-engine/import`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return safeJson(res);
};
