"use client";

import { useRef, useState, lazy, Suspense, useEffect } from "react";
import {
  IconFolderOff,
  IconBriefcase,
  IconUser,
  IconCreditCard,
  IconFolder,
  IconClipboardList,
  IconLoader2,
  IconSitemap,
  IconCoins,
  IconFileStack,
  IconAlertTriangle,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCaseById,
  getCaseReports,
  getCaseNotes,
  getAuditLog,
  getCaseAnalysis,
  getCustomerDevices,
  addNote as addNoteAction,
} from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { useCaseManagerStore } from "@/app/store/useCaseManagerStore";
import {
  adaptCase,
  adaptNotes,
  adaptAuditLog,
  adaptRfis,
  adaptPreviousSARs,
  adaptDevices,
} from "./caseAdapter";
import CaseHeader from "./CaseHeader";
import CustomerProfileTab from "./tabs/CustomerProfileTab";
import CaseReportsSection from "./sections/CaseReportsSection";
import TransactionAnalysisSection from "./sections/TransactionAnalysisSection";
import CaseActivityView from "./CaseActivityView";
import InvestigationHub from "./investigation-hub/InvestigationHub";
import CreateRFIModal from "./modals/CreateRFIModal";
import ReassignCaseModal from "./modals/ReassignCaseModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import NetworkGraph from "@/views/onboarding/customer-queue/details/d3/Networkgraph";
import { transformToGraph } from "@/views/onboarding/customer-queue/details/d3/lib/transformgraphData";
import partyEntities from "@/views/onboarding/customer-queue/details/demo.json";
import { FingerprintIcon } from "lucide-react";
import TbmlOsintReport from "./tabs/components/TbmlOsintReport";
import useBreadcrumbLabel from "@/hooks/useBreadcrumbLabel";
import AlertDetailsPanel from "./investigation-hub/AlertDetailsPanel";

const FilesTab = lazy(() => import("./tabs/FilesTab"));
// Pulls in the OCR detail dialog and its table — only loaded if the tab opens.
const SourceOfFundsTab = lazy(() => import("./tabs/SourceOfFundsTab"));
const graphData = transformToGraph(partyEntities);

function TabSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Each tab is a summary card: a small labelled header, a headline figure and a
// one-line hint — so the navigation doubles as an at-a-glance case overview.
const tabCardClass =
  "group h-auto w-full min-w-0 flex-col items-stretch justify-start gap-0 whitespace-normal rounded-lg border border-border bg-card px-3 py-3 text-left text-foreground shadow-none transition-colors hover:border-zinc-300 hover:bg-zinc-50/60 data-[state=active]:border-primary data-[state=active]:bg-primary/[0.03] data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/20";

// Collapsed rail: icon-only square, with the label in a tooltip.
const tabIconClass =
  "size-10 shrink-0 flex-none rounded-lg border border-border bg-card p-0 text-muted-foreground shadow-none transition-colors hover:border-zinc-300 hover:bg-zinc-50/60 data-[state=active]:border-primary data-[state=active]:bg-primary/[0.03] data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/20";

function TabCard({ value, icon: Icon, label, headline, hint, collapsed, className = "" }) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <TabsTrigger value={value} aria-label={label} className={tabIconClass}>
            <Icon className="size-4" />
          </TabsTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{label}</p>
          <p className="opacity-80">{headline}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <TabsTrigger value={value} className={`${tabCardClass} ${className}`}>
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-data-[state=active]:text-primary">
        <Icon className="size-3.5" />
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-2 truncate text-sm font-semibold text-foreground">{headline}</span>
      <span className="mt-0.5 truncate text-[11px] font-normal text-muted-foreground">{hint}</span>
    </TabsTrigger>
  );
}

