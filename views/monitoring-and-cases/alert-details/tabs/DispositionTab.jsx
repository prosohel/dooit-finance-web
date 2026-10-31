"use client";

// Disposition & Audit: current lifecycle state and the decisions available,
// the linked case, analyst notes (alert.activity type 'note' via
// POST /alert/:id/notes), the merged audit trail (alert.auditLogs +
// GET /alert/:id/audit) and the firing rule's telemetry.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconAlertOctagon, IconArrowRight, IconBolt, IconCheck, IconClock, IconLink, IconLoader2, IconNote, IconShieldCheck, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getInitials } from "@/lib/utils";
import CollapsibleSection from "@/views/monitoring-and-cases/case-manager/details/components/CollapsibleSection";
import ReasonAlertDialog from "@/views/monitoring-and-cases/case-manager/details/components/ReasonAlertDialog";
import { dismissAlert, escalateAlertToCase } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { addAlertNote, getAlertAudit } from "@/app/dashboard/client/monitoring-and-cases/case-list/actions";
import { CASE_STATUS, PRIORITY, adaptAuditRows, mergeAudit, humanize } from "../alertAdapter";
import { Field, FieldGrid, Mono, IdChip, EmptyState, fmtDate, labelOf, variantOf } from "../components";

export default function DispositionTab({ alert, onRefresh }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="flex flex-col gap-4 xl:col-span-2">
        <Disposition alert={alert} onRefresh={onRefresh} />
        <LinkedCase alert={alert} />
        <AuditTrail alert={alert} />
      </div>
      <div className="flex flex-col gap-4">
        <Notes alert={alert} onRefresh={onRefresh} />
        <RuleTelemetry rule={alert.rule} />
      </div>
    </div>
  );
}

