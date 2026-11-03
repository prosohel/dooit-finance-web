"use server";

import { getQueryString } from "@/lib/utils";
import { fetchWithAuth } from "@/services/serverApi";

/**
 * Regulatory Inbox — the Client Portal's side of the exchange hub
 * (plans/integration/03 §4 and §11; hub = platform API `/exchange/*`).
 *
 * Everything the regulator sends this tenant (RFIs, notices, circulars,
 * show-cause notices, freezing orders, decisions) arrives as an exchange
 * event addressed to `portal` + this client. The tenant answers by producing
 * events of its own (rfi.responded, circular.acknowledged, …), which the AFC
 * OS worker picks up and runs through the same controllers an officer uses.
 *
 * The hub identifies the tenant from the signed-in user's `clientBelongs`;
 * `X-Exchange-App: portal` says which app is calling.
 */

const HUB_HEADERS = { "X-Exchange-App": "portal" };

/** Events addressed to this tenant (own + broadcasts), oldest first; `after` is the seq cursor. */
export const getInboxEvents = async ({ after = 0, limit = 200, type, status } = {}) => {
  const qs = getQueryString({ to: "portal", after, limit, ...(type ? { type } : {}), ...(status ? { status } : {}) });
  const res = await fetchWithAuth(`exchange/events?${qs}`, { method: "GET", headers: HUB_HEADERS });
  return res.json();
};

/** One event by id (own or broadcast). */
export const getInboxEvent = async (eventId) => {
  const res = await fetchWithAuth(`exchange/events/${encodeURIComponent(eventId)}`, { method: "GET", headers: HUB_HEADERS });
  return res.json();
};

/** Counts by status for the inbox header. */
export const getExchangeStatus = async () => {
  const res = await fetchWithAuth("exchange/status", { method: "GET", headers: HUB_HEADERS });
  return res.json();
};

/**
 * Receipt on an inbound event: delivered | read | acknowledged. The hub echoes it
 * to AFC OS as `receipt.<kind>`, which is how the officer's screen shows
 * "CAMLCO read receipt" on an RFI.
 */
export const recordReceipt = async (eventId, kind, note = null) => {
  const res = await fetchWithAuth(`exchange/events/${encodeURIComponent(eventId)}/receipt`, {
    method: "POST",
    headers: HUB_HEADERS,
    body: JSON.stringify({ kind, note }),
  });
  return res.json();
};

/**
 * Produce an event from this tenant. `type` is one of the RO-side contracts
 * (rfi.responded, circular.acknowledged, circular.evidence, inspection.acknowledged,
 * remediation.plan, remediation.evidence, penalty.response, penalty.appeal,
 * freeze.executed, ewra.submitted). `to` defaults to afcos; freezing orders go to bfiu.
 */
export const produceEvent = async ({ type, subject, payload, to = "afcos", idempotencyKey = null }) => {
  const res = await fetchWithAuth("exchange/events", {
    method: "POST",
    headers: HUB_HEADERS,
    body: JSON.stringify({ type, subject, payload, to: { app: to }, ...(idempotencyKey ? { idempotencyKey } : {}) }),
  });
  return res.json();
};

/** Attachment upload through the platform's file vault; returns { name, url, sha256, mimeType } for the event payload. */
export const uploadAttachment = async (formData) => {
  const res = await fetchWithAuth("file-vault/upload", { method: "POST", body: formData }, false, false, true);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) return { success: false, error: json.error || json.message || "Upload failed" };
  // The vault answers { success, message, file: { originalName, filename, mimetype, size, path: "uploads/docs/…" } }.
  const f = json.file ?? json.data ?? json;
  const file = formData.get("file");
  const base = (process.env.NEXT_PUBLIC_IMAGE_SERVER_URL || "").replace(/\/+$/, "");
  // AFC OS fetches the bytes by vault id through the platform (GET /afc-os/files/:id), so the reference carries the id.
  const vaultId = f._id ?? f.id ?? null;
  const url = vaultId ? `vault://files/${vaultId}` : (f.url ?? f.fileUrl ?? (f.path ? (base ? `${base}/${f.path}` : `vault://${f.path}`) : null));
  return {
    success: true,
    data: {
      name: f.originalName ?? f.name ?? file?.name ?? "attachment",
      url,
      // The vault does not hash; the browser computes SHA-256 and fills this in (views/regulatory-inbox).
      sha256: f.sha256 ?? f.hash ?? null,
      mimeType: f.mimetype ?? f.mimeType ?? file?.type ?? null,
      sizeBytes: f.size ?? file?.size ?? null,
      vaultPath: f.path ?? null,
      vaultId,
    },
  };
};
