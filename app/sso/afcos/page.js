"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

/**
 * Landing page for AFC OS officers: the regulator's dashboard issued a
 * single-use ticket (?token=…); one signIn("handoff") call turns it into a
 * normal session for the officer's `dooit` membership (full control), then
 * lands on the tenant home — or wherever the dashboard asked (returnTo).
 */
function AfcosSso() {
  const q = useSearchParams();
  const [state, setState] = useState("Opening the Client Portal as the regulator…");
  useEffect(() => {
    const token = q.get("token");
    if (!token) {
      setState("No handoff token in the link. Open the Client Portal from AFC OS again.");
      return;
    }
    const returnTo = q.get("returnTo") && q.get("returnTo").startsWith("/") ? q.get("returnTo") : "/dashboard/client";
    const callbackUrl = `${returnTo}${returnTo.includes("?") ? "&" : "?"}sso=bb-afcos&scope=${encodeURIComponent(q.get("scope") || "admin")}${q.get("tenant") ? `&tenant=${encodeURIComponent(q.get("tenant"))}` : ""}`;
    signIn("handoff", { token, callbackUrl, redirect: true }).catch(() => setState("The handoff link is invalid, expired or already used. Open the Client Portal from AFC OS again."));
  }, [q]);
  return <p className="p-6 text-sm text-muted-foreground">{state}</p>;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm">Opening…</p>}>
      <AfcosSso />
    </Suspense>
  );
}