export default function CaseDetails({ caseId }) {
  const { setSelectedCase } = useCaseManagerStore();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useBreadcrumbLabel(caseData && `Case ${caseData.displayId || caseData.uid}`);

  const [status, setStatus] = useState(caseData?.status);
  const [priority, setPriority] = useState(caseData?.priority);
  const [assignedAnalyst, setAssignedAnalyst] = useState(caseData?.assignedAnalyst);
  const [assignment, setAssignment] = useState(caseData?.assignment);
  const [notes, setNotes] = useState(caseData?.notes || []);
  const [rfis, setRfis] = useState(caseData?.rfis || []);
  const [activities, setActivities] = useState(caseData?.activities || []);
  const [auditLog, setAuditLog] = useState(caseData?.auditLog || []);

  const [assignOpen, setAssignOpen] = useState(false);
  const [rfiOpen, setRfiOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  // Regulatory filings live on their own endpoint so the case document stays
  // lean; they load alongside the case rather than blocking it.
  const [reports, setReports] = useState(null);
  const [reportsSummary, setReportsSummary] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(true);

  // The case's transaction analysis (GET /cases/:id/analysis) — the figures the
  // Case Analysis panel shows and every report draft is built from. Served from
  // a server-side snapshot, so loading it with the case is cheap.
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  // "Recompute" on the panel: force a fresh pass rather than the snapshot.
  const refreshAnalysis = async () => {
    const res = await getCaseAnalysis(caseId, { refresh: true }).catch(() => null);
    if (res?.succeed) setAnalysis(res.data);
  };

  // A case write (POI added/removed…) returns the populated case. Re-adapt it,
  // but keep what came from the companion endpoints, then pull the audit log
  // so the write's server-side audit row shows. Customer POIs change what the
  // transaction analysis covers, so those also recompute it.
  const applyCaseUpdate = (apiCase, { refreshAnalysis: recompute = false } = {}) => {
    if (!apiCase) return;
    setCaseData((prev) => {
      const next = adaptCase(apiCase);
      if (!prev) return next;
      return {
        ...next,
        rfis: prev.rfis,
        previousSARs: prev.previousSARs,
        notes: prev.notes,
        auditLog: prev.auditLog,
        devices: prev.devices,
      };
    });
    getAuditLog(caseId)
      .then((res) => res?.succeed && setAuditLog(adaptAuditLog(res.data)))
      .catch(() => {});
    if (recompute) refreshAnalysis();
  };

  // After drafting a report, pull the filings again so the new record appears —
  // and with them the RFI list, which is the same payload.
  const refreshReports = async () => {
    const res = await getCaseReports(caseId).catch(() => null);
    if (!res?.succeed) return;
    setReports(res.data);
    setReportsSummary(res.summary);
    setRfis(adaptRfis(res.data?.rfi));
  };

  const sectionRefs = useRef({});
  const setSectionRef = (id) => (el) => {
    sectionRefs.current[id] = el;
  };

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setReportsLoading(true);
      setAnalysisLoading(true);
      setError(null);
      // Server actions from one client run one at a time, so firing all five
      // up front makes the case document queue behind four companions and the
      // page sit on "Loading case..." for the sum of them. The case loads
      // alone first and paints; the companions follow and merge in.
      const settle = () => {
        if (cancelled) return;
        setReportsLoading(false);
        setAnalysisLoading(false);
      };
      try {
        const res = await getCaseById(caseId);
        if (cancelled) return;

        if (res?.succeed) {
          const reportsReq = getCaseReports(caseId).catch(() => null);
          const notesReq = getCaseNotes(caseId).catch(() => null);
          const auditReq = getAuditLog(caseId).catch(() => null);
          const analysisReq = getCaseAnalysis(caseId).catch(() => null);
          // Normalise the API document into the shape the sections expect.
          const loaded = adaptCase(res.data);
          setCaseData(loaded);
          setSelectedCase(loaded);
          // Seed the action state from the loaded case. These drive the header
          // badges and the action bar, and are updated optimistically by the
          // handlers below — the `useState` initialisers above run before the
          // fetch resolves, so they cannot do this on their own.
          setStatus(loaded?.status);
          setPriority(loaded?.priority);
          setAssignedAnalyst(loaded?.assignedAnalyst ?? loaded?.assignedTo?.name);
          setAssignment(loaded?.assignment);
          setNotes(loaded?.notes || []);
          setRfis(loaded?.rfis || []);
          setActivities(loaded?.activities || []);
          setAuditLog(loaded?.auditLog || []);

          // Companions merge in as each lands. Attached only after the case is
          // on screen, so a fast companion can never be overwritten by the
          // case's own empty defaults.
          notesReq.then((notesRes) => {
            if (cancelled || !notesRes?.succeed) return;
            const adapted = adaptNotes(notesRes.data);
            setNotes(adapted);
            setCaseData((prev) => (prev ? { ...prev, notes: adapted } : prev));
          });
          auditReq.then((auditRes) => {
            if (cancelled || !auditRes?.succeed) return;
            const adapted = adaptAuditLog(auditRes.data);
            setAuditLog(adapted);
            setCaseData((prev) => (prev ? { ...prev, auditLog: adapted } : prev));
          });
          reportsReq
            .then((reportsRes) => {
              if (cancelled) return;
              const filings = reportsRes?.succeed ? reportsRes.data : null;
              const adaptedRfis = adaptRfis(filings?.rfi);
              const sars = adaptPreviousSARs(filings?.smr);
              setRfis(adaptedRfis);
              setCaseData((prev) =>
                prev ? { ...prev, rfis: adaptedRfis, previousSARs: sars } : prev,
              );
            })
            .finally(() => !cancelled && setReportsLoading(false));
          analysisReq
            .then((analysisRes) => {
              if (cancelled) return;
              setAnalysis(analysisRes?.succeed ? analysisRes.data : null);
            })
            .finally(() => !cancelled && setAnalysisLoading(false));

          // Device telemetry for the primary linked customer — loaded after
          // first paint; the tab just stays empty if the user lacks DEVICE.GET.
          const primaryCustomerId = res.data?.linkedCustomers?.[0]?._id;
          if (primaryCustomerId) {
            getCustomerDevices(primaryCustomerId)
              .then((devRes) => {
                if (cancelled) return;
                if (devRes?.success && devRes.data?.length) {
                  setCaseData((prev) =>
                    prev ? { ...prev, devices: adaptDevices(devRes.data) } : prev,
                  );
                }
              })
              .catch(() => {});
          }
        } else {
          setError(res?.message || "Case not found");
          settle();
        }
      } catch {
        if (!cancelled) setError("Failed to load case");
        settle();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      setSelectedCase(null);
    };
  }, [caseId, setSelectedCase]);

  const logAction = ({
    user = "You",
    action,
    previousValue = "—",
    newValue = "—",
    description,
  }) => {
    const now = new Date().toISOString();
    setAuditLog((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: now,
        user,
        action,
        previousValue,
        newValue,
        ip: "10.44.2.18",
        device: "Chrome / Windows 11",
      },
    ]);
    setActivities((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "comment",
        date: now,
        user,
        description: description || action,
      },
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <IconLoader2 className="size-6 animate-spin mr-2" />
        <span className="text-sm">Loading case...</span>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <IconFolderOff className="mb-3 size-12 opacity-40" />
        <p className="text-sm font-medium">Case not found</p>
        <p className="mt-1 text-xs">{error || `The case ID "${caseId}" does not exist.`}</p>
      </div>
    );
  }

  const handleEscalate = (reason) => {
    setPriority((prev) => {
      logAction({
        action: "Case Escalated",
        previousValue: prev,
        newValue: "Critical",
        description: `Case escalated to Critical priority${reason ? `: ${reason}` : ""}`,
      });
      return "Critical";
    });
  };

  const handleGenerateSTR = (reason) => {
    logAction({
      action: "STR/SAR Draft Generated",
      previousValue: "—",
      newValue: "Draft created",
      description: `STR/SAR draft generated${reason ? `: ${reason}` : ""}`,
    });
  };

  const handleCloseCase = (reason) => {
    setStatus((prev) => {
      logAction({
        action: "Case Closed",
        previousValue: prev,
        newValue: "Closed",
        description: `Case closed${reason ? `: ${reason}` : ""}`,
      });
      return "Closed";
    });
  };

  const handleReopenCase = () => {
    setStatus((prev) => {
      logAction({
        action: "Case Reopened",
        previousValue: prev,
        newValue: "Active",
        description: "Case reopened for further investigation",
      });
      return "Active";
    });
  };

  const handleReassign = ({ analyst, reason }) => {
    setAssignedAnalyst((prev) => {
      logAction({
        action: "Reassigned Investigator",
        previousValue: prev,
        newValue: analyst,
        description: `Reassigned from ${prev} to ${analyst}. Reason: ${reason}`,
      });
      setAssignment((prevAssignment) => ({
        ...prevAssignment,
        assignedAnalyst: analyst,
        history: [
          ...(prevAssignment?.history || []),
          { analyst, date: new Date().toISOString(), action: "Reassigned" },
        ],
      }));
      return analyst;
    });
  };

  const handleCreateRFI = ({ documents, dueDate, message }) => {
    const id = `RFI-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setRfis((prev) => [
      ...prev,
      {
        id,
        status: "Pending",
        documents,
        dueDate,
        sentBy: assignedAnalyst,
        sentDate: new Date().toISOString(),
        respondedDate: null,
        message,
      },
    ]);
    logAction({
      action: "RFI Sent",
      previousValue: "—",
      newValue: `${id} sent to customer`,
      description: `RFI ${id} sent requesting ${documents.join(", ")}`,
    });
  };

  // Notes are the one action with a real write endpoint — persist, then
  // reconcile from the server so the note carries its real id and author.
  const handleAddNote = async (note) => {
    setNotes((prev) => [...prev, note]);
    const res = await addNoteAction(caseId, {
      content: note.text ?? note.content ?? "",
      attachments: note.attachment ? [note.attachment] : [],
    }).catch(() => null);
    if (res?.succeed) {
      const fresh = await getCaseNotes(caseId).catch(() => null);
      if (fresh?.succeed) setNotes(adaptNotes(fresh.data));
    }
  };
  const handleTogglePin = (id) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));

  return (
    <div className="flex flex-col gap-[48px]">
      <CaseHeader
        caseData={{ ...caseData, lastUpdated: caseData.lastUpdated }}
        status={status}
        priority={priority}
        assignedAnalyst={assignedAnalyst}
        onOpenAssign={() => setAssignOpen(true)}
        onOpenRFI={() => setRfiOpen(true)}
        onEscalate={handleEscalate}
        onGenerateSTR={handleGenerateSTR}
        onCloseCase={handleCloseCase}
        onReopenCase={handleReopenCase}
      />

      <Tabs
        defaultValue="investigation-hub"
        variant=""
        className="w-full flex flex-row items-start gap-6"
      >
        {/* Bottom padding reserves room for the absolutely-positioned toggle. */}
        <div className="sticky top-4 shrink-0 pb-12">
          <TabsList
            className={
              navCollapsed
                ? "flex h-auto w-10 flex-col items-center gap-2 rounded-none bg-transparent p-0"
                : "grid h-auto w-[340px] grid-cols-2 items-stretch gap-2 rounded-none bg-transparent p-0"
            }
          >
            <TabCard
              collapsed={navCollapsed}
              value="investigation-hub"
              icon={IconBriefcase}
              label="Investigation Hub"
              headline="Workflow"
              hint="Steps, POIs & findings"
            />
            <TabCard
              collapsed={navCollapsed}
              value="alerts"
              icon={IconAlertTriangle}
              label="Alerts"
              headline={plural(caseData.alerts?.length || 0, "Alert")}
              hint="Triggered rule hits"
            />
            <TabCard
              collapsed={navCollapsed}
              value="customer-profile"
              icon={IconUser}
              label="Customer Profile"
              headline={caseData.customerName || "—"}
              hint={caseData.customerType || "Primary customer"}
            />
            <TabCard
              collapsed={navCollapsed}
              value="transactions"
              icon={IconCreditCard}
              label="Transactions"
              headline={plural(caseData.transactions?.length || 0, "Transaction")}
              hint="Linked to this case"
            />
            <TabCard
              collapsed={navCollapsed}
              value="files"
              icon={IconFolder}
              label="Files"
              headline="Documents"
              hint="Evidence & attachments"
            />
            <TabCard
              collapsed={navCollapsed}
              value="source-of-funds"
              icon={IconCoins}
              label="Source of Funds"
              headline="Declared sources"
              hint="OCR & verification"
            />
            <TabCard
              collapsed={navCollapsed}
              value="reports"
              icon={IconFileStack}
              label="Reports"
              headline={reportsLoading ? "Loading…" : plural(rfis.length, "RFI")}
              hint="SMR, TTR & RFI filings"
            />
            <TabCard
              collapsed={navCollapsed}
              value="case-activity"
              icon={IconClipboardList}
              label="Case Activity"
              headline={plural(notes.length, "Note")}
              hint="Notes, audit & analysis"
            />
            <TabCard
              collapsed={navCollapsed}
              value="relation-graph"
              icon={IconSitemap}
              label="Relation Graph"
              headline={plural(
                (caseData.pois?.length || 0) + (caseData.externalPois?.length || 0),
                "Party",
              ).replace(/Partys$/, "Parties")}
              hint="Entity connections"
            />
            <TabCard
              collapsed={navCollapsed}
              value="tbml-osint"
              icon={FingerprintIcon}
              label="TBML OSINT"
              headline="Trade screening"
              hint="Trade-based ML & open-source intel"
            />
          </TabsList>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setNavCollapsed((c) => !c)}
                aria-label={navCollapsed ? "Expand case navigation" : "Collapse case navigation"}
                aria-expanded={!navCollapsed}
                className={`absolute bottom-0 flex size-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-zinc-50 hover:text-foreground ${navCollapsed ? "left-0" : "right-0"}`}
              >
                {navCollapsed ? (
                  <IconLayoutSidebarLeftExpand className="size-4" />
                ) : (
                  <IconLayoutSidebarLeftCollapse className="size-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{navCollapsed ? "Expand" : "Collapse"}</TooltipContent>
          </Tooltip>
        </div>

        <TabsContent value="investigation-hub">
          <InvestigationHub caseData={caseData} caseId={caseId} onCaseChange={applyCaseUpdate} />
        </TabsContent>
        <TabsContent value="tbml-osint">
          <TbmlOsintReport caseId={caseId} caseData={caseData} />
        </TabsContent>

        <TabsContent value="customer-profile">
          <CustomerProfileTab caseData={caseData} sectionRef={setSectionRef("customer-profile")} />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertDetailsPanel caseData={caseData} />
        </TabsContent>

        <TabsContent value="reports">
          <CaseReportsSection
            caseId={caseId}
            alerts={caseData?.alerts}
            reports={reports}
            summary={reportsSummary}
            loading={reportsLoading}
            onDrafted={refreshReports}
            sectionRef={setSectionRef("reports")}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionAnalysisSection
            caseData={caseData}
            sectionRef={setSectionRef("transactions")}
            collapsible={false}
          />
        </TabsContent>

        <TabsContent value="files">
          <Suspense fallback={<TabSkeleton />}>
            <FilesTab caseData={caseData} caseId={caseId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="source-of-funds">
          <Suspense fallback={<TabSkeleton />}>
            <SourceOfFundsTab caseData={caseData} />
          </Suspense>
        </TabsContent>

        <TabsContent value="case-activity">
          <CaseActivityView
            caseData={caseData}
            analysis={analysis}
            analysisLoading={analysisLoading}
            onRefreshAnalysis={refreshAnalysis}
            rfis={rfis}
            onOpenCreateRFI={() => setRfiOpen(true)}
            assignedAnalyst={assignedAnalyst}
            assignment={assignment}
            onOpenReassign={() => setAssignOpen(true)}
            notes={notes}
            onAddNote={handleAddNote}
            onTogglePin={handleTogglePin}
            activities={activities}
            auditLog={auditLog}
            setSectionRef={setSectionRef}
          />
        </TabsContent>
        <TabsContent value="relation-graph">
          <NetworkGraph data={graphData} onNodeClick={() => {}} />
        </TabsContent>
      </Tabs>

      <CreateRFIModal open={rfiOpen} onOpenChange={setRfiOpen} onSubmit={handleCreateRFI} />
      <ReassignCaseModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        currentAnalyst={assignedAnalyst}
        onSubmit={handleReassign}
      />
    </div>
  );
}
