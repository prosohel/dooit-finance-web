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
import NetworkGraph from "@/views/onboarding/customer-queue/details/d3/Networkgraph";
import { transformToGraph } from "@/views/onboarding/customer-queue/details/d3/lib/transformgraphData";
import partyEntities from "@/views/onboarding/customer-queue/details/demo.json";
import { FingerprintIcon } from "lucide-react";
import TbmlOsintReport from "./tabs/components/TbmlOsintReport";
import useBreadcrumbLabel from "@/hooks/useBreadcrumbLabel";

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

const tabBtnClass =
  "py-4 w-full data-[state=active]:text-primary data-[state=active]:bg-white data-[state=active]:shadow-sm  [&>svg]:size-20 ";

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

      <Tabs defaultValue="investigation-hub" variant="" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="investigation-hub" className={tabBtnClass}>
            <IconBriefcase />
            Investigation Hub
          </TabsTrigger>
          <TabsTrigger value="customer-profile" className={tabBtnClass}>
            <IconUser />
            Customer Profile
          </TabsTrigger>
          <TabsTrigger value="transactions" className={tabBtnClass}>
            <IconCreditCard />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="files" className={tabBtnClass}>
            <IconFolder />
            Files
          </TabsTrigger>
          <TabsTrigger value="source-of-funds" className={tabBtnClass}>
            <IconCoins />
            Source of Funds
          </TabsTrigger>
          <TabsTrigger value="reports" className={tabBtnClass}>
            <IconFileStack />
            Reports
          </TabsTrigger>
          <TabsTrigger value="case-activity" className={tabBtnClass}>
            <IconClipboardList />
            Case Activity
          </TabsTrigger>
          <TabsTrigger value="relation-graph" className={tabBtnClass}>
            <IconSitemap />
            Relation graph
          </TabsTrigger>
          <TabsTrigger value="tbml-osint" className={tabBtnClass}>
            <FingerprintIcon /> TBML Osint
          </TabsTrigger>
        </TabsList>

        <TabsContent value="investigation-hub">
          <InvestigationHub caseData={caseData} caseId={caseId} onCaseChange={applyCaseUpdate} />
        </TabsContent>
        <TabsContent value="tbml-osint">
          <TbmlOsintReport caseId={caseId} caseData={caseData} />
        </TabsContent>

        <TabsContent value="customer-profile">
          <CustomerProfileTab caseData={caseData} sectionRef={setSectionRef("customer-profile")} />
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
