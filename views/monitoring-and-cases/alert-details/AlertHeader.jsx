"use client";

// Header shown above every tab: identity, risk, SLA, ownership and the
// lifecycle actions that already exist on the API (review / assign /
// escalate / dismiss). Every value comes from the adapted alert.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconAlertOctagon,
  IconArrowRight,
  IconBolt,
  IconCalendar,
  IconEye,
  IconLink,
  IconLoader2,
  IconRefresh,
  IconShieldCheck,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getInitials } from "@/lib/utils";
import RiskScoreGauge from "@/views/monitoring-and-cases/case-manager/details/components/RiskScoreGauge";
import SlaCountdown from "@/views/monitoring-and-cases/case-manager/details/components/SlaCountdown";
import ReasonAlertDialog from "@/views/monitoring-and-cases/case-manager/details/components/ReasonAlertDialog";
import AssignAnalystForm from "@/views/monitoring-and-cases/case-details/AssignAnalystForm";
import EscalateDialog from "./EscalateDialog";
import {
  reviewAlert,
  dismissAlert,
  escalateAlertToCase,
} from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { PRIORITY } from "./alertAdapter";
import { IdChip, fmtDate, fmtMoney, labelOf, variantOf } from "./components";

export default function AlertHeader({ alert, onRefresh, onOpenTab }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null); // 'review' | 'escalate' | 'dismiss'
  const [assignOpen, setAssignOpen] = useState(false);

  const run = async (key, fn, okMessage) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res?.succeed || res?.success) {
        toast.success(okMessage);
        await onRefresh?.();
        return res;
      }
      toast.error(res?.error || res?.message || "Action failed");
    } catch (e) {
      console.error(e);
      toast.error("Action failed");
    } finally {
      setBusy(null);
    }
    return null;
  };

  const handleReview = () => run("review", () => reviewAlert(alert.id), "Review started");
  // payload is {} (new case) or { caseId } (attach) — chosen in EscalateDialog.
  const handleEscalate = (payload = {}) =>
    run(
      "escalate",
      () => escalateAlertToCase(alert.id, payload),
      payload.caseId ? "Attached to the existing case" : "Escalated — case created",
    ).then((res) => {
      const caseId = res?.data?._id;
      if (caseId) router.push(`/dashboard/client/monitoring-and-cases/case-manager/${caseId}`);
    });
  const handleDismiss = (reason) => (note) =>
    run("dismiss", () => dismissAlert(alert.id, { reason, note }), reason === "false_positive" ? "Marked as false positive" : "Alert dismissed");

  const canReview = alert.status === "new";
  const canEscalate = !alert.isClosed && !alert.linkedCase;
  const canDismiss = !alert.isClosed;
  const subline = [
    alert.customer?.name,
    alert.customer?.uid,
    alert.transaction?.uid ? `Transaction ${alert.transaction.uid}` : null,
    alert.transaction?.amount !== null && alert.transaction ? fmtMoney(alert.transaction.amount, alert.transaction.currency) : null,
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      {/* meta row */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1.5"><IconCalendar className="size-3.5" />Created: {fmtDate(alert.createdAt)}</span>
        <span className="inline-flex items-center gap-1.5"><IconRefresh className="size-3.5" />Updated: {fmtDate(alert.updatedAt)}</span>
        {alert.origin && <span className="inline-flex items-center gap-1.5"><IconBolt className="size-3.5" />Origin: {alert.origin}</span>}
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        {/* identity */}
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <IdChip>{alert.uid || alert.id}</IdChip>
            <StatusPill variant={alert.statusMeta.variant}>{alert.statusMeta.label}</StatusPill>
            <StatusPill icon={<IconAlertOctagon />} variant={variantOf(PRIORITY, alert.priority)}>
              {labelOf(PRIORITY, alert.priority)}
            </StatusPill>
            {alert.caseType && <Badge variant="outline" className="text-xs">{alert.caseType}</Badge>}
            {alert.rule?.ruleId && (
              <StatusPill variant="muted">
                Rule {alert.rule.ruleId}{alert.rule.version ? ` · v${alert.rule.version}` : ""}
              </StatusPill>
            )}
          </div>
          <h1 className="text-xl font-bold text-heading">
            {alert.rule?.ruleName || alert.explanation || `Alert ${alert.uid || ""}`}
          </h1>
          {subline.length > 0 && <p className="text-xs text-muted-foreground">{subline.join(" · ")}</p>}
        </div>

        {/* risk / sla / ownership */}
        <div className="flex shrink-0 flex-col gap-3 xl:items-end">
          <div className="flex items-center gap-4">
            <RiskScoreGauge score={alert.riskScore ?? 0} label={`Risk · ${alert.riskLabel || "—"}`} />
            {alert.slaDeadline && (
              <>
                <div className="h-10 w-px bg-border" />
                <SlaCountdown deadline={alert.slaDeadline} className="text-sm" />
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground xl:justify-end">
            <span className="inline-flex items-center gap-1.5">
              <Avatar className="size-5">
                <AvatarFallback className="bg-primary/10 text-[0.6rem] font-semibold text-primary">
                  {alert.analyst?.name ? getInitials(alert.analyst.name) : "—"}
                </AvatarFallback>
              </Avatar>
              {alert.analyst?.name || "Unassigned"}
            </span>
            {alert.linkedCase ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
                onClick={() => router.push(`/dashboard/client/monitoring-and-cases/case-manager/${alert.linkedCase.id}`)}
              >
                <IconLink className="size-3.5" />
                Case <IdChip>{alert.linkedCase.uid || alert.linkedCase.id}</IdChip>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5"><IconLink className="size-3.5" />Not escalated</span>
            )}
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {canReview && (
            <Button size="sm" onClick={handleReview} disabled={busy === "review"}>
              {busy === "review" ? <IconLoader2 className="size-4 animate-spin" /> : <IconEye className="size-4" />}
              Start review
            </Button>
          )}
          {!alert.isClosed && (
            <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
              <IconUserPlus className="size-4" />
              {alert.analyst ? "Reassign" : "Assign analyst"}
            </Button>
          )}
          {canEscalate && (
            <EscalateDialog alert={alert} busy={busy === "escalate"} onEscalate={handleEscalate} />
          )}
          {alert.linkedCase && (
            <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/client/monitoring-and-cases/case-manager/${alert.linkedCase.id}`)}>
              <IconLink className="size-4" />
              Open case
            </Button>
          )}
          {canDismiss && (
            <>
              <ReasonAlertDialog
                title="Dismiss this alert?"
                description="The alert closes as not suspicious. Your reason is recorded in the audit trail."
                actionLabel="Dismiss"
                destructive
                onConfirm={handleDismiss("dismissed")}
                trigger={
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-danger" disabled={busy === "dismiss"}>
                      <IconX className="size-4" />
                      Dismiss
                    </Button>
                  </AlertDialogTrigger>
                }
              />
              <ReasonAlertDialog
                title="Mark as false positive?"
                description="The alert closes and the rule hit is flagged for tuning. A reason is required."
                actionLabel="Mark false positive"
                onConfirm={handleDismiss("false_positive")}
                trigger={
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={busy === "dismiss"}>
                      <IconShieldCheck className="size-4" />
                      False positive
                    </Button>
                  </AlertDialogTrigger>
                }
              />
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {alert.transaction && (
            <Button size="sm" variant="ghost" onClick={() => onOpenTab?.("transaction")}>
              Transaction <IconArrowRight className="size-4" />
            </Button>
          )}
          {alert.customer && (
            <Button size="sm" variant="ghost" onClick={() => onOpenTab?.("customer")}>
              Customer <IconArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {assignOpen && (
        <AssignAnalystForm
          open={assignOpen}
          setOpen={setAssignOpen}
          id={alert.id}
          onAssigned={() => onRefresh?.()}
        />
      )}
    </div>
  );
}
