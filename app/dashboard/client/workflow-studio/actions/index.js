'use server';

import { fetchWithAuth } from "@/services/serverApi";

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

export const getWorkflows = async (query = "") =>
  safeJson(await fetchWithAuth(`workflow${query ? `?${query}` : ""}`));

export const getWorkflowById = async (id) =>
  safeJson(await fetchWithAuth(`workflow/${id}`));

export const getWorkflowVersions = async (id) =>
  safeJson(await fetchWithAuth(`workflow/${id}/versions`));

export const getWorkflowCatalog = async () =>
  safeJson(await fetchWithAuth(`workflow/meta/catalog`));

// ── Write ────────────────────────────────────────────────────────────────────

export const createWorkflow = async (data) =>
  safeJson(await fetchWithAuth("workflow/new", { method: "POST", body: JSON.stringify(data) }));

export const updateWorkflow = async (id, data) =>
  safeJson(await fetchWithAuth(`workflow/${id}`, { method: "PUT", body: JSON.stringify(data) }));

export const deleteWorkflow = async (id) =>
  safeJson(await fetchWithAuth(`workflow/${id}`, { method: "DELETE" }));

export const duplicateWorkflow = async (id) =>
  safeJson(await fetchWithAuth(`workflow/${id}/duplicate`, { method: "POST" }));

export const publishWorkflow = async (id) =>
  safeJson(await fetchWithAuth(`workflow/${id}/publish`, { method: "POST" }));

export const approveWorkflow = async (id) =>
  safeJson(await fetchWithAuth(`workflow/${id}/approve`, { method: "POST" }));

// Reason is required by the API, not only by the dialog — an auditor asks why
// a workflow stopped being used.
export const archiveWorkflow = async (id, reason) =>
  safeJson(await fetchWithAuth(`workflow/${id}/archive`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }));
