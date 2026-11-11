"use server";

/**
 * AFC Transaction Monitoring API — the nightly rule / ML / DL detections that
 * back the "AI Generated Alerts" tab.
 *
 * The service authenticates with a single X-API-Key, so every call goes
 * through a server action and the key never reaches the browser.
 */

import { objWithValidValues } from "@/lib/utils";

const TM_BASE_URL = (process.env.TM_API_URL || "").replace(/\/+$/, "");
const TM_API_KEY = process.env.TM_API_KEY || "";

/**
 * Always resolves to `{ ok, status, data }` or `{ ok: false, status, detail }`.
 * A throw inside a server action reaches the client as an opaque error, and
 * the API's own `detail` message (401 / 404 / 422) is the useful part.
 */
const tmFetch = async (path, params = {}, { method = "GET", body } = {}) => {
  if (!TM_BASE_URL) {
    return { ok: false, status: 0, detail: "Transaction monitoring service is not configured." };
  }

  const query = new URLSearchParams(objWithValidValues(params)).toString();
  const url = `${TM_BASE_URL}${path}${query ? `?${query}` : ""}`;

  try {
    const response = await fetch(url, {
      method,
      ...(body && { body: JSON.stringify(body) }),
      headers: {
        ...(body && { "Content-Type": "application/json" }),
        "X-API-Key": TM_API_KEY,
      },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        detail: data?.detail || `Request failed (${response.status}).`,
      };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    console.error("[tm] request failed:", path, error.message);
    return {
      ok: false,
      status: 503,
      detail: "The transaction monitoring service could not be reached.",
    };
  }
};

export const getDailyAIsummary = async () => {
  const currentDate = new Date();
  const startDate = new Date(currentDate);
  startDate.setDate(currentDate.getDate() - 5); // 7 days ago

  const formattedDate = startDate.toISOString().split("T")[0];
  console.log("Fetching AI summary for date:", formattedDate);
  const res = await tmFetch(`/results/daily?date=${formattedDate}`);
  return res;
};

/** Risky transactions in a date range (YYYY-MM-DD, Asia/Dhaka), with summary. */
export const getAiResults = async (params) =>
  tmFetch("/results", { ...params, includeSummary: true });

/** Full detection record — accepts a transactionId or a transaction uid. */
export const getAiResult = async (transactionIdOrUid) =>
  tmFetch(`/results/${encodeURIComponent(transactionIdOrUid)}`);

/** Most recent monitoring run, for the "last run" line above the table. */
export const getLatestAiRun = async () => {
  const res = await tmFetch("/runs", { jobType: "monitoring", limit: 1 });
  return res.ok ? { ...res, data: res.data?.[0] || null } : res;
};

/**
 * Starts a monitoring run over `lookbackHours` ending at `windowEnd` (ISO-8601
 * UTC). Responds 202 with `{ accepted, runId }`.
 */
export const startMonitoringRun = async ({ windowEnd, lookbackHours, dryRun }) =>
  tmFetch("/runs/monitoring", {}, { method: "POST", body: { windowEnd, lookbackHours, dryRun } });

/** One run, for following a run started from the UI. */
export const getAiRun = async (runId) => tmFetch(`/runs/${encodeURIComponent(runId)}`);
