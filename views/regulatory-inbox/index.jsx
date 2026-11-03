"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { Inbox, RefreshCw, Paperclip, CheckCircle2, Clock, AlertTriangle, Send, X, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { getInboxEvents, produceEvent, recordReceipt, uploadAttachment } from "@/app/dashboard/client/regulatory-inbox/actions";
import { ACTIONS, describeEvent } from "./event-types";

// ── Small helpers ─────────────────────────────────────────────────────────────

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const daysLeft = (d) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000) : null);

/** Which payload field is the deadline, per event family. */
const deadlineOf = (ev) => ev.payload?.deadline_date ?? ev.payload?.respond_by ?? ev.payload?.acknowledge_by ?? ev.payload?.acknowledge_due_at ?? ev.payload?.payment_due ?? ev.payload?.expiry ?? null;

const TONE_STYLES = {
  urgent: "bg-[#fdf0f5] text-[#ca2f7f] border-[#f5b8d4]",
  action: "bg-[#fff7e6] text-[#b26b00] border-[#ffd591]",
  info: "bg-[#eef4ff] text-[#2f54eb] border-[#adc6ff]",
  receipt: "bg-[#e6f7f0] text-[#199335] border-[#b7e4c7]",
};

const STATUS_LABEL = { queued: "Queued", delivered: "New", read: "Read", acknowledged: "Answered", failed: "Failed" };

/** True once this tenant has replied (acknowledged receipt) or the event needs no reply. */
const isOpen = (ev, meta) => !!meta.action && ev.status !== "acknowledged";

// ── Payload rendering: one small block per event family ──────────────────────

function KeyValue({ k, v }) {
  if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return null;
  return (
    <div className="grid grid-cols-[150px_1fr] gap-2 py-1.5 text-[13px] border-b border-dashed border-[var(--smoke-300)] last:border-0">
      <span className="text-[var(--gray)]">{k}</span>
      <span className="text-[var(--heading)] break-words">{Array.isArray(v) ? v.map((x, i) => <div key={i}>{typeof x === "object" ? JSON.stringify(x) : String(x)}</div>) : typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
    </div>
  );
}

function PayloadView({ ev }) {
  const p = ev.payload ?? {};
  switch (ev.type) {
    case "rfi.issued":
    case "clarification.issued":
    case "follow_up.issued":
      return (
        <>
          <KeyValue k="Reference" v={p.rfi_number} />
          <KeyValue k="Legal authority" v={p.legal_authority} />
          <KeyValue k="Deadline" v={`${fmtDate(p.deadline_date)} (${p.clock?.days ?? "?"} ${p.clock?.basis ?? "calendar"} days)`} />
          <div className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--gray)]">Items requested</div>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-[13px] text-[var(--heading)]">
            {(p.items_requested ?? []).map((it, i) => (
              <li key={i}>{typeof it === "string" ? it : it.text ?? JSON.stringify(it)}</li>
            ))}
          </ol>
        </>
      );
    case "circular.published":
      return (
        <>
          <KeyValue k="Circular" v={p.circular_number} />
          <KeyValue k="Title" v={p.title} />
          <KeyValue k="Effective" v={fmtDate(p.effective_at)} />
          <KeyValue k="Acknowledge by" v={fmtDate(p.acknowledge_by)} />
          <KeyValue k="Applies to" v={p.applicable_to} />
          <KeyValue k="Obligations" v={p.obligations} />
          {p.body && <div className="mt-3 whitespace-pre-wrap rounded-lg border border-[var(--smoke-300)] bg-[var(--smoke-100)] p-3 text-[13px] leading-relaxed text-[var(--heading)]">{p.body}</div>}
        </>
      );
    case "circular.reminder":
      return (
        <>
          <KeyValue k="Circular" v={p.circular_number} />
          <KeyValue k="Title" v={p.title} />
          <KeyValue k="Was due" v={fmtDate(p.acknowledge_due_at)} />
          <KeyValue k="Days overdue" v={p.days_overdue} />
        </>
      );
    case "inspection.noticed":
      return (
        <>
          <KeyValue k="Inspection" v={p.inspection} />
          <KeyValue k="Type" v={p.type} />
          <KeyValue k="Scope" v={p.scope} />
          <KeyValue k="Dates" v={`${fmtDate(p.starts)} – ${fmtDate(p.ends)}`} />
          <KeyValue k="Documents requested" v={p.documents_requested} />
        </>
      );
    case "inspection.report_issued":
      return (
        <>
          <KeyValue k="Inspection" v={p.inspection} />
          <KeyValue k="Findings" v={p.findings} />
          <KeyValue k="Remediation plan due" v={fmtDate(p.remediation_plan_due)} />
        </>
      );
    case "penalty.show_cause_issued":
      return (
        <>
          <KeyValue k="Case" v={p.case} />
          <KeyValue k="Legal basis" v={p.legal_basis} />
          <KeyValue k="Breach" v={p.breach} />
          <KeyValue k="Proposed amount (BDT)" v={p.proposed_amount?.toLocaleString?.() ?? p.proposed_amount} />
          <KeyValue k="Respond by" v={fmtDate(p.respond_by)} />
        </>
      );
    case "penalty.decided":
      return (
        <>
          <KeyValue k="Case" v={p.case} />
          <KeyValue k="Outcome" v={p.outcome} />
          <KeyValue k="Final amount (BDT)" v={p.final_amount?.toLocaleString?.() ?? p.final_amount} />
          <KeyValue k="Payment due" v={fmtDate(p.payment_due)} />
          <KeyValue k="Legal basis" v={p.legal_basis} />
        </>
      );
    case "freeze.issued":
      return (
        <>
          <KeyValue k="Order" v={p.order_number} />
          <KeyValue k="Accounts" v={p.accounts} />
          <KeyValue k="Expiry" v={fmtDate(p.expiry)} />
          <KeyValue k="Execute within" v={p.execution_target_hours ? `${p.execution_target_hours} hours` : null} />
        </>
      );
    default:
      return (
        <>
          {Object.entries(p).map(([k, v]) => (
            <KeyValue key={k} k={k.replace(/_/g, " ")} v={v} />
          ))}
        </>
      );
  }
}

