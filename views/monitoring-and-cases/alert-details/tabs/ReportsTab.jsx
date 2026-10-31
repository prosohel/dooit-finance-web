"use client";

// Reports: every compliance report raised from this alert — ECDD, SMR, TTR,
// IFTI, GFS, RFI — from GET /alert/:id/reports (alert ref, legacy caseNumber
// and the linked case), with open / export actions and the entry points to
// file a new one. Works before escalation; the case link is shown when present.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconDownload, IconEye, IconFilePlus, IconFileText, IconLink, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CollapsibleSection from "@/views/monitoring-and-cases/case-manager/details/components/CollapsibleSection";
import { toast } from "sonner";
import { getAlertReports } from "@/app/dashboard/client/monitoring-and-cases/case-list/actions";
import { draftCaseReport } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { downloadReportPdf } from "@/lib/downloadReportPdf";
import { CaseRequestForm } from "@/views/monitoring-and-cases/case-details/ecdd/RFIForm";
import { Mono, IdChip, EmptyState, SimpleTable, fmtDate } from "../components";

// Report family → label, where its record opens, and whether a PDF export exists.
const REPORT_TYPES = {
  ecdd: { label: "ECDD", open: (r, alert) => `/dashboard/client/monitoring-and-cases/alerts/${alert.id}?tab=ecdd-review`, edit: (r) => `/dashboard/client/report-compliance/ecdd/form?id=${r._id}`, pdf: "ecdd" },
  smr: { label: "SMR", open: (r) => `/dashboard/client/report-compliance/smr-filing/smr/form/detail?id=${r._id}`, pdf: "smr" },
  ttr: { label: "TTR", open: (r) => `/dashboard/client/report-compliance/ttr/form/detail?id=${r._id}` },
  ifti: { label: "IFTI", open: (r) => `/dashboard/client/report-compliance/ifti/form/detail?id=${r._id}` },
  gfs: { label: "GFS", open: (r) => `/dashboard/client/report-compliance/smr-filing/gfs/form/detail?id=${r._id}`, pdf: "gfs" },
  rfi: { label: "RFI", open: (r, alert) => `/dashboard/client/monitoring-and-cases/alerts/${alert.id}?tab=rfi` },
  // Alert dismissal records (docs/74 §4.5). There is no standalone viewer yet —
  // they are listed and approved on the case they belong to.
  dismissal: {
    label: "Dismissal",
    open: (r, alert) =>
      r.case || alert.linkedCase
        ? `/dashboard/client/monitoring-and-cases/case-manager/${r.case || alert.linkedCase.id}`
        : `/dashboard/client/monitoring-and-cases/alerts/${alert.id}`,
  },
};

// Status strings differ per model — map the ones we know to a pill variant.
const statusVariant = (status = "") => {
  const s = String(status).toLowerCase();
  if (["approved", "active", "closed", "completed", "submitted", "responded"].includes(s)) return "success";
  if (["review", "in_review", "pending followup", "pending review", "sent", "under_review"].includes(s)) return "info";
  if (["final notice", "blocked", "rejected", "inactive", "overdue"].includes(s)) return "danger";
  if (["draft", "pending", "new"].includes(s)) return "muted";
  return "outline";
};

const reference = (r) => r.metadata?.austracReference || r.referenceNumber || r.caseNumber || r.customerUID || r.primaryContactName || null;

