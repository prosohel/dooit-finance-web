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

  return (
    <div className="rounded-xl border border-border bg-white px-5 py-3.5 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:gap-6">
        {/* Title leads; everything that describes the case sits on one line under it. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="truncate text-lg font-bold text-heading">
            {caseData.title || caseData.caseName}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="rounded border bg-muted px-1.5 py-px font-mono text-[11px] font-semibold text-heading">
              {caseData.displayId || caseData.uid}
            </span>
            <StatusPill variant={statusVariants[statusKey] || "outline"}>
              {STATUS_LABELS[statusKey] || status}
            </StatusPill>
            <StatusPill variant={priorityVariants[priorityKey] || "outline"}>
              <span className="capitalize">{priority}</span>&nbsp;priority
            </StatusPill>
            <span className="capitalize">
              {[caseData.customerType, (caseData.caseType || caseData.type || "").replace("_", " ")]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <IconCalendar className="size-3" />
              {dateShowFormatWithTime(caseData.createdDate)}
            </span>
            <span className="flex items-center gap-1">
              <IconRefresh className="size-3" />
              {dateShowFormatWithTime(caseData.lastUpdated)}
            </span>
          </div>
        </div>

        {/* Stat rail: risk · SLA · investigator */}
        <div className="flex shrink-0 items-center gap-4">
          <RiskScoreGauge score={caseData.riskScore} size={40} strokeWidth={4} label="Risk Score" />
          <div className="h-8 w-px bg-border" />
          <SlaCountdown deadline={caseData.slaDeadline} />
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary/10 text-[0.6rem] font-semibold text-primary">
                {getInitials(assignedAnalyst)}
              </AvatarFallback>
            </Avatar>
            <span className="leading-tight">
              Investigator
              <br />
              <span className="font-semibold text-heading">{assignedAnalyst || "Unassigned"}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={onOpenAssign}>
          <IconUserCheck className="size-3.5" />
          Assign Case
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onOpenRFI}>
          <IconMessageCircle className="size-3.5" />
          Request Information
        </Button>

        <ReasonAlertDialog
          trigger={
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
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
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
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
            className="ml-auto h-8 gap-1.5 text-xs"
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
                  className="ml-auto h-8 gap-1.5 text-xs text-danger hover:text-danger"
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
            <Button variant="ghost" size="icon-sm">
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
    </div>
  );
}
