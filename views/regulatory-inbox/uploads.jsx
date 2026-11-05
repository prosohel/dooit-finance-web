"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, RefreshCw, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInboxEvents, produceEvent, uploadAttachment } from "@/app/dashboard/client/regulatory-inbox/actions";

/**
 * Uploads & AI analysis — the Client Portal side of docs/77.
 *
 * 1. the RO picks a document kind and drops files
 * 2. each file goes to the platform file vault (returns url + sha256)
 * 3. one `submission.received` event per file is produced on the hub; the AFC OS
 *    worker registers a Submission at stage `uploaded` and the analysis service
 *    takes it from there
 * 4. progress comes back as `submission.analysed` / `submission.failed` events,
 *    which this page lists below (and the inbox shows too)
 */

/** Portal kinds → AFC OS `docType` (Submission.DOC_TYPES). */
const KINDS = [
  { docType: "risk_assessment", label: "ML/TF risk assessment", hint: "XLSX, PDF" },
  { docType: "programme", label: "AML/CFT programme", hint: "DOCX, PDF" },
  { docType: "procedure", label: "Transaction monitoring programme", hint: "DOCX, PDF, XLSX" },
  { docType: "policy", label: "Policies & procedures", hint: "DOCX, PDF" },
  { docType: "customer_data", label: "Customer data dump", hint: "CSV, XLSX — only aggregates ever leave the analysis service" },
  { docType: "audit_report", label: "Audit or inspection report", hint: "PDF" },
];