function Disposition({ alert, onRefresh }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null);

  const run = async (key, fn, ok) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res?.succeed || res?.success) { toast.success(ok); await onRefresh?.(); return res; }
      toast.error(res?.error || res?.message || "Action failed");
    } catch (e) { toast.error("Action failed"); } finally { setBusy(null); }
    return null;
  };
  const escalate = () => run("escalate", () => escalateAlertToCase(alert.id, {}), "Escalated — case created").then((res) => {
    if (res?.data?._id) router.push(`/dashboard/client/monitoring-and-cases/case-manager/${res.data._id}`);
  });
  const dismiss = (reason) => (note) => run("dismiss", () => dismissAlert(alert.id, { reason, note }), reason === "false_positive" ? "Marked as false positive" : "Alert dismissed");

  const options = [
    alert.linkedCase
      ? { key: "escalated", title: "Escalated to case", body: `${alert.linkedCase.uid || "A case"} is linked to this alert. Further actions happen on the case.`, icon: IconCheck, done: true,
          action: <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/client/monitoring-and-cases/case-manager/${alert.linkedCase.id}`)}><IconLink className="size-4" /> Open case</Button> }
      : { key: "escalate", title: "Escalate to case", body: "Creates an investigation case, links this transaction and moves the alert to Escalated.", icon: IconArrowRight,
          action: <ReasonAlertDialog title="Escalate to a case?" description="Creates an investigation case and links this alert and its transaction." actionLabel="Escalate" onConfirm={escalate}
            trigger={<AlertDialogTrigger asChild><Button size="sm" disabled={alert.isClosed || busy === "escalate"}>{busy === "escalate" ? <IconLoader2 className="size-4 animate-spin" /> : <IconArrowRight className="size-4" />} Escalate</Button></AlertDialogTrigger>} /> },
    { key: "dismiss", title: "Dismiss — not suspicious", body: "Closes the alert as dismissed. Your reason is recorded in the audit trail.", icon: IconX,
      action: <ReasonAlertDialog title="Dismiss this alert?" description="The alert closes as not suspicious." actionLabel="Dismiss" destructive onConfirm={dismiss("dismissed")}
        trigger={<AlertDialogTrigger asChild><Button size="sm" variant="outline" className="text-danger" disabled={alert.isClosed || busy === "dismiss"}><IconX className="size-4" /> Dismiss</Button></AlertDialogTrigger>} /> },
    { key: "fp", title: "Mark false positive", body: "Closes the alert and flags the rule hit for tuning. A reason is required.", icon: IconShieldCheck,
      action: <ReasonAlertDialog title="Mark as false positive?" description="The alert closes and the rule hit is flagged for tuning." actionLabel="Mark false positive" onConfirm={dismiss("false_positive")}
        trigger={<AlertDialogTrigger asChild><Button size="sm" variant="outline" disabled={alert.isClosed || busy === "dismiss"}><IconShieldCheck className="size-4" /> False positive</Button></AlertDialogTrigger>} /> },
  ];

  return (
    <CollapsibleSection id="disposition" title="Disposition" icon={IconBolt}>
      <div className="flex flex-col gap-4">
        <FieldGrid cols={4}>
          <Field label="Current status" value={<StatusPill variant={alert.statusMeta.variant}>{alert.statusMeta.label}</StatusPill>} />
          <Field label="Since" value={fmtDate(alert.closedAt || alert.updatedAt)} />
          <Field label="Status reason" value={alert.statusReason} className="col-span-2" />
        </FieldGrid>
        {alert.isClosed && !alert.linkedCase && (
          <p className="text-xs text-muted-foreground">This alert is closed ({alert.statusMeta.label.toLowerCase()}{alert.closedAt ? ` on ${fmtDate(alert.closedAt)}` : ""}). No further disposition is available.</p>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {options.map((o) => (
            <div key={o.key} className={`flex flex-col gap-2.5 rounded-lg border p-3.5 ${o.done ? "border-success/30 bg-success/5" : "border-border"}`}>
              <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-heading"><o.icon className="size-4" />{o.title}</span>
              <span className="flex-1 text-xs leading-[18px] text-muted-foreground">{o.body}</span>
              <div>{o.action}</div>
            </div>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  );
}

function LinkedCase({ alert }) {
  const router = useRouter();
  const c = alert.linkedCase;
  return (
    <CollapsibleSection id="linked-case" title="Linked case" icon={IconLink}>
      {!c ? (
        <EmptyState>Not escalated — no case is linked to this alert.</EmptyState>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <IdChip>{c.uid || c.id}</IdChip>
              {c.status && <StatusPill variant={variantOf(CASE_STATUS, c.status)}>{labelOf(CASE_STATUS, c.status)}</StatusPill>}
              {c.priority && <StatusPill icon={<IconAlertOctagon />} variant={variantOf(PRIORITY, c.priority)}>{labelOf(PRIORITY, c.priority)}</StatusPill>}
            </div>
            {c.title && <span className="text-sm font-semibold text-heading">{c.title}</span>}
            <span className="text-xs text-muted-foreground">{[c.assignedTo ? `Assigned to ${c.assignedTo}` : "Unassigned", c.caseType].filter(Boolean).join(" · ")}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/client/monitoring-and-cases/case-manager/${c.id}`)}>
            Open case <IconArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </CollapsibleSection>
  );
}

const diffText = (row) => {
  const o = row.oldValue, n = row.newValue;
  if (!o && !n) return row.remark || null;
  const fmt = (v) => (v && typeof v === "object" ? Object.entries(v).map(([k, x]) => `${k}: ${typeof x === "object" ? JSON.stringify(x) : x}`).join(", ") : String(v));
  if (o && n) return `${fmt(o)} → ${fmt(n)}`;
  return fmt(n || o);
};