// ── Reply form ────────────────────────────────────────────────────────────────

function ReplyForm({ ev, action, onDone }) {
  const { data: session } = useSession();
  const spec = ACTIONS[action];
  const items = ev.payload?.items_requested ?? [];
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [milestone, setMilestone] = useState(ev.payload?.finding ?? "");
  const [milestonesText, setMilestonesText] = useState("");
  const [accountsFrozen, setAccountsFrozen] = useState(ev.payload?.accounts?.length ?? "");
  const [balanceAtFreeze, setBalanceAtFreeze] = useState("");
  const [answered, setAnswered] = useState(() => items.map((_, i) => i + 1));
  const [attachments, setAttachments] = useState([]);
  const [busy, setBusy] = useState(false);

  const has = (f) => spec.fields.includes(f);

  async function addFiles(files) {
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const r = await uploadAttachment(fd);
      if (r.success) setAttachments((a) => [...a, r.data]);
      else toast.error(r.error);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (has("text") && !text.trim()) return toast.error("Please write the response");
    if (has("accountsFrozen") && !accountsFrozen) return toast.error("How many accounts were frozen?");
    setBusy(true);
    try {
      const milestones = milestonesText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l, i) => {
          const [finding, act, owner, due] = l.split("·").map((x) => x?.trim());
          return { n: i + 1, finding, action: act, owner, dueAt: due };
        });
      const by = session?.user?.name ?? "CAMLCO";
      const event = spec.build(ev, { text: text.trim(), note: note.trim(), items: answered, attachments, milestone, milestones, accountsFrozen, balanceAtFreeze, by });
      const r = await produceEvent(event);
      if (!r.success) throw new Error(r.error || r.message || "The hub refused the event");
      await recordReceipt(ev.eventId, "acknowledged", `${event.type} ${r.data?.eventId ?? ""}`.trim());
      toast.success(`Sent to the regulator · ${r.data?.eventId ?? event.type}`);
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-[var(--smoke-300)] bg-[var(--smoke-100)] p-4">
      <div className="text-[13px] font-semibold text-[var(--heading)]">{spec.title}</div>
      {spec.note && <p className="text-[12px] text-[var(--gray)]">{spec.note}</p>}

      {has("items") && items.length > 0 && (
        <div>
          <div className="mb-1 text-[12px] text-[var(--gray)]">Items answered in this response</div>
          <div className="space-y-1">
            {items.map((it, i) => {
              const n = i + 1;
              const on = answered.includes(n);
              return (
                <label key={n} className="flex cursor-pointer items-start gap-2 text-[13px] text-[var(--heading)]">
                  <input type="checkbox" className="mt-1" checked={on} onChange={() => setAnswered((a) => (on ? a.filter((x) => x !== n) : [...a, n].sort()))} />
                  <span>
                    {n}. {typeof it === "string" ? it : it.text}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {has("text") && <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Response to the regulator…" />}
      {has("milestones") && <Textarea value={milestonesText} onChange={(e) => setMilestonesText(e.target.value)} rows={5} placeholder={"F-01 · Re-run CDD refresh for dormant accounts · Head of Compliance · 2026-12-15\nF-02 · …"} />}
      {has("milestone") && <Input value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="Milestone / finding reference, e.g. F-02" />}
      {has("accountsFrozen") && (
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min="0" value={accountsFrozen} onChange={(e) => setAccountsFrozen(e.target.value)} placeholder="Accounts frozen" />
          <Input type="number" min="0" value={balanceAtFreeze} onChange={(e) => setBalanceAtFreeze(e.target.value)} placeholder="Balance at freeze (BDT)" />
        </div>
      )}
      {has("note") && <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />}

      {has("attachments") && (
        <div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[var(--primary)]">
            <Paperclip className="size-3.5" /> Attach documents
            <input type="file" multiple className="hidden" onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
          </label>
          {attachments.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-[12px] text-[var(--heading)]">
              {attachments.map((a, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="truncate">{a.name}</span>
                  {a.sha256 && <span className="font-mono text-[10px] text-[var(--gray)]">{a.sha256.slice(0, 12)}…</span>}
                  <button type="button" onClick={() => setAttachments((l) => l.filter((_, j) => j !== i))} className="text-[var(--gray)]">
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={busy} className="gap-1.5">
          <Send className="size-3.5" /> {busy ? "Sending…" : spec.submit}
        </Button>
      </div>
    </form>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function RegulatoryInboxView() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("open"); // open | all | receipts

  const load = useCallback(async () => {
    setError(null);
    const r = await getInboxEvents({ limit: 300 });
    if (!r.success) {
      setError(r.error || r.message || "Could not reach the exchange hub");
      setEvents([]);
      return;
    }
    // Newest first for people; the hub returns oldest first for pollers.
    setEvents([...r.data].reverse());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    if (!events) return [];
    return events
      .map((ev) => ({ ev, meta: describeEvent(ev) }))
      .filter(({ ev, meta }) => {
        if (filter === "receipts") return meta.tone === "receipt";
        if (meta.tone === "receipt") return false;
        if (filter === "open") return isOpen(ev, meta);
        return true;
      });
  }, [events, filter]);

  const counts = useMemo(() => {
    const all = (events ?? []).map((ev) => ({ ev, meta: describeEvent(ev) }));
    return {
      open: all.filter(({ ev, meta }) => isOpen(ev, meta)).length,
      overdue: all.filter(({ ev, meta }) => isOpen(ev, meta) && daysLeft(deadlineOf(ev)) != null && daysLeft(deadlineOf(ev)) < 0).length,
      unread: all.filter(({ ev, meta }) => meta.tone !== "receipt" && (ev.status === "delivered" || ev.status === "queued")).length,
      receipts: all.filter(({ meta }) => meta.tone === "receipt").length,
    };
  }, [events]);

  async function open(ev) {
    setSelected(ev);
    if (ev.status === "delivered" || ev.status === "queued") {
      const r = await recordReceipt(ev.eventId, "read");
      if (r.success) setEvents((list) => list.map((e) => (e.eventId === ev.eventId ? { ...e, status: r.data.status, receipts: r.data.receipts } : e)));
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--heading)]">
            <Inbox className="size-5 text-[var(--primary)]" /> Regulatory Inbox
          </h1>
          <p className="text-[13px] text-[var(--gray)]">Requests, notices, circulars and orders from Bangladesh Bank (MLTFPD) and BFIU, delivered through the exchange hub. Replies go back the same way and reach the officer&apos;s screen.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/client/regulatory-inbox/uploads" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 text-[12px] font-medium text-white hover:opacity-90">
            <UploadCloud className="size-3.5" /> Upload documents to AFC OS
          </Link>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Awaiting your reply", value: counts.open, icon: Clock, tone: "action" },
          { label: "Overdue", value: counts.overdue, icon: AlertTriangle, tone: "urgent" },
          { label: "Unread", value: counts.unread, icon: Inbox, tone: "info" },
          { label: "Receipts from the regulator", value: counts.receipts, icon: CheckCircle2, tone: "receipt" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-[var(--smoke-300)] bg-white p-4">
            <div className="flex items-center justify-between text-[12px] text-[var(--gray)]">
              {k.label}
              <k.icon className="size-4 opacity-60" />
            </div>
            <div className="mt-1 text-2xl font-bold text-[var(--heading)]">{events ? k.value : "—"}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-[var(--smoke-200)] p-1 w-fit">
        {[
          ["open", "Needs reply"],
          ["all", "All messages"],
          ["receipts", "Receipts"],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${filter === k ? "bg-white text-[var(--heading)] shadow-sm" : "text-[var(--gray)]"}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-[#f5b8d4] bg-[#fdf0f5] px-3 py-2 text-[13px] text-[#ca2f7f]">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* List */}
        <div className="overflow-hidden rounded-xl border border-[var(--smoke-300)] bg-white">
          {!events ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-[var(--gray)]">Nothing here. {filter === "open" ? "Every message has been answered." : "No messages yet."}</div>
          ) : (
            <ul className="divide-y divide-[var(--smoke-200)]">
              {rows.map(({ ev, meta }) => {
                const dl = deadlineOf(ev);
                const left = daysLeft(dl);
                const active = selected?.eventId === ev.eventId;
                return (
                  <li key={ev.eventId}>
                    <button onClick={() => open(ev)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[var(--smoke-100)] ${active ? "bg-[var(--smoke-100)]" : ""}`}>
                      <span className={`mt-1 inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TONE_STYLES[meta.tone] ?? TONE_STYLES.info}`}>{meta.from.split(" ")[0]}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[13px] ${ev.status === "delivered" || ev.status === "queued" ? "font-semibold text-[var(--heading)]" : "text-[var(--heading)]"}`}>
                          {meta.label}
                          {meta.subject && <span className="ml-1.5 font-mono text-[11px] text-[var(--gray)]">{meta.subject}</span>}
                        </span>
                        <span className="block text-[11px] text-[var(--gray)]">
                          {fmtDateTime(ev.occurredAt)}
                          {dl && isOpen(ev, meta) && (
                            <span className={`ml-2 ${left < 0 ? "text-[#ca2f7f] font-semibold" : left <= 3 ? "text-[#b26b00]" : ""}`}>
                              · {left < 0 ? `${-left} d overdue` : left === 0 ? "due today" : `${left} d left`}
                            </span>
                          )}
                        </span>
                      </span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {STATUS_LABEL[ev.status] ?? ev.status}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="rounded-xl border border-[var(--smoke-300)] bg-white p-5">
          {!selected ? (
            <div className="flex h-full min-h-[240px] items-center justify-center text-[13px] text-[var(--gray)]">Select a message to read it and reply.</div>
          ) : (
            (() => {
              const meta = describeEvent(selected);
              const dl = deadlineOf(selected);
              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-[var(--gray)]">{meta.from}</div>
                      <h2 className="text-[16px] font-bold text-[var(--heading)]">
                        {meta.label} {meta.subject && <span className="font-mono text-[12px] font-normal text-[var(--gray)]">{meta.subject}</span>}
                      </h2>
                      <div className="text-[12px] text-[var(--gray)]">
                        Received {fmtDateTime(selected.occurredAt)} · event <span className="font-mono">{selected.eventId}</span>
                        {dl && <> · deadline {fmtDate(dl)}</>}
                      </div>
                    </div>
                    <Badge variant="outline">{STATUS_LABEL[selected.status] ?? selected.status}</Badge>
                  </div>

                  <div className="mt-4">
                    <PayloadView ev={selected} />
                  </div>

                  {selected.receipts?.acknowledgedAt && (
                    <div className="mt-3 rounded-lg border border-[#b7e4c7] bg-[#e6f7f0] px-3 py-2 text-[12px] text-[#199335]">
                      Answered {fmtDateTime(selected.receipts.acknowledgedAt)}
                      {selected.receipts.note ? ` · ${selected.receipts.note}` : ""}
                    </div>
                  )}

                  {meta.action && selected.status !== "acknowledged" && (
                    <ReplyForm
                      key={selected.eventId}
                      ev={selected}
                      action={meta.action}
                      onDone={async () => {
                        await load();
                        setSelected(null);
                      }}
                    />
                  )}
                  {meta.action && selected.status === "acknowledged" && ["remediation.evidence", "circular.acknowledge"].includes(meta.action) && (
                    <ReplyForm key={selected.eventId + "-more"} ev={selected} action={meta.action} onDone={load} />
                  )}
                </>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
