"use server";

import { fetchWithAuth } from "@/services/serverApi";

// Xero integration — server actions over the Dooit API (`/xero/*`).
//
// Every action returns the parsed body plus `ok`/`status`, so the UI can branch
// on 401/403/409 without a second fetch. `no-store` because connection and sync
// state are point-in-time facts; a cached read would show a finished sync as
// still running. The API never returns tokens, so nothing sensitive crosses here.

const call = async (endpoint, options) => {
  try {
    const res = await fetchWithAuth(endpoint, { cache: "no-store", ...options });
    if (typeof res?.json !== "function") {
      return { ok: false, status: 0, success: false, error: res?.error || "Network error" };
    }
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, ...body };
  } catch (error) {
    return { ok: false, status: 0, success: false, error: error.message };
  }
};

/** Connection state, last sync and whether the API has Xero configured. */
export const getXeroStatus = async () => call("xero/status");

/** Returns `{ data: { url } }` — the Xero consent URL to send the browser to. */
export const getXeroAuthUrl = async () => call("xero/auth");

/** "Sync Now" — queues a full sync (202). Duplicate clicks are collapsed server-side. */
export const syncXeroNow = async () => call("xero/sync", { method: "POST" });

export const disconnectXero = async () => call("xero/disconnect", { method: "POST" });

export const refreshXeroConnection = async () => call("xero/refresh", { method: "POST" });

/** Saved mapping + the organisation's live accounts, tax rates and currencies. */
export const getXeroSettings = async () => call("xero/settings");

/**
 * Save the mapping. Only codes/ids taken from `getXeroSettings().options` are
 * accepted by the API — nothing typed by the user is trusted.
 */
export const saveXeroSettings = async (settings) =>
  call("xero/settings", { method: "PUT", body: JSON.stringify(settings) });

/** Recent sync log rows. Pass `{ status: "failed" }` to list only failures. */
export const getXeroLogs = async ({ status, limit = 20 } = {}) => {
  const qs = new URLSearchParams({ limit, ...(status ? { status } : {}) }).toString();
  return call(`xero/logs?${qs}`);
};
