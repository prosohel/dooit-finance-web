import "server-only";

/**
 * AFC OS connector for the Client Portal.
 *
 * The portal is a registered connected application in the regulator's AFC OS
 * (api_afc_os): it holds its own clientId + secret, trades them for a 1-hour
 * client token and uses that to ask for single-sign-on handoffs. Secrets never
 * leave the Next.js server — route handlers call this file, the browser only
 * ever receives the resulting /sso URL.
 *
 * Env (ui/.env):
 *   AFC_OS_API_URL        http://localhost:6832/api/v1
 *   AFC_OS_CLIENT_ID      afc_ui
 *   AFC_OS_CLIENT_SECRET  (dummy dev value shipped in api_afc_os/example.env)
 */

const baseUrl = () => (process.env.AFC_OS_API_URL || "http://localhost:6832/api/v1").replace(/\/+$/, "");

export const isAfcOsConfigured = () => !!(process.env.AFC_OS_CLIENT_ID && process.env.AFC_OS_CLIENT_SECRET);

// Module-level cache survives between requests in one server process; refreshed a minute early or after a 401.
let cached = null;

async function clientToken({ force = false } = {}) {
  if (!force && cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const res = await fetch(`${baseUrl()}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: process.env.AFC_OS_CLIENT_ID, clientSecret: process.env.AFC_OS_CLIENT_SECRET }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw Object.assign(new Error(data.error || "AFC OS rejected the client credentials"), { status: res.status });
  cached = { token: data.token, expiresAt: new Date(data.expires).getTime() };
  return cached.token;
}

async function afcFetch(path, init = {}, retry = true) {
  const token = await clientToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}), Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401 && retry) {
    await clientToken({ force: true });
    return afcFetch(path, init, false);
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/**
 * Ask AFC OS for a 15-minute single-use link for this portal user. AFC OS
 * answers 404 when the person has no AFC OS membership — nothing is created.
 */
export async function issueAfcOsHandoff({ platformUserId, email, userType = null, returnTo = null }) {
  if (!isAfcOsConfigured()) return { ok: false, status: 503, data: { error: "AFC OS is not connected in this deployment" } };
  return afcFetch("/auth/handoff", { method: "POST", body: JSON.stringify({ platformUserId, email, userType, returnTo }) });
}

/** What AFC OS lets this portal do (scopes) — for a status badge in settings. */
export async function afcOsStatus() {
  if (!isAfcOsConfigured()) return { configured: false, connected: false };
  try {
    const { ok, data } = await afcFetch("/auth/me");
    return { configured: true, connected: ok, clientId: data?.data?.active?.clientId ?? null, scopes: data?.data?.active?.permissions ?? [] };
  } catch (err) {
    return { configured: true, connected: false, error: err.message };
  }
}
