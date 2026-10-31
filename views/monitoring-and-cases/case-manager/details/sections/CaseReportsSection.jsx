"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CollapsibleSection from "../components/CollapsibleSection";
import SubCard from "../components/SubCard";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconFileStack,
  IconShieldLock,
  IconFileAlert,
  IconCash,
  IconWorld,
  IconFileAnalytics,
  IconMessageQuestion,
  IconDownload,
  IconEye,
  IconLoader2,
  IconSparkles,
  IconCircleCheck,
  IconSend,
} from "@tabler/icons-react";
import { dateShowFormat } from "@/lib/utils";
import { downloadReportPdf } from "@/lib/downloadReportPdf";
import { draftCaseReport } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import {
  submitSMR,
  approveSMR,
} from "@/app/dashboard/client/report-compliance/smr-filing/smr/actions";

/**
 * Every AUSTRAC filing raised against this case, from GET /cases/:id/reports.
 *
 * The registry below is the single place a report type is declared — the keys
 * match the API payload, and `subtitle` picks whichever secondary identifier
 * that model actually carries. Adding a seventh type is one entry here.
 */
// `draftable` marks the four types the API can draft from the case's own facts
// (docs/74 §6.3); `open` is where an existing record is edited; `pdf` names the
// export endpoint where one exists.
const REPORT_TYPES = [
  {
    key: "ecdd",
    label: "ECDD",
    full: "Enhanced Customer Due Diligence",
    icon: IconShieldLock,
    subtitle: (r) => r.caseNumber || r.customerName || r.fullName,
    draftable: true,
    pdf: "ecdd",
    open: (r) => `/dashboard/client/report-compliance/ecdd/form?id=${r._id}`,
  },
  {
    key: "smr",
    label: "SMR",
    full: "Suspicious Matter Report",
    icon: IconFileAlert,
    subtitle: (r) => r.caseNumber || r.metadata?.austracReference,
    draftable: true,
    pdf: "smr",
    open: (r) => `/dashboard/client/report-compliance/smr-filing/smr/form/detail?id=${r._id}`,
  },
  {
    key: "ttr",
    label: "TTR",
    full: "Threshold Transaction Report",
    icon: IconCash,
    subtitle: (r) => r.referenceNumber,
    open: (r) => `/dashboard/client/report-compliance/ttr/form/detail?id=${r._id}`,
  },
  {
    key: "ifti",
    label: "IFTI",
    full: "International Funds Transfer Instruction",
    icon: IconWorld,
    subtitle: () => null,
    open: (r) => `/dashboard/client/report-compliance/ifti/form/detail?id=${r._id}`,
  },
  {
    key: "gfs",
    label: "GFS",
    full: "Global Financial Sanctions",
    icon: IconFileAnalytics,
    subtitle: (r) => r.customerUID || r.customerName,
    draftable: true,
    pdf: "gfs",
    open: (r) => `/dashboard/client/report-compliance/smr-filing/gfs/form/detail?id=${r._id}`,
  },
  {
    key: "rfi",
    label: "RFI",
    full: "Request for Information",
    icon: IconMessageQuestion,
    subtitle: (r) => r.primaryContactName,
    draftable: true,
  },
  {
    key: "dismissal",
    label: "Dismissal",
    full: "Alert dismissal record",
    icon: IconCircleCheck,
    subtitle: (r) => r.title || r.dismissalType,
    // Scoped to one alert rather than the case, so drafting one asks which.
    draftable: true,
    perAlert: true,
    pdf: "dismissal",
  },
];

const DRAFTABLE = REPORT_TYPES.filter((t) => t.draftable);

// Report models each carry their own status enum; band them by meaning rather
// than maintaining six separate maps.
const statusVariant = (status) => {
  const s = String(status || "").toLowerCase();
  if (["approved", "submitted", "completed", "lodged", "closed", "responded"].includes(s))
    return "success";
  if (["rejected", "failed", "overdue", "cancelled"].includes(s)) return "danger";
  if (["draft", "pending", "in_review", "under_review", "sent"].includes(s)) return "warning";
  return "outline";
};

