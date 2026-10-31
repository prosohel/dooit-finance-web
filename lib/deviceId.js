"use client";

// Persistent device identity for AML device telemetry.
// Stored as a long-lived cookie (not localStorage) so Next.js server actions
// can read it and forward it to the API as X-Device-Id on every request.

const DEVICE_COOKIE = "dooit_device_id";
const TZ_COOKIE = "dooit_tz";
const TWO_YEARS = 60 * 60 * 24 * 730;

const readCookie = (name) => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const writeCookie = (name, value) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${TWO_YEARS}; SameSite=Lax`;
};

/**
 * Returns the stable device id for this browser, creating (and persisting)
 * one on first call. Also refreshes the timezone cookie as a side effect.
 */
export function getDeviceId() {
  if (typeof document === "undefined") return null;

  let id = readCookie(DEVICE_COOKIE);
  if (!id) {
    const uuid =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    id = `dv_${uuid}`;
    writeCookie(DEVICE_COOKIE, id);
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) writeCookie(TZ_COOKIE, tz);
  } catch {
    /* timezone is best-effort */
  }

  return id;
}
