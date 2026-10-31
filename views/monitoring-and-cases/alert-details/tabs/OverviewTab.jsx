"use client";

// Overview: why the alert fired, the transaction and customer at a glance,
// SLA/ownership and the alert's own activity timeline.

import { useRouter } from "next/navigation";
import { IconBolt, IconClock, IconFileText, IconShieldCheck, IconUser, IconArrowRight, IconCheck, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import CollapsibleSection from "@/views/monitoring-and-cases/case-manager/details/components/CollapsibleSection";
import { KYC_STATUS, AML_STATUS, TXN_STATUS, humanize } from "../alertAdapter";
import { Field, FieldGrid, Mono, IdChip, RiskPill, EmptyState, SimpleTable, fmtDate, fmtMoney, labelOf, variantOf } from "../components";

export default function OverviewTab({ alert, onOpenTab }) {
  const { rule, ruleMeta, transaction: txn, customer: cust } = alert;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="flex flex-col gap-4 xl:col-span-2">
        <WhyFired alert={alert} rule={rule} meta={ruleMeta} />
        <TransactionSnapshot txn={txn} onOpenTab={onOpenTab} />
      </div>
      <div className="flex flex-col gap-4">
        <CustomerCard cust={cust} onOpenTab={onOpenTab} />
        <SlaOwnership alert={alert} />
        <Timeline items={alert.timeline} />
      </div>
    </div>
  );
}

