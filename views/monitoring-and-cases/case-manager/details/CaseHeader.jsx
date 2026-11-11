"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { duplicateCase } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { downloadReportPdf } from "@/lib/downloadReportPdf";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  IconUserCheck,
  IconMessageCircle,
  IconAlertOctagon,
  IconGavel,
  IconBan,
  IconDots,
  IconPrinter,
  IconFileExport,
  IconCopy,
  IconRotateClockwise,
  IconCalendar,
  IconRefresh,
  IconUser,
} from "@tabler/icons-react";
import { dateShowFormatWithTime, getInitials } from "@/lib/utils";
import RiskScoreGauge from "./components/RiskScoreGauge";
import SlaCountdown from "./components/SlaCountdown";
import ReasonAlertDialog from "./components/ReasonAlertDialog";

// Keyed lowercase to match the Case model enums
// (low | medium | high | critical). Values are normalised before lookup so
// Title-case values from the mock fixtures still resolve.
const priorityVariants = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "outline",
};

const statusVariants = {
  open: "info",
  under_investigation: "warning",
  pending_review: "outline",
  closed: "success",
  escalated: "danger",
};

// Matches the label RiskScoreGauge renders, so the three stats read as a set.
const statLabelClass = "text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground";

// Toolbar buttons: white on the tinted toolbar, with press feedback.
const actionClass = "h-8 gap-1.5 bg-card text-xs active:scale-[0.97]";

const STATUS_LABELS = {
  open: "Open",
  under_investigation: "Under Investigation",
  pending_review: "Pending Review",
  closed: "Closed",
  escalated: "Escalated",
};

