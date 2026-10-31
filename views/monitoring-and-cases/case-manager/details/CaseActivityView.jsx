"use client";

import { lazy, Suspense } from "react";
import { IconFolders } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import CollapsibleSection from "./components/CollapsibleSection";
import RelatedCasesSection from "./sections/RelatedCasesSection";
import CaseAnalysisSection from "./sections/CaseAnalysisSection";
import RFISection from "./sections/RFISection";
import CaseAssignmentSection from "./sections/CaseAssignmentSection";
import InvestigatorNotes from "./sections/InvestigatorNotes";
import InvestigationTimelineSection from "./sections/InvestigationTimelineSection";
import AuditLog from "./sections/AuditLog";

const ATMInfoTab = lazy(() => import("./tabs/ATMInfoTab"));
const DeviceInfoTab = lazy(() => import("./tabs/DeviceInfoTab"));
const RelationshipsTab = lazy(() => import("./tabs/RelationshipsTab"));

function AdditionalRecordsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Everything about this case that isn't the wizard, profile, transactions,
 * or files: related investigations, the case analysis, RFIs, analyst
 * assignment, notes, the audit trail, and supplementary ATM/device/network
 * records. Kept as one tab so those administrative records stay out of the
 * investigator's active workspace while remaining a click away.
 */
export default function CaseActivityView({
  caseData,
  analysis,
  analysisLoading,
  onRefreshAnalysis,
  rfis,
  onOpenCreateRFI,
  assignedAnalyst,
  assignment,
  onOpenReassign,
  notes,
  onAddNote,
  onTogglePin,
  activities,
  auditLog,
  setSectionRef,
}) {
  return (
    <div className="flex flex-col gap-4">
      <RelatedCasesSection caseData={caseData} sectionRef={setSectionRef("related-cases")} />
      <CaseAnalysisSection
        analysis={analysis}
        loading={analysisLoading}
        onRefresh={onRefreshAnalysis}
        sectionRef={setSectionRef("case-analysis")}
      />
      <RFISection rfis={rfis} onOpenCreateRFI={onOpenCreateRFI} sectionRef={setSectionRef("rfi")} />
      <CaseAssignmentSection
        assignedAnalyst={assignedAnalyst}
        assignment={assignment}
        onOpenReassign={onOpenReassign}
        sectionRef={setSectionRef("assignment")}
      />
      <InvestigatorNotes
        notes={notes}
        onAddNote={onAddNote}
        onTogglePin={onTogglePin}
        sectionRef={setSectionRef("notes")}
      />
      <InvestigationTimelineSection
        caseData={caseData}
        activities={activities}
        sectionRef={setSectionRef("timeline")}
      />
      <AuditLog auditLog={auditLog} sectionRef={setSectionRef("audit-log")} />

      <CollapsibleSection
        id="additional-records"
        title="Additional Records"
        icon={IconFolders}
        defaultOpen={false}
        sectionRef={setSectionRef("additional-records")}
      >
        <Suspense fallback={<AdditionalRecordsSkeleton />}>
          <div className="flex flex-col gap-4">
            <ATMInfoTab caseData={caseData} />
            <DeviceInfoTab caseData={caseData} />
            <RelationshipsTab caseData={caseData} />
          </div>
        </Suspense>
      </CollapsibleSection>
    </div>
  );
}