function WhyFired({ alert, rule, meta }) {
  const leaves = [...(meta?.matched || []), ...(meta?.missed || [])];
  return (
    <CollapsibleSection id="why-fired" title="Why this alert fired" icon={IconBolt}>
      {!rule && !meta && !alert.explanation ? (
        <EmptyState>No rule snapshot on this alert{alert.origin === "AI Based" ? " — it was raised by the AI risk service" : ""}.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {rule?.ruleId && <IdChip>{rule.ruleId}</IdChip>}
            {rule?.version && <StatusPill variant="muted">Version {rule.version}{rule.currentVersion && rule.currentVersion !== rule.version ? ` (now v${rule.currentVersion})` : ""}</StatusPill>}
            {(meta?.engine || rule?.engine) && <StatusPill variant="muted">Engine: {meta?.engine || rule?.engine}</StatusPill>}
            {rule?.appliesTo && <StatusPill variant="muted">Applies to: {rule.appliesTo}</StatusPill>}
            {(rule?.mainDomain || meta?.mainDomain) && <StatusPill variant="outline">Domain: {rule?.mainDomain || meta?.mainDomain}</StatusPill>}
            {rule?.deleted && <StatusPill variant="danger">Rule deleted</StatusPill>}
          </div>
          {(rule?.description || meta?.description || alert.explanation) && (
            <p className="text-[13px] leading-5 text-foreground">{rule?.description || meta?.description || alert.explanation}</p>
          )}
          {(meta?.dsl || rule?.condition) && (
            <div className="text-xs text-muted-foreground">
              Logic: <Mono>{meta?.dsl || rule?.condition}</Mono>
              {meta?.source && <> · source: {meta.source === "logic" ? "logic tree" : meta.source}</>}
            </div>
          )}
          {leaves.length > 0 ? (
            <SimpleTable
              columns={[
                { key: "pass", header: "Result", width: "100px", render: (l) => (l.pass ? <StatusPill variant="success" icon={<IconCheck />}>Matched</StatusPill> : <StatusPill variant="danger" icon={<IconX />}>Missed</StatusPill>) },
                { key: "field", header: "Field", width: "1.4fr", render: (l) => <Mono>{l.field}</Mono> },
                { key: "operator", header: "Operator", width: "90px", render: (l) => <Mono>{l.operator}</Mono> },
                { key: "expected", header: "Expected", width: "1fr" },
                { key: "actual", header: "Actual", width: "1fr", render: (l) => (l.found === false ? <span className="text-muted-foreground">not on record</span> : l.actual ?? "—") },
              ]}
              rows={leaves}
              rowKey={(l, i) => `${l.field}-${i}`}
            />
          ) : meta?.legacy ? (
            <FieldGrid cols={3}>
              <Field label="Threshold" value={meta.legacy.threshold} />
              <Field label="Lookback (h)" value={meta.legacy.lookbackHours} />
              <Field label="Matched" value={meta.legacy.matched} />
            </FieldGrid>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <IconShieldCheck className="size-3.5" />
            {meta?.fieldMisses?.length
              ? <span>{meta.fieldMisses.length} field{meta.fieldMisses.length > 1 ? "s" : ""} could not be resolved: {meta.fieldMisses.join(", ")}</span>
              : <span>No unresolved fields.</span>}
            {meta?.evaluatedAt && <span>Evaluated {fmtDate(meta.evaluatedAt)}.</span>}
            {meta?.pendingActions?.length > 0 && <span>Pending rule actions: {meta.pendingActions.join(", ")}.</span>}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}

function TransactionSnapshot({ txn, onOpenTab }) {
  const router = useRouter();
  if (!txn) {
    return (
      <CollapsibleSection id="txn-snapshot" title="Transaction snapshot" icon={IconFileText}>
        <EmptyState>This alert is not tied to a transaction.</EmptyState>
      </CollapsibleSection>
    );
  }
  const sender = txn.parties.find((p) => p.role === "sender");
  const counter = txn.parties.find((p) => p.role === "beneficiary") || txn.parties.find((p) => p.role === "receiver");
  return (
    <CollapsibleSection
      id="txn-snapshot"
      title="Transaction snapshot"
      icon={IconFileText}
      actions={
        <Button size="sm" variant="outline" onClick={() => onOpenTab?.("transaction")}>
          Full transaction <IconArrowRight className="size-4" />
        </Button>
      }
    >
      <div className="flex flex-col gap-3.5">
        <FieldGrid cols={4}>
          <Field label="Transaction" value={txn.uid} mono />
          <Field label="Amount" value={<strong>{fmtMoney(txn.amount, txn.currency)}</strong>} />
          <Field label="Type / subtype" value={[humanize(txn.type), txn.subtype].filter(Boolean).join(" · ") || null} />
          <Field label="Channel" value={humanize(txn.channel)} />
          <Field label="Status" value={txn.status ? <StatusPill variant={TXN_STATUS[txn.status] || "outline"}>{humanize(txn.status)}</StatusPill> : null} />
          <Field label="Timestamp" value={fmtDate(txn.timestamp)} />
          <Field label="Purpose" value={txn.purpose} />
          <Field label="Reference" value={txn.reference} mono />
        </FieldGrid>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <PartyBox label="Sender" party={sender} />
          <PartyBox label={counter?.role === "receiver" ? "Receiver" : "Beneficiary"} party={counter} />
        </div>
        {txn.riskFlags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted-foreground">Risk flags</span>
            {txn.riskFlags.map((f) => <StatusPill key={f} variant="warning">{f}</StatusPill>)}
          </div>
        )}
        <div>
          <Button size="sm" variant="ghost" onClick={() => router.push(`/dashboard/client/transactions/edit?id=${txn.id}`)}>
            Open in transactions <IconArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </CollapsibleSection>
  );
}

function PartyBox({ label, party }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {party ? (
        <>
          <span className="text-[13px] font-semibold text-heading">{party.name || "—"}</span>
          <span className="text-xs text-muted-foreground">
            {[party.institution, party.country, party.account ? `····${String(party.account).slice(-4)}` : null].filter(Boolean).join(" · ") || "No institution details"}
          </span>
        </>
      ) : (
        <span className="text-[13px] text-muted-foreground">Not recorded</span>
      )}
    </div>
  );
}

function CustomerCard({ cust, onOpenTab }) {
  if (!cust) {
    return (
      <CollapsibleSection id="customer-card" title="Customer" icon={IconUser}>
        <EmptyState>No customer on this alert.</EmptyState>
      </CollapsibleSection>
    );
  }
  const badges = [
    cust.kycStatus ? { label: `KYC ${labelOf(KYC_STATUS, cust.kycStatus).toLowerCase()}`, variant: variantOf(KYC_STATUS, cust.kycStatus, "muted") } : null,
    { label: cust.isPep ? "PEP" : "Not PEP", variant: cust.isPep ? "danger" : "muted" },
    { label: cust.sanction ? "Sanctions match" : "Sanctions clear", variant: cust.sanction ? "danger" : "muted" },
    cust.amlStatus ? { label: `AML ${labelOf(AML_STATUS, cust.amlStatus).toLowerCase()}`, variant: variantOf(AML_STATUS, cust.amlStatus, "muted") } : null,
  ].filter(Boolean);
  return (
    <CollapsibleSection
      id="customer-card"
      title="Customer"
      icon={IconUser}
      actions={<Button size="sm" variant="outline" onClick={() => onOpenTab?.("customer")}>Profile <IconArrowRight className="size-4" /></Button>}
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{cust.initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-heading">{cust.name || "Unnamed customer"}</span>
            <span className="truncate text-xs text-muted-foreground">
              {[cust.uid, humanize(cust.relation?.type), cust.since ? `Customer since ${new Date(cust.since).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}` : null].filter(Boolean).join(" · ")}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => <StatusPill key={b.label} variant={b.variant}>{b.label}</StatusPill>)}
        </div>
        <FieldGrid cols={2}>
          <Field label="Customer risk" value={<RiskPill label={cust.riskLabel} score={cust.riskScore} />} />
          <Field label="Country" value={cust.country} />
          <Field label="Occupation" value={cust.occupation} />
          <Field label="AML labels" value={cust.amlLabels.length ? cust.amlLabels.join(", ") : null} />
        </FieldGrid>
      </div>
    </CollapsibleSection>
  );
}

function SlaOwnership({ alert }) {
  return (
    <CollapsibleSection id="sla" title="SLA & ownership" icon={IconClock}>
      <FieldGrid cols={2}>
        <Field label="Deadline" value={fmtDate(alert.slaDeadline)} />
        <Field label="SLA status" value={alert.slaStatus ? <StatusPill variant={alert.isOverdue ? "danger" : alert.slaStatus === "on_time" ? "success" : "warning"}>{alert.isOverdue ? "Overdue" : humanize(alert.slaStatus)}</StatusPill> : null} />
        <Field label="Analyst" value={alert.analyst?.name} />
        <Field label="Priority" value={humanize(alert.priority)} />
        <Field label="Dedup key" value={alert.deduplicationKey} mono className="col-span-2" />
        {alert.notify && <Field label="Raised from notify" value={alert.notify.uid || alert.notify.id} mono className="col-span-2" />}
      </FieldGrid>
    </CollapsibleSection>
  );
}

function Timeline({ items }) {
  return (
    <CollapsibleSection id="timeline" title="Timeline" icon={IconClock} badge={items.length}>
      {items.length === 0 ? (
        <EmptyState>No activity recorded yet.</EmptyState>
      ) : (
        <div className="flex flex-col">
          {items.map((e, i) => (
            <div key={`${e.at}-${i}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`mt-1 size-2.5 rounded-full ${i === 0 ? "bg-primary" : "bg-info"}`} />
                {i < items.length - 1 && <span className="my-1 w-0.5 flex-1 bg-border" />}
              </div>
              <div className="flex flex-col gap-0.5 pb-3.5">
                <span className="text-[13px] font-semibold text-heading">{e.title || "Activity"}</span>
                {e.message && <span className="text-xs text-foreground">{e.message}</span>}
                <span className="text-[11px] text-muted-foreground">{[e.by || "System", fmtDate(e.at)].join(" · ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