export default function CaseHeader({
  caseData,
  status,
  priority,
  assignedAnalyst,
  onOpenAssign,
  onOpenRFI,
  onEscalate,
  onGenerateSTR,
  onCloseCase,
  onReopenCase,
}) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  if (!caseData) return null;

  const caseId = caseData._id || caseData.id;

  // The summary opens in the browser's PDF viewer, whose toolbar prints —
  // same server-rendered document the export downloads.
  const handlePrint = () => {
    window.open(`/api/case/${caseId}/export-pdf?disposition=inline`, "_blank", "noopener");
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const ok = await downloadReportPdf({
        kind: "case",
        id: caseId,
        label: caseData.displayId || caseData.uid,
      });
      if (ok) toast.success("Case summary PDF downloaded");
    } finally {
      setExporting(false);
    }
  };

  const handleDuplicate = async () => {
    if (duplicating) return;
    setDuplicating(true);
    try {
      const res = await duplicateCase(caseId);
      if (res?.succeed && res.data?._id) {
        toast.success(`Case duplicated as ${res.data.uid || "a new case"}`);
        router.push(`/dashboard/client/monitoring-and-cases/case-manager/${res.data._id}`);
      } else {
        toast.error(res?.message || "Could not duplicate the case");
      }
    } catch {
      toast.error("Could not duplicate the case");
    } finally {
      setDuplicating(false);
    }
  };

  const statusKey = String(status ?? "").toLowerCase();
  const priorityKey = String(priority ?? "").toLowerCase();
  const isClosed = statusKey === "closed";
  const caseKind = [
    caseData.customerType,
    (caseData.caseType || caseData.type || "").replace("_", " "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="overflow-hidden rounded-xl ">
      <div className="flex flex-col gap-5  xl:flex-row xl:items-start xl:justify-between xl:gap-8">
        {/* Identity: who/what the case is. ID and state lead as an eyebrow so
            the title can carry the weight on its own line. */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-tight text-muted-foreground">
              {caseData.displayId || caseData.uid}
            </span>
            <StatusPill variant={statusVariants[statusKey] || "outline"}>
              {STATUS_LABELS[statusKey] || status}
            </StatusPill>
            <StatusPill variant={priorityVariants[priorityKey] || "outline"}>
              <span className="capitalize">{priority}</span>&nbsp;priority
            </StatusPill>
          </div>

          <p className="truncate text-sm font-semibold text-neutral-900 tracking-tight ">
            {caseData.title || caseData.caseName}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {caseData.customerName && (
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <IconUser className="size-3.5 text-muted-foreground" />
                {caseData.customerName}
              </span>
            )}
            {caseKind && <span className="capitalize">{caseKind}</span>}
            <span className="flex items-center gap-1">
              <IconCalendar className="size-3.5" />
              Opened {dateShowFormatWithTime(caseData.createdDate)}
            </span>
            <span className="flex items-center gap-1">
              <IconRefresh className="size-3.5" />
              Updated {dateShowFormatWithTime(caseData.lastUpdated)}
            </span>
          </div>
        </div>

        {/* Stat rail: risk · SLA · investigator — one label style across all three. */}
        <dl className="flex shrink-0 items-center divide-x divide-border">
          <div className="pr-5">
            <dt className="sr-only">Risk score</dt>
            <dd>
              <RiskScoreGauge
                score={caseData.riskScore}
                size={40}
                strokeWidth={4}
                label="Risk Score"
              />
            </dd>
          </div>
          <div className="flex flex-col gap-1 px-5 leading-tight">
            <dt className={statLabelClass}>SLA</dt>
            <dd>
              {caseData.slaDeadline ? (
                <SlaCountdown deadline={caseData.slaDeadline} />
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">No deadline</span>
              )}
            </dd>
          </div>
          <div className="flex items-center gap-2.5 pl-5">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-[0.65rem] font-semibold text-primary">
                {getInitials(assignedAnalyst)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 leading-tight">
              <dt className={statLabelClass}>Investigator</dt>
              <dd className="max-w-[160px] truncate text-xs font-semibold text-heading">
                {assignedAnalyst || "Unassigned"}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      {/* Toolbar: routine actions on the left, the state-changing one apart on the right. */}
      <div className="flex flex-wrap items-center gap-2  bg-muted/30  py-2.5">
        <Button size="sm" variant="outline" className={actionClass} onClick={onOpenAssign}>
          <IconUserCheck className="size-3.5" />
          Assign Case
        </Button>
        <Button variant="outline" size="sm" className={actionClass} onClick={onOpenRFI}>
          <IconMessageCircle className="size-3.5" />
          Request Information
        </Button>

        <span aria-hidden className="mx-1 hidden h-5 w-px bg-border sm:block" />

        <ReasonAlertDialog
          trigger={
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className={actionClass}>
                <IconAlertOctagon className="size-3.5" />
                Escalate
              </Button>
            </AlertDialogTrigger>
          }
          title="Escalate this case"
          description="This raises the case priority and notifies the compliance lead. Provide a reason for the audit trail."
          actionLabel="Escalate Case"
          onConfirm={(reason) => {
            onEscalate?.(reason);
            toast.success("Case escalated to Critical priority");
          }}
        />

        <ReasonAlertDialog
          trigger={
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className={actionClass}>
                <IconGavel className="size-3.5" />
                Generate STR/SAR
              </Button>
            </AlertDialogTrigger>
          }
          title="Generate STR/SAR draft"
          description="A draft Suspicious Transaction/Activity Report will be created from this case's evidence for compliance review."
          actionLabel="Generate Draft"
          onConfirm={(reason) => {
            onGenerateSTR?.(reason);
            toast.success("STR/SAR draft created");
          }}
        />

        {/* Destructive action sits apart, on the right, away from the safe ones. */}
        {isClosed ? (
          <Button
            variant="outline"
            size="sm"
            className={`ml-auto ${actionClass}`}
            onClick={() => {
              onReopenCase?.();
              toast.success("Case reopened");
            }}
          >
            <IconRotateClockwise className="size-3.5" />
            Reopen Case
          </Button>
        ) : (
          <ReasonAlertDialog
            destructive
            trigger={
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`ml-auto ${actionClass} text-danger hover:border-danger/30 hover:bg-danger/5 hover:text-danger`}
                >
                  <IconBan className="size-3.5" />
                  Close Case
                </Button>
              </AlertDialogTrigger>
            }
            title="Close this case"
            description="This marks the investigation as closed. You can reopen it later if new evidence emerges."
            actionLabel="Close Case"
            onConfirm={(reason) => {
              onCloseCase?.(reason);
              toast.success("Case closed");
            }}
          />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="More case actions"
              className="active:scale-[0.97]"
            >
              <IconDots className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handlePrint}>
              <IconPrinter className="size-4" />
              Print Case Summary
            </DropdownMenuItem>
            <DropdownMenuItem disabled={exporting} onClick={handleExport}>
              <IconFileExport className="size-4" />
              {exporting ? "Exporting…" : "Export Case PDF"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={duplicating} onClick={handleDuplicate}>
              <IconCopy className="size-4" />
              {duplicating ? "Duplicating…" : "Duplicate Case"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