const humanize = (value) =>
  !value
    ? "—"
    : String(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (ch) => ch.toUpperCase());

export default function CaseReportsSection({
  caseId,
  alerts = [],
  reports,
  summary,
  loading,
  onDrafted,
  sectionRef,
}) {
  const router = useRouter();
  const total = summary?.total ?? 0;
  const [drafting, setDrafting] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [workflow, setWorkflow] = useState(null);

  /**
   * Draft one report for this case. The API computes every figure from our own
   * models and takes only the narrative from the AI service (docs/74 §6.3), so
   * what comes back is a real record — already saved and linked to the case.
   *
   * `alertId` is required for a dismissal, which closes one alert rather than
   * describing the case as a whole.
   */
  const handleDraft = async (type, label, alertId) => {
    setDrafting(type);
    try {
      const res = await draftCaseReport(caseId, type, alertId ? { alertId } : {});
      if (!res?.succeed) {
        toast.error(res?.message || `Could not draft the ${label}`);
        return;
      }
      const aiError = res.data?.aiMeta?.error?.code;
      const scope = res.data?.aiMeta?.scope;

      if (scope?.mismatch) {
        // The figures on the draft are this client's; the prose may not be.
        toast.warning(
          `${label} drafted, but the narrative needs a careful read: the summary service saw ` +
            `${scope.theirTransactionCount ?? "?"} transaction(s) where this client's case has ` +
            `${scope.ourTransactionCount ?? "?"}. Its wording may describe activity outside this client.`,
          { duration: 12000 }
        );
      } else {
        toast[aiError ? "warning" : "success"](
          aiError
            ? `${label} drafted from case data — the narrative service was unavailable (${aiError}).`
            : res.created
              ? `${label} drafted for review.`
              : `${label} already exists — opened the existing draft.`
        );
      }
      await onDrafted?.();
    } catch (e) {
      console.error("Failed to draft report", e);
      toast.error(`Could not draft the ${label}`);
    } finally {
      setDrafting(null);
    }
  };

  const handleExport = async (type, report) => {
    setExporting(report._id);
    try {
      await downloadReportPdf({ kind: type.pdf, id: report._id, label: report.uid });
    } finally {
      setExporting(null);
    }
  };

  /**
   * Move an SMR draft → review → approved. An approved SMR is what makes the
   * case's "SAR filed" derivation true, so without this the pill could never
   * light up (docs/74 C14).
   */
  const handleSmrWorkflow = async (report) => {
    const submitting = String(report.status).toLowerCase() === "draft";
    setWorkflow(report._id);
    try {
      const res = submitting ? await submitSMR(report._id) : await approveSMR(report._id);
      if (res?.succeed) {
        toast.success(submitting ? "SMR submitted for review." : "SMR approved — SAR recorded as filed.");
        await onDrafted?.();
      } else {
        toast.error(res?.message || "Could not update the SMR");
      }
    } catch (e) {
      console.error("SMR workflow failed", e);
      toast.error("Could not update the SMR");
    } finally {
      setWorkflow(null);
    }
  };

  return (
    <CollapsibleSection
      id="reports"
      title="Regulatory Filings"
      icon={IconFileStack}
      badge={loading ? undefined : total}
      defaultOpen
      sectionRef={sectionRef}
      actions={
        caseId ? (
          <div className="flex items-center gap-2">
            <StatusPill variant={summary?.sarFiled ? "success" : "muted"}>
              {summary?.sarFiled ? "SAR filed" : "No SAR filed"}
            </StatusPill>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={!!drafting}>
                  {drafting ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    <IconSparkles className="size-3.5" />
                  )}
                  Draft a report
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Built from this case&apos;s data — review before filing
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {DRAFTABLE.filter((t) => !t.perAlert).map((t) => (
                  <DropdownMenuItem key={t.key} onClick={() => handleDraft(t.key, t.label)}>
                    {t.label} — {t.full}
                  </DropdownMenuItem>
                ))}

                {/* A dismissal closes one alert, so it asks which one. */}
                {DRAFTABLE.filter((t) => t.perAlert).map((t) => (
                  <DropdownMenuSub key={t.key}>
                    <DropdownMenuSubTrigger disabled={alerts.length === 0}>
                      {t.label} — {t.full}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-72">
                      {alerts.length === 0 ? (
                        <DropdownMenuItem disabled>No alerts on this case</DropdownMenuItem>
                      ) : (
                        alerts.map((a) => (
                          <DropdownMenuItem
                            key={a.id}
                            onClick={() => handleDraft(t.key, `${t.label} for ${a.uid}`, a.id)}
                          >
                            <span className="flex flex-col">
                              <span className="font-mono text-xs">{a.uid}</span>
                              <span className="text-xs text-muted-foreground">
                                {a.ruleName || a.ruleId || "—"}
                              </span>
                            </span>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null
      }
    >
      {loading ? (
        <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((type) => {
            const { key, label, icon, subtitle } = type;
            const list = reports?.[key] || [];
            return (
              <SubCard
                key={key}
                icon={icon}
                title={label}
                count={list.length}
                empty={`No ${label} filed.`}
              >
                <div className="divide-y">
                  {list.map((r, i) => {
                    const sub = subtitle(r);
                    return (
                      <div
                        key={r._id || r.uid || i}
                        className="flex items-start justify-between gap-2 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-semibold text-heading">
                            {r.uid || r._id}
                          </p>
                          {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
                          <p className="text-xs text-muted-foreground">
                            {dateShowFormat(r.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {/* The summary service is not tenant-scoped, so its
                              prose can describe another client's activity. The
                              figures on the record are always this client's. */}
                          {r.aiMeta?.scope?.mismatch && (
                            <StatusPill variant="warning" title="The narrative may describe activity outside this client — read before filing.">
                              Check narrative scope
                            </StatusPill>
                          )}
                          {/* Our own blocking conditions, stated plainly. */}
                          {r.requiresEscalation && (
                            <StatusPill variant="danger">Escalation advised</StatusPill>
                          )}
                          <StatusPill variant={statusVariant(r.status)}>
                            {humanize(r.status)}
                          </StatusPill>
                          {key === "smr" && ["draft", "review"].includes(String(r.status).toLowerCase()) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              title={String(r.status).toLowerCase() === "draft" ? "Submit for review" : "Approve"}
                              disabled={workflow === r._id}
                              onClick={() => handleSmrWorkflow(r)}
                            >
                              {workflow === r._id ? (
                                <IconLoader2 className="size-4 animate-spin" />
                              ) : String(r.status).toLowerCase() === "draft" ? (
                                <IconSend className="size-4" />
                              ) : (
                                <IconCircleCheck className="size-4" />
                              )}
                            </Button>
                          )}
                          {type.open && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              title={`Open ${label}`}
                              onClick={() => router.push(type.open(r))}
                            >
                              <IconEye className="size-4" />
                            </Button>
                          )}
                          {type.pdf && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              title="Export PDF"
                              disabled={exporting === r._id}
                              onClick={() => handleExport(type, r)}
                            >
                              {exporting === r._id ? (
                                <IconLoader2 className="size-4 animate-spin" />
                              ) : (
                                <IconDownload className="size-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SubCard>
            );
          })}
        </div>
      )}

      {!loading && total === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Nothing filed yet. &ldquo;Draft a report&rdquo; builds one from this case&apos;s own
          customers, alerts and transactions — the figures are computed here, and only the
          narrative comes from the summary service. Every draft needs analyst review before filing.
        </p>
      )}

      <p className="sr-only">
        {REPORT_TYPES.map((t) => `${t.label} — ${t.full}`).join("; ")}
      </p>
    </CollapsibleSection>
  );
}
