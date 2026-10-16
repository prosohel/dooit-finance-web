"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ExternalLink, Link2, Loader2, RefreshCw, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  disconnectXero,
  getXeroAuthUrl,
  getXeroLogs,
  getXeroStatus,
  syncXeroNow,
} from "@/app/dashboard/client/system-settings/xero/actions";

import XeroMappingCard from "./XeroMappingCard";

const POLL_MS = 2500;

const SYNC_STATUS = {
  idle: { label: "Not synced yet", variant: "outline" },
  running: { label: "Syncing…", variant: "info" },
  success: { label: "Up to date", variant: "success" },
  partial: { label: "Completed with errors", variant: "warning" },
  failed: { label: "Failed", variant: "danger" },
};

const CALLBACK_MESSAGES = {
  connected: (p) => ({ type: "success", text: `Connected to ${p.get("org") || "Xero"} — finish setup below` }),
  denied: () => ({ type: "error", text: "Xero authorisation was cancelled" }),
  invalid_state: () => ({ type: "error", text: "The connection request expired. Please try again." }),
  error: (p) => ({ type: "error", text: p.get("message") || "Could not connect to Xero" }),
};

const formatDate = (d) => (d ? new Date(d).toLocaleString() : "—");

// Status is carried by text as well as colour.
const LOG_STATUS = {
  success: { label: "Done", variant: "success" },
  skipped: { label: "Note", variant: "outline" },
  failed: { label: "Error", variant: "danger" },
};

const ENTITY_LABELS = { invoice: "Bill", contact: "Contact", payment: "Payment", connection: "Connection", settings: "Settings", sync: "Sync", webhook: "Xero update" };

const totals = (summary) => {
  if (!summary) return null;
  return Object.entries(summary).map(([k, v]) => ({
    key: k,
    done: (v.created || 0) + (v.updated || 0),
    skipped: v.skipped || 0,
    failed: v.failed || 0,
  }));
};

