"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, RefreshCw, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInboxEvents, produceEvent, uploadAttachment } from "@/app/dashboard/client/regulatory-inbox/actions";
import { KINDS, MAX_FILES_PER_BATCH, buildReturnEvent, buildSubmissionEvent, isOnBehalf, kindLabel, latestClosedQuarter, newBatchId, submissionEvents, validateReturn } from "./logic";

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

/** SHA-256 of a File, hex, computed in the browser (Web Crypto). */
async function sha256Of(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const EVENT_TITLE = { "submission.received": "Uploaded on your behalf", "submission.analysed": "Analysis ready", "submission.failed": "Analysis failed" };

/** Shown on anything an MLTFPD officer uploaded for this organisation (docs/78 §8). */
function OnBehalfBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#adc6ff] bg-[#eef4ff] px-1.5 py-0.5 text-[10px] font-semibold text-[#2f54eb]" title="An MLTFPD officer uploaded this document for your organisation">
      <Landmark className="size-3" /> Uploaded by Bangladesh Bank
    </span>
  );
}

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

/**
 * Quarterly AML/CFT compliance return (worklog 54): the three required figures go to AFC OS as a
 * `return.submitted` event; the regulator's side validates them against the template, compares
 * with the prior quarter and records whether the return was on time (due 30 days after quarter end).
 */
function QuarterlyReturnCard({ by }) {
  const [period, setPeriod] = useState(latestClosedQuarter());
  const [f, setF] = useState({ strCount: "", ctrCount: "", txVolumeBdt: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const problem = validateReturn(period, f);
    if (problem) return toast.error(problem);
    setBusy(true);
    const r = await produceEvent(buildReturnEvent({ period, figures: f, by }));
    setBusy(false);
    if (!r.success) return toast.error(r.error || r.message || "The hub refused the return");
    setSent({ eventId: r.data?.eventId, period });
    toast.success(`Quarterly return for ${period} sent to Bangladesh Bank · ${r.data?.eventId ?? ""}`);
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-[var(--smoke-300)] bg-white p-5">
      <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--gray)]">Quarterly AML/CFT compliance return</div>
      <p className="mb-3 text-[12px] text-[var(--gray)]">Due 30 days after the quarter ends. Figures are validated on the regulator&apos;s side and compared with your previous quarter; a late or missing return is recorded against your organisation.</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-[12px] text-[var(--gray)]">
          Period
          <Input value={period} onChange={(e) => setPeriod(e.target.value.trim())} placeholder="2026-Q3" className="mt-1" />
        </label>
        <label className="text-[12px] text-[var(--gray)]">
          STRs filed
          <Input value={f.strCount} onChange={set("strCount")} inputMode="numeric" className="mt-1" />
        </label>
        <label className="text-[12px] text-[var(--gray)]">
          CTRs filed
          <Input value={f.ctrCount} onChange={set("ctrCount")} inputMode="numeric" className="mt-1" />
        </label>
        <label className="text-[12px] text-[var(--gray)]">
          Transaction volume (BDT)
          <Input value={f.txVolumeBdt} onChange={set("txVolumeBdt")} inputMode="numeric" className="mt-1" />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[12px] text-[var(--gray)]">{sent ? `Sent for ${sent.period} · ${sent.eventId}. A second filing for the same quarter is refused by the register.` : "CTR = cash deposits or withdrawals of BDT 10 lakh or more in one account in one day."}</span>
        <Button type="submit" size="sm" disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />} File the return
        </Button>
      </div>
    </form>
  );
}

export default function RegulatoryUploadsView() {
  const { data: session } = useSession();
  const [docType, setDocType] = useState(KINDS[0].docType);
  const [queue, setQueue] = useState([]); // { name, size, state: uploading|sent|failed, eventId?, error? }
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState(null);

  const loadEvents = useCallback(async () => {
    const r = await getInboxEvents({ limit: 300 });
    if (!r.success) return setEvents([]);
    setEvents(submissionEvents(r.data));
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function send(files) {
    if (!files.length) return;
    if (files.length > MAX_FILES_PER_BATCH) return toast.error(`At most ${MAX_FILES_PER_BATCH} files per batch`);
    setBusy(true);
    const batchId = newBatchId();
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
        const ev = await produceEvent(buildSubmissionEvent({ docType, upload: up.data, sha256, sizeBytes: file.size, batchId, index: i + 1, count: files.length, by }));
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

      <QuarterlyReturnCard by={session?.user?.name ?? "CAMLCO"} />

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
                      {isOnBehalf(e) && <OnBehalfBadge />}
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