function AuditTrail({ alert }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getAlertAudit(alert.id);
        const fromApi = res?.succeed ? adaptAuditRows(res.data || []) : [];
        if (!cancelled) setRows(mergeAudit(alert.embeddedAudit, fromApi));
      } catch (e) {
        if (!cancelled) setRows(mergeAudit(alert.embeddedAudit, []));
      }
    })();
    return () => { cancelled = true; };
  }, [alert.id, alert.embeddedAudit]);

  return (
    <CollapsibleSection id="audit" title="Audit trail" icon={IconClock} badge={rows ? rows.length : null}>
      {rows === null ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
      ) : rows.length === 0 ? (
        <EmptyState>No audit entries for this alert yet.</EmptyState>
      ) : (
        <div className="flex flex-col">
          {rows.map((r, i) => (
            <div key={`${r.action}-${r.at}-${i}`} className={`grid grid-cols-[180px_150px_1fr_160px] items-center gap-3 py-2.5 ${i ? "border-t border-border" : ""}`}>
              <Mono>{r.action}</Mono>
              <span className="truncate text-[13px] text-foreground">{r.by || "System"}</span>
              <span className="truncate text-xs text-muted-foreground">{diffText(r) || "—"}</span>
              <span className="text-right text-xs text-muted-foreground">{fmtDate(r.at)}</span>
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

function Notes({ alert, onRefresh }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = useCallback(async () => {
    const message = text.trim();
    if (!message) return;
    setSaving(true);
    try {
      const res = await addAlertNote(alert.id, message);
      if (res?.succeed) { toast.success("Note added"); setText(""); await onRefresh?.(); }
      else toast.error(res?.error || res?.message || "Failed to add note");
    } catch (e) { toast.error("Failed to add note"); } finally { setSaving(false); }
  }, [alert.id, text, onRefresh]);

  return (
    <CollapsibleSection id="notes" title="Analyst notes" icon={IconNote} badge={alert.notes.length}>
      <div className="flex flex-col gap-3">
        {alert.notes.length === 0 ? (
          <EmptyState>No notes yet — add the first one below.</EmptyState>
        ) : (
          alert.notes.map((n, i) => (
            <div key={`${n.at}-${i}`} className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-heading">
                  <Avatar className="size-5"><AvatarFallback className="bg-primary/10 text-[0.6rem] font-semibold text-primary">{getInitials(n.by || "?")}</AvatarFallback></Avatar>
                  {n.by || "Analyst"}
                </span>
                <span className="text-[11px] text-muted-foreground">{fmtDate(n.at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-[13px] leading-[19px] text-foreground">{n.message}</p>
            </div>
          ))
        )}
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note for the investigation record…" className="resize-none text-sm" disabled={alert.isClosed && !alert.linkedCase} />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={saving || !text.trim()}>
            {saving ? <IconLoader2 className="size-4 animate-spin" /> : <IconNote className="size-4" />} Add note
          </Button>
        </div>
      </div>
    </CollapsibleSection>
  );
}

function RuleTelemetry({ rule }) {
  const router = useRouter();
  return (
    <CollapsibleSection
      id="rule-telemetry"
      title="Rule telemetry"
      icon={IconBolt}
      actions={rule?.id && !rule.deleted ? <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/client/risk-rule-engine/rule-configuration/${rule.id}`)}>Open rule <IconArrowRight className="size-4" /></Button> : null}
    >
      {!rule ? (
        <EmptyState>No rule behind this alert.</EmptyState>
      ) : rule.deleted ? (
        <EmptyState>Rule {rule.ruleId} (v{rule.version}) has since been deleted; the snapshot on this alert is all that remains.</EmptyState>
      ) : (
        <FieldGrid cols={2}>
          <Field label="Hit count" value={rule.hitCount} />
          <Field label="Last fired" value={fmtDate(rule.lastFiredAt)} />
          <Field label="Engine" value={rule.engine} />
          <Field label="Rule status" value={humanize(rule.status)} />
          <Field label="Cooldown" value={rule.cooldownMinutes ? `${rule.cooldownMinutes} min` : "None"} />
          <Field label="Dedupe" value={rule.dedupeBy === "rule_customer_day" ? "rule + customer + day" : "rule + customer + transaction"} />
          <Field label="SLA override" value={rule.slaHours ? `${rule.slaHours} h` : "Label default"} />
          <Field label="Actions" value={rule.actions.length ? rule.actions.join(", ") : null} />
        </FieldGrid>
      )}
    </CollapsibleSection>
  );
}