export default function XeroSettings() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState(null); // API status payload
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [starting, setStarting] = useState(false); // sync request in flight
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState("failed"); // "failed" | "all"
  const timer = useRef(null);

  const load = useCallback(async () => {
    const res = await getXeroStatus();
    if (res.status === 403) {
      setForbidden(true);
    } else if (res.ok) {
      setState(res.data);
    } else {
      toast.error(res.error || "Could not load Xero status");
    }
    setLoading(false);
    return res.ok ? res.data : null;
  }, []);

  const loadLogs = useCallback(async () => {
    const res = await getXeroLogs({ status: logFilter === "failed" ? "failed" : undefined, limit: 50 });
    if (res.ok) setLogs(res.data || []);
  }, [logFilter]);

  // Surface the OAuth callback result once, then clean the URL.
  useEffect(() => {
    const result = searchParams.get("xero");
    if (!result) return;
    const msg = (CALLBACK_MESSAGES[result] || CALLBACK_MESSAGES.error)(searchParams);
    toast[msg.type](msg.text);
    router.replace(pathname);
  }, [searchParams, router, pathname]);

  useEffect(() => {
    load();
    loadLogs();
  }, [load, loadLogs]);

  // Poll while a sync is queued or running, and refresh the error list when it ends.
  const syncing = !!state?.syncing;
  useEffect(() => {
    if (!syncing) return undefined;
    timer.current = setInterval(async () => {
      const s = await load();
      if (s && !s.syncing) {
        clearInterval(timer.current);
        loadLogs();
        toast[s.lastSyncStatus === "success" ? "success" : "warning"](
          s.lastSyncStatus === "success" ? "Xero sync complete" : "Xero sync finished with issues"
        );
      }
    }, POLL_MS);
    return () => clearInterval(timer.current);
  }, [syncing, load, loadLogs]);

  const handleConnect = async () => {
    setConnecting(true);
    const res = await getXeroAuthUrl();
    if (res.ok && res.data?.url) {
      window.location.href = res.data.url; // leaves the app; Xero redirects back via the API
      return;
    }
    toast.error(res.error || "Could not start the Xero connection");
    setConnecting(false);
  };

  const handleSync = async () => {
    if (starting || syncing) return; // duplicate-click guard (API also dedupes)
    setStarting(true);
    const res = await syncXeroNow();
    setStarting(false);
    if (res.ok) {
      setState(res.data);
      if (res.data?.alreadyRunning) toast.info("A sync is already in progress");
      else toast.success("Sync started");
    } else {
      toast.error(res.error || "Could not start the sync");
      load();
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    const res = await disconnectXero();
    setDisconnecting(false);
    setConfirmDisconnect(false);
    if (res.ok) {
      toast.success("Disconnected from Xero");
      setLogs([]);
      await load();
    } else {
      toast.error(res.error || "Could not disconnect");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-56 w-full max-w-3xl" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="p-4">
        <Card className="max-w-3xl">
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <AlertTriangle className="size-4" />
            Only administrators can manage the Xero integration.
          </CardContent>
        </Card>
      </div>
    );
  }

  const connected = !!state?.connected;
  const needsReconnect = state?.status === "revoked" || state?.status === "error";
  const sync = SYNC_STATUS[syncing ? "running" : state?.lastSyncStatus || "idle"] || SYNC_STATUS.idle;
  const summary = totals(state?.lastSyncSummary);

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Xero</h1>
        <p className="text-sm text-muted-foreground">
          Send your Dooit invoices to Xero as bills, coded to your own accounts and tax rates.
        </p>
      </div>

      {state && state.configured === false && (
        <Card className="max-w-3xl border-amber-300">
          <CardContent className="flex items-center gap-3 text-sm">
            <AlertTriangle className="size-4 text-amber-600" />
            Xero isn&apos;t configured on the server yet. Ask your administrator to set the XERO_* environment variables.
          </CardContent>
        </Card>
      )}

      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Connection
                {connected ? (
                  <Badge variant="success">Connected</Badge>
                ) : needsReconnect ? (
                  <Badge variant="danger">Reconnect required</Badge>
                ) : (
                  <Badge variant="outline">Not connected</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {connected
                  ? "Dooit is connected to the Xero organisation below."
                  : needsReconnect
                    ? "Xero access was revoked or has expired. Connect again to resume syncing."
                    : "Connect your Xero organisation to start syncing."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {connected && (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Organisation</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  {state.tenantName || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Connected</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  {formatDate(state.connectedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Last sync</dt>
                <dd className="font-medium">{formatDate(state.lastSyncAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Sync status</dt>
                <dd>
                  <Badge variant={sync.variant}>
                    {syncing && <Loader2 className="animate-spin" />}
                    {sync.label}
                  </Badge>
                </dd>
              </div>
            </dl>
          )}

          {connected && syncing && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" />
              Sending bills to Xero…
            </p>
          )}

          {connected && !syncing && summary && (
            <div className="grid gap-3 sm:grid-cols-3">
              {summary.map((s) => (
                <div key={s.key} className="rounded-lg border p-3">
                  <div className="text-xs capitalize text-muted-foreground">{s.key}</div>
                  <div className="text-sm">
                    <span className="font-semibold">{s.done}</span> synced
                    {s.skipped > 0 && <span className="text-muted-foreground"> · {s.skipped} unchanged</span>}
                    {s.failed > 0 && <span className="text-rose-600"> · {s.failed} failed</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {state?.lastSyncError && (
            <div
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{state.lastSyncError}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(!connected || needsReconnect) && (
              <Button onClick={handleConnect} disabled={connecting || state?.configured === false}>
                {connecting ? <Loader2 className="animate-spin" /> : <Link2 />}
                {needsReconnect ? "Reconnect to Xero" : "Connect to Xero"}
              </Button>
            )}
            {connected && (
              <>
                <Button onClick={handleSync} disabled={starting || syncing}>
                  <RefreshCw className={starting || syncing ? "animate-spin" : ""} />
                  {syncing ? "Syncing…" : "Sync Now"}
                </Button>
                <Button variant="outline" onClick={() => setConfirmDisconnect(true)} disabled={syncing}>
                  <Unplug />
                  Disconnect from Xero
                </Button>
                {state.xeroUrl && (
                  <Button variant="ghost" asChild>
                    <a href={state.xeroUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink />
                      Open in Xero
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {connected && <XeroMappingCard setupComplete={!!state.setupComplete} onSaved={load} />}

      {connected && (
        <Card className="max-w-3xl">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Sync activity</CardTitle>
                <CardDescription>What Dooit sent to Xero, and anything that needs your attention.</CardDescription>
              </div>
              <Tabs value={logFilter} onValueChange={setLogFilter}>
                <TabsList>
                  <TabsTrigger value="failed">Errors</TabsTrigger>
                  <TabsTrigger value="all">All activity</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {logFilter === "failed" ? "No errors — everything sent successfully." : "No activity yet."}
              </p>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l._id}>
                    <TableCell className="whitespace-nowrap">{formatDate(l.timestamp)}</TableCell>
                    <TableCell>
                      {ENTITY_LABELS[l.entity] || l.entity}
                      {l.meta?.invoiceNumber ? ` ${l.meta.invoiceNumber}` : ""}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {l.direction === "inbound" ? "from Xero · " : ""}
                      {String(l.action).replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={(LOG_STATUS[l.status] || LOG_STATUS.skipped).variant}>
                        {(LOG_STATUS[l.status] || LOG_STATUS.skipped).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal break-words text-sm">
                      {l.error || (l.meta?.reason ? `Archived in Xero: ${l.meta.reason}` : "—")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Xero?</AlertDialogTitle>
            <AlertDialogDescription>
              Dooit will stop sending bills and its access to {state?.tenantName || "your organisation"} will be
              revoked in Xero. Bills and contacts already in Xero are not deleted. You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDisconnect();
              }}
              disabled={disconnecting}
            >
              {disconnecting && <Loader2 className="animate-spin" />}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
