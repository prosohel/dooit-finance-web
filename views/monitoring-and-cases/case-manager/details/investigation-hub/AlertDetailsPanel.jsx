"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconBell,
  IconCalendarEvent,
  IconPlus,
  IconShieldExclamation,
  IconUser,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn, dateShowFormat, formatAUD, getInitials } from "@/lib/utils";
import {
  getCaseById,
  linkAlerts,
} from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import LinkAlertsDialog from "../../LinkAlertsDialog";

// Alert risk → pill. Matches the alert queue so the same alert reads the same
// way in both places.
const RISK_VARIANT = { Critical: "danger", High: "danger", Medium: "warning", Low: "info", Info: "muted" };

// The strip on the left edge of a list row — a glanceable risk cue that does
// not need the pill to be read.
const RISK_ACCENT = {
  Critical: "bg-danger",
  High: "bg-danger",
  Medium: "bg-warning",
  Low: "bg-info",
  Info: "bg-muted-foreground/40",
};

const STATUS_VARIANT = {
  new: "info",
  under_review: "warning",
  escalated_to_case: "success",
  dismissed: "outline",
  false_positive: "muted",
};

const STATUS_LABEL = {
  new: "New",
  under_review: "Under review",
  escalated_to_case: "Escalated",
  dismissed: "Dismissed",
  false_positive: "False positive",
};

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

/* ──────────────────────────────────────────────────────────────────────────── */

