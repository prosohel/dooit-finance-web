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

// Read-only replay of a rule against historical transactions.
// payload: { ruleId | rule, from, to, sampleLimit }
export const runBacktest = async (payload) => {
  const response = await fetchWithAuth("rule-engine/backtest", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return safeJson(response);
};
