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
  IconUserScan,
  IconFolderPlus,
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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import NetworkGraph from "@/views/onboarding/customer-queue/details/d3/Networkgraph";
import { transformToGraph } from "@/views/onboarding/customer-queue/details/d3/lib/transformgraphData";
import partyEntities from "@/views/onboarding/customer-queue/details/demo.json";
import { FingerprintIcon } from "lucide-react";
import TbmlOsintReport from "./tabs/components/TbmlOsintReport";
import useBreadcrumbLabel from "@/hooks/useBreadcrumbLabel";
import AlertDetailsPanel from "./investigation-hub/AlertDetailsPanel";
import { Button } from "@/components/ui/button";

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

// Section navigation: a 2-column feature grid in the left rail. Each cell
// stacks icon, title and a one-line description; cells are divided by
// hairlines only, so the grid reads as one quiet block. A short marker sits on
// each cell's left hairline at title height: muted on hover, primary when
// active, alongside a faint primary tint. Motion is colour only, plus a small
// press scale on the content, because this nav is clicked tens of times a session.
const navItemClass =
  "group relative flex h-full w-full min-w-0 flex-col items-start justify-start gap-3 whitespace-normal rounded-none border-0 border-r border-b border-border bg-transparent px-4 pt-5 pb-5 text-left font-normal text-muted-foreground shadow-none transition-colors duration-150 ease-out hover:bg-muted/40 data-[state=active]:bg-primary/[0.04] data-[state=active]:text-muted-foreground data-[state=active]:shadow-none dark:data-[state=active]:border-border dark:data-[state=active]:bg-primary/10 before:absolute before:-left-px before:top-[49px] before:h-[18px] before:w-[3px] before:-translate-x-1/2 before:rounded-full before:bg-transparent before:transition-colors before:duration-150 hover:before:bg-muted-foreground/30 data-[state=active]:before:bg-primary";

// Collapsed rail: icon-only square, with the label in a tooltip.
const navIconClass =
  "size-9 shrink-0 flex-none rounded-lg border-0 bg-transparent p-0 text-muted-foreground shadow-none transition-[color,background-color,transform] duration-150 ease-out hover:bg-muted/70 hover:text-foreground active:scale-[0.95] data-[state=active]:bg-primary/[0.08] data-[state=active]:text-primary data-[state=active]:shadow-none";

function NavItem({ value, icon: Icon, label, meta, hint, collapsed }) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <TabsTrigger value={value} aria-label={label} className={navIconClass}>
            <Icon className="size-4" />
          </TabsTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{label}</p>
          <p className="opacity-80">{hint}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <TabsTrigger value={value} title={hint} className={navItemClass}>
      <span className="flex w-full flex-col gap-3 transition-transform duration-150 ease-out group-active:scale-[0.98] motion-reduce:group-active:scale-100">
        <span className="flex items-center justify-between">
          <Icon
            stroke={1.6}
            className="size-[18px] text-foreground/70 transition-colors group-hover:text-foreground group-data-[state=active]:text-primary"
          />
          {meta != null && (
            <span className="text-[11px] font-semibold tabular-nums text-muted-foreground group-data-[state=active]:text-primary">
              {meta}
            </span>
          )}
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-[13px] leading-[18px] font-semibold text-heading group-data-[state=active]:text-primary">
            {label}
          </span>
          {hint && <span className="line-clamp-2 text-xs leading-snug">{hint}</span>}
        </span>
      </span>
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
  const [activeTab, setActiveTab] = useState("investigation-hub");
  const [filesOpen, setFilesOpen] = useState(false);

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
    <div className="flex flex-col gap-4">
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
        value={activeTab}
        onValueChange={setActiveTab}
        variant=""
        // className="w-full flex-row items-start gap-6"
      >
        <nav
          aria-label="Case sections"
          className="w-full flex"
          // className={`sticky top-4 shrink-0 ${navCollapsed ? "w-9" : "w-[300px]"}`}
        >
          {/* <div
            className={`mb-2 flex items-center ${navCollapsed ? "flex-col gap-1" : "justify-between pl-1"}`}
          >
            <div
              className={`flex items-center gap-1 w-full ${navCollapsed ? "flex-col-reverse" : ""}`}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setFilesOpen(true)}
                    aria-label="Files"
                    aria-haspopup="dialog"
                    aria-expanded={filesOpen}
                    className={`flex h-8 items-center gap-1.5 rounded-md border text-xs font-medium transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.96] motion-reduce:active:scale-100 ${
                      navCollapsed ? "w-8 justify-center" : "px-2.5"
                    } ${
                      filesOpen
                        ? "border-primary/30 bg-primary/[0.08] text-primary"
                        : "border-border bg-background text-heading hover:bg-muted/60"
                    }`}
                  >
                    <IconFolder
                      stroke={1.6}
                      className={`size-4 ${filesOpen ? "text-primary" : "text-foreground/70"}`}
                    />
                    {!navCollapsed && "Files"}
                  </button>
                </TooltipTrigger>
                <TooltipContent side={navCollapsed ? "right" : "bottom"}>
                  Evidence & attachments
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setNavCollapsed((c) => !c)}
                    aria-label={
                      navCollapsed ? "Expand case navigation" : "Collapse case navigation"
                    }
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
          </div> */}

          {/* 9 sections in 2 columns: the last cell spans both so the grid
              never ends on an empty cell. */}
          <TabsList className={"flex flex-col items-start w-full pb-0"}>
            <div className=" w-full p-1 flex items-center  gap-1">
              <TabsTrigger
                value={"investigation-hub"}
                aria-label={"Investigation Hub"}
                className={"size-9"}
              >
                <IconUserScan className="size-4" />
              </TabsTrigger>
              <div className="w-0.5 h-3/4 bg-border" />
              <Button
                type="button"
                onClick={() => setFilesOpen(true)}
                aria-label="Files"
                variant={"outline"}
                aria-haspopup="dialog"
                aria-expanded={filesOpen}
                size="icon"
                className={"border-primary/20"}
              >
                <IconFolderPlus
                  // stroke={1.6}
                  className={`size-4 text-primary`}
                />
                {/* {!navCollapsed && "Files"} */}
              </Button>

              {/* <NavItem
                collapsed={navCollapsed}
                value="investigation-hub"
                icon={IconBriefcase}
                label="Investigation Hub"
                hint="Steps, POIs & findings"
              /> */}
            </div>
            <div className={"flex w-full h-full border-t bg-white"}>
              {/* <NavItem
                collapsed={navCollapsed}
                value="investigation-hub"
                icon={IconBriefcase}
                label="Investigation Hub"
                hint="Steps, POIs & findings"
              /> */}
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
            </div>
          </TabsList>
        </nav>

        {/* min-w-0 lets wide tables and graphs scroll inside the panel instead of
            pushing the layout past the viewport. */}
        <div className="min-w-0">
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

      <Dialog open={filesOpen} onOpenChange={setFilesOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1100px]">
          <DialogTitle className="sr-only">Case files</DialogTitle>
          <DialogDescription className="sr-only">
            Evidence and attachments for this case.
          </DialogDescription>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Suspense fallback={<TabSkeleton />}>
              <FilesTab caseData={caseData} caseId={caseId} embedded />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>

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