function SectionLabel({ children, className }) {
  return (
    <div
      className={cn(
        "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Label above value — reads faster than label/value rows on a wide surface. */
function Fact({ label, value, valueClassName, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11.5px] text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 truncate text-[13px] font-semibold text-heading", valueClassName)}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

/** Label/value on one line — for the narrow customer card. */
function FactRow({ label, value, valueClassName }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 text-right font-semibold text-heading", valueClassName)}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

function Card({ className, children }) {
  return (
    <section className={cn("rounded-xl border border-black/[0.08] bg-white", className)}>
      {children}
    </section>
  );
}

/* ── Alert list ───────────────────────────────────────────────────────────── */

function AlertRow({ alert, selected, fresh, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "group relative flex w-full flex-col gap-1 overflow-hidden rounded-lg border py-2.5 pl-4 pr-3 text-left outline-none",
          // Selection is changed many times per session: colour only, no motion.
          "transition-[background-color,border-color,opacity,translate] duration-150 ease-snappy",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50",
          selected
            ? "border-primary/40 bg-primary/[0.05]"
            : "border-transparent hover:bg-muted/60",
          // A newly added alert slides in once so the analyst sees where it
          // landed; the rest of the list renders still.
          fresh &&
            "duration-300 starting:translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-2 left-1.5 w-[3px] rounded-full",
            RISK_ACCENT[alert.riskLabel] || "bg-border"
          )}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[11.5px] font-semibold text-heading">
            {alert.uid || "—"}
          </span>
          {alert.riskLabel && (
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
              {alert.riskLabel}
              {alert.riskScore != null ? ` · ${alert.riskScore}` : ""}
            </span>
          )}
        </div>
        <div className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">
          {alert.ruleId ? <span className="font-medium text-heading/80">{alert.ruleId} · </span> : null}
          {alert.ruleName || "Unnamed rule"}
        </div>
        {fresh && (
          <span className="mt-0.5 w-fit rounded bg-primary/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-primary">
            Just added
          </span>
        )}
      </button>
    </li>
  );
}

function AlertList({ alerts, selectedId, freshIds, onSelect, onAdd }) {
  return (
    <Card className="flex min-h-0 flex-col lg:sticky lg:top-4 lg:max-h-[calc(100vh-180px)]">
      <header className="flex items-center justify-between gap-2 border-b border-black/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <IconBell className="size-4 text-muted-foreground" />
          <h3 className="text-[13px] font-semibold text-heading">Alerts</h3>
          <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {alerts.length}
          </span>
        </div>
        {onAdd && (
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={onAdd}>
            <IconPlus className="size-3.5" />
            Add alert
          </Button>
        )}
      </header>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <IconAlertTriangle className="size-7 text-muted-foreground/40" />
          <p className="text-[12.5px] text-muted-foreground">No alerts are linked to this case yet.</p>
          {onAdd && (
            <Button size="sm" className="mt-1 h-7 gap-1 px-2.5 text-xs" onClick={onAdd}>
              <IconPlus className="size-3.5" />
              Add alert
            </Button>
          )}
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2" aria-label="Alerts on this case">
          {alerts.map((a) => (
            <AlertRow
              key={a.id}
              alert={a}
              selected={sameId(a.id, selectedId)}
              fresh={freshIds.has(String(a.id))}
              onSelect={() => onSelect(a.id)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ── Selected alert ───────────────────────────────────────────────────────── */

function AlertDetail({ alert, caseData }) {
  const title = alert?.ruleName || caseData?.title || caseData?.caseName;
  const rule = alert
    ? [alert.ruleId, alert.ruleName].filter(Boolean).join(": ") || null
    : caseData?.detectionRule;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-warning/15 bg-warning/[0.05] px-5 py-4">
        <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-warning">
          <IconShieldExclamation className="size-3.5" />
          Alert trigger
          {alert?.uid && (
            <span className="ml-1 font-mono font-semibold normal-case tracking-normal text-muted-foreground">
              {alert.uid}
            </span>
          )}
        </div>
        <h2 className="text-[15px] font-semibold leading-snug text-heading text-balance">{title || "—"}</h2>
        {/* The rule's own words for why it fired — the alert's explanation. */}
        {alert?.explanation && (
          <p className="mt-1.5 max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground text-pretty">
            {alert.explanation}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {alert?.riskLabel && (
            <StatusPill variant={RISK_VARIANT[alert.riskLabel] || "warning"}>
              {alert.riskLabel}
              {alert.riskScore != null ? ` · ${alert.riskScore}` : ""}
            </StatusPill>
          )}
          {alert?.status && (
            <StatusPill variant={STATUS_VARIANT[alert.status] || "outline"}>
              {STATUS_LABEL[alert.status] || alert.status}
            </StatusPill>
          )}
          {alert?.alertOrigin && <StatusPill variant="outline">{alert.alertOrigin}</StatusPill>}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-3">
        <Fact label="Alert type" value={alert?.caseType || caseData?.alertType} />
        <Fact label="Detection rule" value={rule} className="sm:col-span-2" />
        <Fact
          label="Alert raised"
          value={
            alert?.createdAt ? (
              <span className="inline-flex items-center gap-1">
                <IconCalendarEvent className="size-3.5 text-muted-foreground" />
                {dateShowFormat(alert.createdAt)}
              </span>
            ) : null
          }
        />
        <Fact
          label="Risk score"
          value={alert?.riskScore ?? null}
          valueClassName="tabular-nums"
        />
      </dl>
    </Card>
  );
}

function CaseContext({ caseData, alertsCount }) {
  const transactions = caseData?.transactions || [];
  const flaggedCount = transactions.filter((t) => t.status === "flagged").length;

  return (
    <Card className="px-5 py-4">
      <SectionLabel className="mb-3">Case facts</SectionLabel>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Fact
          label="Total exposure"
          value={formatAUD(caseData?.totalExposure || 0)}
          valueClassName="text-[15px] font-bold tabular-nums text-primary"
        />
        <Fact
          label="Flagged transactions"
          value={
            <span className="tabular-nums">
              {flaggedCount}
              <span className="font-normal text-muted-foreground"> of {transactions.length}</span>
            </span>
          }
        />
        <Fact label="Organisation" value={caseData?.organisation} />
        <Fact
          label="Alerts on case"
          value={alertsCount || caseData?.relatedAlertsCount || 0}
          valueClassName="tabular-nums"
        />
      </dl>
    </Card>
  );
}

function CustomerCard({ caseData }) {
  const c = caseData?.customer || {};
  const name = c.name || caseData?.customerName;

  return (
    <Card className="px-5 py-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white">
          {name ? getInitials(name) : <IconUser className="size-4" />}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold text-heading">{name || "—"}</div>
          <div className="text-xs text-muted-foreground">
            {caseData?.customerType ? `${caseData.customerType} customer` : "Customer"}
          </div>
        </div>
      </div>

      <dl className="flex flex-col gap-2.5">
        <FactRow
          label="Customer ID"
          value={caseData?.uid}
          valueClassName="font-mono text-[11.5px]"
        />
        <FactRow label="Nationality" value={c.nationality} />
        <FactRow label="Occupation" value={c.occupation} />
        <FactRow
          label="Account opened"
          value={c.accountOpeningDate ? dateShowFormat(c.accountOpeningDate) : "—"}
        />
        <FactRow
          label="Risk rating"
          value={c.riskRating || caseData?.riskTag}
          valueClassName="text-warning"
        />
        <FactRow label="Email" value={c.email} valueClassName="break-all text-[11.5px]" />
      </dl>
    </Card>
  );
}

/* ── Panel ────────────────────────────────────────────────────────────────── */

export default function AlertDetailsPanel({ caseData, caseId, onCaseChange }) {
  // A case can hold several alerts (docs/74 C1), so the panel lists them all
  // and lets the analyst read any one of them — the first is shown by default.
  const alerts = useMemo(() => caseData?.alerts || [], [caseData?.alerts]);
  const [selectedId, setSelectedId] = useState(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [freshIds, setFreshIds] = useState(() => new Set());

  const selected = alerts.find((a) => sameId(a.id, selectedId)) || alerts[0] || null;

  // Stable between renders — the dialog reloads its list whenever this changes.
  const linkedIds = useMemo(() => alerts.map((a) => a.id), [alerts]);

  const id = caseId || caseData?._id || caseData?.id;
  // Adding needs somewhere to save and a way to hand the result back.
  const canAdd = !!id && typeof onCaseChange === "function";

  const handleLink = async (alertIds) => {
    const res = await linkAlerts(id, alertIds).catch(() => null);
    if (!res?.succeed) {
      toast.error(res?.message || "Could not add the alerts to this case.");
      return;
    }
    // Re-read the case so the new alerts arrive populated, whatever shape the
    // link endpoint answers with.
    const fresh = await getCaseById(id).catch(() => null);
    onCaseChange(fresh?.succeed ? fresh.data : res.data);

    setFreshIds(new Set(alertIds.map(String)));
    setSelectedId(alertIds[0]);
    toast.success(
      alertIds.length === 1 ? "Alert added to the case." : `${alertIds.length} alerts added to the case.`
    );
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
      <AlertList
        alerts={alerts}
        selectedId={selected?.id}
        freshIds={freshIds}
        onSelect={setSelectedId}
        onAdd={canAdd ? () => setLinkOpen(true) : undefined}
      />

      <div className="flex min-w-0 flex-col gap-4">
        <AlertDetail alert={selected} caseData={caseData} />
        <div className="grid gap-4 xl:grid-cols-2">
          <CaseContext caseData={caseData} alertsCount={alerts.length} />
          <CustomerCard caseData={caseData} />
        </div>
      </div>

      {canAdd && (
        <LinkAlertsDialog
          open={linkOpen}
          onOpenChange={setLinkOpen}
          onConfirm={handleLink}
          excludeIds={linkedIds}
          title="Add alerts to this case"
          confirmLabel="Add selected"
        />
      )}
    </div>
  );
}
