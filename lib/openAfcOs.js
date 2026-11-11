"use client";

import { toast } from "sonner";

/**
 * Opens the regulator's AFC OS as the signed-in user, in a new tab.
 *
 * Calls this app's own `POST /api/afc-os/handoff` (the portal's client
 * credentials stay on the server), then follows the single-use link AFC OS
 * returned. Everything that can go wrong is shown as a toast — "no AFC OS
 * account" is the normal answer for bank users, who never enter AFC OS.
 */
export async function openAfcOs({ userType = null, returnTo = null } = {}) {
  // Open the tab synchronously so the browser treats it as a user gesture, then point it at the link.
  const tab = typeof window !== "undefined" ? window.open("", "_blank") : null;
  try {
    const res = await fetch("/api/afc-os/handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userType, returnTo }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      tab?.close();
      toast.error(data.error || "Could not open AFC OS");
      return false;
    }
    if (tab) tab.location.href = data.data.url;
    else window.location.href = data.data.url;
    toast.success(`Opening AFC OS as ${data.data.context?.role ?? "your AFC OS role"} · link valid 15 minutes`);
    return true;
  } catch {
    tab?.close();
    toast.error("AFC OS is not reachable");
    return false;
  }
}