/** SHA-256 of a File, hex, computed in the browser (Web Crypto). */
async function sha256Of(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const EVENT_TITLE = { "submission.received": "Uploaded on your behalf", "submission.analysed": "Analysis ready", "submission.failed": "Analysis failed" };
const kindLabel = (docType) => KINDS.find((k) => k.docType === docType)?.label ?? docType ?? null;

/** Shown on anything an MLTFPD officer uploaded for this organisation (docs/78 §8). */
function OnBehalfBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#adc6ff] bg-[#eef4ff] px-1.5 py-0.5 text-[10px] font-semibold text-[#2f54eb]" title="An MLTFPD officer uploaded this document for your organisation">
      <Landmark className="size-3" /> Uploaded by Bangladesh Bank
    </span>
  );
}

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export default function RegulatoryUploadsView() {
  const { data: session } = useSession();
  const [docType, setDocType] = useState(KINDS[0].docType);
  const [queue, setQueue] = useState([]); // { name, size, state: uploading|sent|failed, eventId?, error? }
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState(null);

  const loadEvents = useCallback(async () => {
    const r = await getInboxEvents({ limit: 300 });
    if (!r.success) return setEvents([]);
    setEvents([...r.data].reverse().filter((e) => e.type.startsWith("submission.")));
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function send(files) {
    if (!files.length) return;
    if (files.length > 50) return toast.error("At most 50 files per batch");
    setBusy(true);
    const batchId = `PORTAL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const by = session?.user?.name ?? "CAMLCO";
    const rows = files.map((f) => ({ name: f.name, size: f.size, state: "uploading" }));
    setQueue((q) => [...rows, ...q]);

    for (const [i, file] of files.entries()) {
      const update = (patch) => setQueue((q) => q.map((r) => (r.name === file.name && r.state === "uploading" ? { ...r, ...patch } : r)));
      try {
        // Seal the file here too: the hash travels with the event, so the regulator can verify what was received.
        const sha256 = await sha256Of(file);
        const fd = new FormData();
        fd.append("file", file);
        const up = await uploadAttachment(fd);
        if (!up.success) throw new Error(up.error);
        up.data.sha256 = up.data.sha256 ?? sha256;
        const ev = await produceEvent({
          type: "submission.received",
          to: "afcos",
          subject: { kind: "Submission", uid: null },
          payload: { doc_type: docType, file: { name: up.data.name, url: up.data.url, sha256: up.data.sha256, mimeType: up.data.mimeType, sizeBytes: file.size }, batch: { id: batchId, index: i + 1, count: files.length }, by },
          idempotencyKey: `portal:submission:${batchId}:${i + 1}`,
        });
        if (!ev.success) throw new Error(ev.error || ev.message || "The hub refused the event");
        update({ state: "sent", eventId: ev.data?.eventId });
      } catch (err) {
        update({ state: "failed", error: err.message });
      }
    }
    setBusy(false);
    toast.success(`${files.length} file(s) sent to AFC OS · batch ${batchId}`);
    loadEvents();
  }

  const kind = useMemo(() => KINDS.find((k) => k.docType === docType), [docType]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard/client/regulatory-inbox" className="inline-flex items-center gap-1 text-[12px] text-[var(--primary)]">
            <ArrowLeft className="size-3.5" /> Regulatory Inbox
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--heading)]">
            <UploadCloud className="size-5 text-[var(--primary)]" /> Uploads to AFC OS
          </h1>
          <p className="text-[13px] text-[var(--gray)]">Send policies, risk assessments and returns to Bangladesh Bank (MLTFPD). The AI gap analysis runs on the regulator&apos;s side; the result and any gaps come back to this inbox for review.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadEvents} className="gap-1.5">
          <RefreshCw className="size-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Kind + drop */}
        <div className="rounded-xl border border-[var(--smoke-300)] bg-white p-5">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--gray)]">1 · What are you sending?</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {KINDS.map((k) => (
              <button key={k.docType} onClick={() => setDocType(k.docType)} className={`rounded-lg border px-3 py-2 text-left ${docType === k.docType ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--smoke-300)] hover:bg-[var(--smoke-100)]"}`}>
                <div className="text-[13px] font-medium text-[var(--heading)]">{k.label}</div>
                <div className="text-[11px] text-[var(--gray)]">{k.hint}</div>
              </button>
            ))}
          </div>

          <div className="mt-5 mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--gray)]">2 · Drop the files</div>
          <label className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center ${busy ? "opacity-60" : "border-[var(--smoke-400)] hover:border-[var(--primary)]"}`}>
            {busy ? <Loader2 className="size-6 animate-spin text-[var(--primary)]" /> : <UploadCloud className="size-6 text-[var(--primary)]" />}
            <div className="mt-2 text-[13px] font-medium text-[var(--heading)]">{busy ? "Sending…" : `Choose files · ${kind.label}`}</div>
            <div className="text-[11px] text-[var(--gray)]">Up to 50 files per batch. Each file is hashed and sealed on upload.</div>
            <input type="file" multiple className="hidden" disabled={busy} onChange={(e) => send(Array.from(e.target.files ?? []))} />
          </label>

          {queue.length > 0 && (
            <ul className="mt-4 divide-y divide-[var(--smoke-200)] rounded-lg border border-[var(--smoke-200)]">
              {queue.map((r, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-2 text-[12px]">
                  {r.state === "uploading" ? <Loader2 className="size-3.5 animate-spin text-[var(--gray)]" /> : r.state === "sent" ? <CheckCircle2 className="size-3.5 text-[#199335]" /> : <AlertTriangle className="size-3.5 text-[#ca2f7f]" />}
                  <span className="min-w-0 flex-1 truncate text-[var(--heading)]">{r.name}</span>
                  <span className="text-[var(--gray)]">{r.state === "sent" ? r.eventId : r.state === "failed" ? r.error : "uploading"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Progress from AFC OS */}
        <div className="rounded-xl border border-[var(--smoke-300)] bg-white p-5">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--gray)]">3 · Analysis progress from AFC OS</div>
          <p className="mb-2 text-[11px] text-[var(--gray)]">Documents an MLTFPD officer uploads for your organisation appear here too, marked <OnBehalfBadge />.</p>
          {!events ? (
            <div className="text-[13px] text-[var(--gray)]">Loading…</div>
          ) : events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--smoke-300)] p-6 text-center text-[13px] text-[var(--gray)]">No analysis results yet. They arrive here as `Document analysis ready` once the regulator&apos;s service has listed the gaps.</div>
          ) : (
            <ul className="divide-y divide-[var(--smoke-200)]">
              {events.map((e) => (
                <li key={e.eventId} className="flex items-start gap-3 py-2.5">
                  <FileText className="mt-0.5 size-4 text-[var(--gray)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-[var(--heading)]">
                      {EVENT_TITLE[e.type] ?? e.type} <span className="font-mono text-[11px] text-[var(--gray)]">{e.payload?.submission_id}</span>
                      {e.payload?.uploaded_by === "mltfpd" && <OnBehalfBadge />}
                    </div>
                    <div className="text-[11px] text-[var(--gray)]">
                      {fmtDateTime(e.occurredAt)}
                      {e.payload?.file?.name ? ` · ${e.payload.file.name}` : ""}
                      {e.payload?.doc_type ? ` · ${kindLabel(e.payload.doc_type)}` : ""}
                      {e.payload?.batch?.id && e.type === "submission.received" ? ` · batch ${e.payload.batch.id} (${e.payload.batch.index}/${e.payload.batch.count})` : ""}
                      {e.payload?.stage ? ` · stage ${e.payload.stage}` : ""}
                      {e.payload?.gaps_count != null ? ` · ${e.payload.gaps_count} open gap(s)` : ""}
                      {e.payload?.confidence != null ? ` · confidence ${Math.round(e.payload.confidence * 100)}%` : ""}
                      {e.payload?.error ? ` · ${e.payload.error}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