export default function ReportsTab({ alert, onOpenTab }) {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, rows: [], counts: {}, total: 0, sarFiled: false });
  const [exporting, setExporting] = useState(null);
  const [filter, setFilter] = useState("all");
  const [openRfi, setOpenRfi] = useState(false);
  const [caseNumber, setCaseNumber] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await getAlertReports(alert.id);
      if (res?.succeed) {
        const data = res.data || {};
        const rows = Object.keys(REPORT_TYPES)
          .flatMap((key) => (data[key] || []).map((doc) => ({ ...doc, _type: key })))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setState({ loading: false, rows, counts: res.summary?.counts || {}, total: res.summary?.total || 0, sarFiled: !!res.summary?.sarFiled });
        return;
      }
      setState((s) => ({ ...s, loading: false }));
    } catch (e) {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [alert.id]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => (filter === "all" ? state.rows : state.rows.filter((r) => r._type === filter)), [state.rows, filter]);

  const handleExport = async (row) => {
    const kind = REPORT_TYPES[row._type]?.pdf;
    if (!kind) return;
    setExporting(row._id);
    try { await downloadReportPdf({ kind, id: row._id, label: row.uid }); } finally { setExporting(null); }
  };

  const fileNew = {
    ecdd: () => router.push(`/dashboard/client/report-compliance/ecdd/form?caseNumber=${alert.uid}`),
    smr: () => router.push(`/dashboard/client/report-compliance/smr-filing/smr/form?caseNumber=${alert.uid}&caseId=${alert.id}`),
    ttr: () => router.push(`/dashboard/client/report-compliance/ttr/form?caseNumber=${alert.uid}&alertId=${alert.id}`),
    ifti: () => router.push(`/dashboard/client/report-compliance/ifti/form?caseNumber=${alert.uid}&alertId=${alert.id}`),
    gfs: () => router.push(`/dashboard/client/report-compliance/smr-filing/gfs/form?caseNumber=${alert.uid}&alertId=${alert.id}`),
    rfi: () => { setCaseNumber(alert.uid); setOpenRfi(true); },
    // Drafted rather than opened in a form: a dismissal is built from the
    // case's own evidence (docs/74 §4.5). The endpoint resolves the alert's
    // case for us, so the alert's uid is a valid reference.
    dismissal: async () => {
      const res = await draftCaseReport(alert.uid, "dismissal", { alertId: alert.id }).catch(() => null);
      if (!res?.succeed) {
        toast.error(res?.message || "Could not draft the dismissal — escalate the alert to a case first.");
        return;
      }
      toast.success(
        res.created ? "Dismissal drafted — review and approve it on the case." : "A dismissal already exists for this alert."
      );
      await load();
    },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* summary strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setFilter("all")} className="rounded-md focus:outline-none">
            <StatusPill variant={filter === "all" ? "default" : "outline"}>All · {state.total}</StatusPill>
          </button>
          {Object.entries(REPORT_TYPES).map(([key, t]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className="rounded-md focus:outline-none" title={`Show ${t.label} only`}>
              <StatusPill variant={filter === key ? "default" : state.counts[key] ? "info" : "muted"}>{t.label} · {state.counts[key] || 0}</StatusPill>
            </button>
          ))}
          <StatusPill variant={state.sarFiled ? "success" : "muted"}>{state.sarFiled ? "SAR filed" : "No SAR filed"}</StatusPill>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm"><IconFilePlus className="size-4" /> File a report</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries(REPORT_TYPES).map(([key, t]) => (
              <DropdownMenuItem key={key} onClick={fileNew[key]}>{t.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CollapsibleSection
        id="reports"
        title="Linked reports"
        icon={IconFileText}
        badge={state.loading ? null : visible.length}
        actions={
          alert.linkedCase ? (
            <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/client/monitoring-and-cases/case-manager/${alert.linkedCase.id}`)}>
              <IconLink className="size-4" /> Case {alert.linkedCase.uid || ""} <IconArrowRight className="size-4" />
            </Button>
          ) : null
        }
      >
        {state.loading ? (
          <div className="flex flex-col gap-2"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div>
        ) : (
          <SimpleTable
            emptyText={
              filter === "all"
                ? `No reports have been filed from this alert yet${alert.linkedCase ? "" : " — ECDD and RFI can be raised now; SMR, TTR, IFTI and GFS usually follow escalation"}.`
                : `No ${REPORT_TYPES[filter].label} reports for this alert.`
            }
            columns={[
              { key: "_type", header: "Type", width: "90px", render: (r) => <StatusPill variant="outline">{REPORT_TYPES[r._type].label}</StatusPill> },
              { key: "uid", header: "Report", width: "1.3fr", render: (r) => r.uid ? <Mono>{r.uid}</Mono> : <span className="text-muted-foreground">—</span> },
              { key: "status", header: "Status", width: "130px", render: (r) => <StatusPill variant={statusVariant(r.status)}>{r.status || "—"}</StatusPill> },
              { key: "ref", header: "Reference", width: "1.2fr", render: (r) => reference(r) || "—" },
              { key: "createdAt", header: "Created", width: "1fr", render: (r) => fmtDate(r.createdAt) },
              { key: "updatedAt", header: "Updated", width: "1fr", render: (r) => fmtDate(r.updatedAt) },
              {
                key: "actions", header: "", width: "150px",
                render: (r) => {
                  const t = REPORT_TYPES[r._type];
                  const isTab = r._type === "ecdd" || r._type === "rfi";
                  return (
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => (isTab ? onOpenTab?.(r._type === "ecdd" ? "ecdd-review" : "rfi") : router.push(t.open(r, alert)))}>
                        <IconEye className="size-4" /> Open
                      </Button>
                      {t.pdf && (
                        <Button size="sm" variant="ghost" disabled={exporting === r._id} onClick={() => handleExport(r)} title="Export PDF">
                          {exporting === r._id ? <IconLoader2 className="size-4 animate-spin" /> : <IconDownload className="size-4" />}
                        </Button>
                      )}
                    </div>
                  );
                },
              },
            ]}
            rows={visible}
            rowKey={(r) => `${r._type}-${r._id}`}
          />
        )}
      </CollapsibleSection>

      {!alert.linkedCase && (
        <EmptyState className="justify-start gap-2 text-left">
          <IconLink className="size-4 shrink-0" />
          <span>This alert is not escalated. Reports filed now are linked to the alert; escalating later links them to the case as well.</span>
        </EmptyState>
      )}

      {openRfi && <CaseRequestForm open={openRfi} setOpen={setOpenRfi} getRFI={load} caseNumber={caseNumber} setCaseNumber={setCaseNumber} />}
      {alert.linkedCase && (
        <div className="flex items-center gap-2">
          <IdChip>{alert.linkedCase.uid || alert.linkedCase.id}</IdChip>
          <span className="text-xs text-muted-foreground">Reports filed against the case appear here too.</span>
        </div>
      )}
    </div>
  );
}
