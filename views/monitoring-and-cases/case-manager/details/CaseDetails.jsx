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

// Section navigation: a quiet vertical list. The active item gets a tinted
// fill and a primary accent bar; everything else stays muted so the content
// panel, not the nav, holds the eye. Colour-only transitions — this is clicked
// tens of times a session, so no motion beyond that.
const navItemClass =
  "group relative h-20 px-4 w-full justify-start gap-2.5 rounded-md border-0 bg-transparent py-4 text-[13px] font-medium text-muted-foreground shadow-none transition-colors hover:bg-muted/70 hover:text-foreground before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-primary before:opacity-0 data-[state=active]:bg-primary/[0.07] data-[state=active]:text-heading data-[state=active]:shadow-none data-[state=active]:before:opacity-100 flex flex-col";

// Collapsed rail: icon-only square, with the label in a tooltip.
const navIconClass =
  "size-9 shrink-0 flex-none rounded-md border-0 bg-transparent p-0 text-muted-foreground shadow-none transition-colors hover:bg-muted/70 hover:text-foreground data-[state=active]:bg-primary/[0.07] data-[state=active]:text-primary data-[state=active]:shadow-none";

function NavItem({ value, icon: Icon, label, meta, hint, collapsed }) {
  // if (collapsed) {
  //   return (
  //     <Tooltip>
  //       <TooltipTrigger asChild>
  //         <TabsTrigger value={value} aria-label={label} className={navIconClass}>
  //           <Icon className="size-4" />
  //         </TabsTrigger>
  //       </TooltipTrigger>
  //       <TooltipContent side="right">
  //         <p className="font-medium">{label}</p>
  //         <p className="opacity-80">{hint}</p>
  //       </TooltipContent>
  //     </Tooltip>
  //   );
  // }
  return (
    <TabsTrigger value={value} title={hint} className={navItemClass}>
      <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground group-data-[state=active]:text-primary" />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {meta != null && (
        <span className="rounded-md bg-muted px-1.5 py-px text-[11px] font-medium tabular-nums text-muted-foreground group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
          {meta}
        </span>
      )}
    </TabsTrigger>
  );
}

function NavGroup({ label, collapsed, children }) {
  return (
    // In the rail, a hairline replaces the group label — except above the first group.
    <div
      className={
        collapsed
          ? "flex flex-col items-center gap-1 [&:first-child>[data-divider]]:hidden"
          : "flex flex-col gap-0.5"
      }
    >
      {collapsed ? (
        <span aria-hidden data-divider className="my-1 h-px w-5 bg-border" />
      ) : (
        <span className="px-2.5 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          {label}
        </span>
      )}
      {children}
    </div>
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
  const partyCount = (caseData.pois?.length || 0) + (caseData.externalPois?.length || 0);

  const handleTogglePin = (id) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));

  return (
    <div className="flex flex-col gap-6">
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
        className="w-full flex-row items-start gap-6"
      >
        <nav
          aria-label="Case sections"
          className={`sticky top-4 shrink-0 ${navCollapsed ? "w-9" : "w-[232px]"}`}
        >
          <div
            className={`mb-2 flex items-center ${navCollapsed ? "justify-center" : "justify-between pl-2.5"}`}
          >
            {!navCollapsed && (
              <span className="text-xs font-semibold text-heading">Case sections</span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setNavCollapsed((c) => !c)}
                  aria-label={navCollapsed ? "Expand case navigation" : "Collapse case navigation"}
                  aria-expanded={!navCollapsed}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,transform] duration-150 ease-out hover:bg-muted/70 hover:text-foreground active:scale-[0.95]"
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

          <TabsList
            className={` h-auto w-full  grid grid-cols-2 rounded-none bg-transparent border p-0 ${navCollapsed ? "gap-1" : "gap-4"}`}
          >
            <NavGroup label="Investigate" collapsed={navCollapsed}>
              <NavItem
                collapsed={navCollapsed}
                value="investigation-hub"
                icon={IconBriefcase}
                label="Investigation Hub"
                hint="Steps, POIs & findings"
              />
              <NavItem
                collapsed={navCollapsed}
                value="alerts"
                icon={IconAlertTriangle}
                label="Alerts"
                meta={caseData.alerts?.length || 0}
                hint={`${plural(caseData.alerts?.length || 0, "triggered rule hit")}`}
              />
              <NavItem
                collapsed={navCollapsed}
                value="customer-profile"
                icon={IconUser}
                label="Customer Profile"
                hint={
                  [caseData.customerName, caseData.customerType].filter(Boolean).join(" · ") ||
                  "Primary customer"
                }
              />
              <NavItem
                collapsed={navCollapsed}
                value="transactions"
                icon={IconCreditCard}
                label="Transactions"
                meta={caseData.transactions?.length || 0}
                hint={`${plural(caseData.transactions?.length || 0, "transaction")} linked to this case`}
              />
              <NavItem
                collapsed={navCollapsed}
                value="relation-graph"
                icon={IconSitemap}
                label="Relation Graph"
                meta={partyCount}
                hint={`${partyCount} ${partyCount === 1 ? "party" : "parties"} · entity connections`}
              />
            </NavGroup>

            <NavGroup label="Evidence" collapsed={navCollapsed}>
              <NavItem
                collapsed={navCollapsed}
                value="files"
                icon={IconFolder}
                label="Files"
                hint="Evidence & attachments"
              />
              <NavItem
                collapsed={navCollapsed}
                value="source-of-funds"
                icon={IconCoins}
                label="Source of Funds"
                hint="Declared sources · OCR & verification"
              />
              <NavItem
                collapsed={navCollapsed}
                value="tbml-osint"
                icon={FingerprintIcon}
                label="TBML OSINT"
                hint="Trade-based ML & open-source intel"
              />
            </NavGroup>

            <NavGroup label="Filings & record" collapsed={navCollapsed}>
              <NavItem
                collapsed={navCollapsed}
                value="reports"
                icon={IconFileStack}
                label="Reports"
                meta={reportsLoading ? "…" : rfis.length}
                hint={
                  reportsLoading
                    ? "SMR, TTR & RFI filings"
                    : `${plural(rfis.length, "RFI")} · SMR, TTR & RFI filings`
                }
              />
              <NavItem
                collapsed={navCollapsed}
                value="case-activity"
                icon={IconClipboardList}
                label="Case Activity"
                meta={notes.length}
                hint={`${plural(notes.length, "note")} · notes, audit & analysis`}
              />
            </NavGroup>
          </TabsList>
        </nav>

        {/* min-w-0 lets wide tables and graphs scroll inside the panel instead of
            pushing the layout past the viewport. */}
        <div className="min-w-0 flex-1">
          <TabsContent value="investigation-hub">
            <InvestigationHub caseData={caseData} caseId={caseId} onCaseChange={applyCaseUpdate} />
          </TabsContent>
          <TabsContent value="tbml-osint">
            <TbmlOsintReport caseId={caseId} caseData={caseData} />
          </TabsContent>

          <TabsContent value="customer-profile">
            <CustomerProfileTab
              caseData={caseData}
              sectionRef={setSectionRef("customer-profile")}
            />
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
        </div>
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
