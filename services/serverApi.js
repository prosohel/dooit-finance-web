export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:6830/api/v1/";
export const AI_URL = process.env.NEXT_PUBLIC_AI_BASE_URL || "http://4.227.188.44:8000/";
export const NISA_URL = process.env.NEXT_PUBLIC_NISA_BASE_URL || "http://localhost:8000/";
export const IMAGE_SERVER_URL = process.env.NEXT_PUBLIC_IMAGE_SERVER_URL;

import { auth } from "@/auth";
import { headers as nextHeaders, cookies as nextCookies } from "next/headers";

// Forward the browser's identity to the API so device/audit telemetry records
// the real actor, not the Next.js server. Safe outside a request scope (jobs,
// build) — returns {} when headers()/cookies() are unavailable.
async function deviceForwardHeaders() {
  try {
    const [hdrs, ckies] = await Promise.all([nextHeaders(), nextCookies()]);
    const fwd = {};
    const ua = hdrs.get("user-agent");
    if (ua) fwd["User-Agent"] = ua;
    // Real client IP as seen by the Next server (left-most hop wins API-side).
    const xff = hdrs.get("x-forwarded-for");
    if (xff) fwd["X-Forwarded-For"] = xff;
    const deviceId = ckies.get("dooit_device_id")?.value;
    if (deviceId) fwd["X-Device-Id"] = deviceId;
    const tz = ckies.get("dooit_tz")?.value;
    if (tz) fwd["X-Timezone"] = tz;
    return fwd;
  } catch {
    return {};
  }
}

export async function fetchWithAuth(
  endpoint,
  options = {},
  isAi = false,
  isNisa = false,
  isFile = false,
) {
  const session = await auth(); // ✅ works anywhere on the server
  const token = session?.user?.accessToken;
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, message: "Not authenticated" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  const forward = await deviceForwardHeaders();
  const allOptions = {
    ...options,
    headers: {
      ...forward,
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (isFile) {
    delete allOptions.headers["Content-Type"];
  }

  try {
    const endpointUrl = `${isAi ? AI_URL : isNisa ? NISA_URL : BASE_URL}${endpoint}`;
    const res = await fetch(endpointUrl, {
      ...allOptions,
    });

    return res;
  } catch (error) {
    const isConnRefused = error?.cause?.code === "ECONNREFUSED";
    if (!isConnRefused) console.error("[fetchWithAuth] Unexpected fetch error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Service unavailable", error: error.message }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}
