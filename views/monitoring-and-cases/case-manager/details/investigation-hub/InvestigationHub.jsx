"use client";

import { IconAlertTriangle, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { dateShowFormatWithTime } from "@/lib/utils";
import AlertDetailsPanel from "./AlertDetailsPanel";
import StepWorkspacePanel from "./StepWorkspacePanel";
import OsintReportPanel from "./OsintReportPanel";
import StepsChecklistPanel from "./StepsChecklistPanel";
import { useInvestigationWizard } from "./hooks/useInvestigationWizard";

/**
 * The step-driven investigation workspace: alert context on the left, the
 * active step's form in the middle, the step list + checklist next, and the
 * inline OSINT report on the far right. All wizard state lives in
 * `useInvestigationWizard` and is threaded down as a single `wizard` object
 * so step components stay simple props-in/callbacks-out.
 */
export default function InvestigationHub({ caseData, caseId, onCaseChange }) {
  // `caseId` gives the wizard somewhere to save; without it the hub still
  // works, but only in memory (docs/74 C18).
  const wizard = useInvestigationWizard(caseData, caseId);

  return (
    <div className="flex flex-col gap-2">
      <SaveIndicator wizard={wizard} />

      <div className="flex h-[calc(100vh-300px)] min-h-[620px] gap-3.5 overflow-x-auto pb-1">
        <AlertDetailsPanel caseData={caseData} />
        <StepWorkspacePanel caseData={caseData} caseId={caseId} onCaseChange={onCaseChange} wizard={wizard} />
        <StepsChecklistPanel wizard={wizard} />
        <OsintReportPanel caseData={caseData} />
      </div>
    </div>
  );
}

/**
 * Tells the analyst whether their work is being kept. An investigation that
 * silently fails to save is worse than one that never saved at all, so a
 * failure is stated plainly and offers a retry rather than a quiet icon.
 */
function SaveIndicator({ wizard }) {
  const { loaded, saving, savedAt, saveError, saveNow } = wizard;

  if (!loaded) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconLoader2 className="size-3.5 animate-spin" />
        Loading saved progress…
      </p>
    );
  }

  if (saveError) {
    return (
      <p className="flex items-center gap-2 text-xs text-danger">
        <IconAlertTriangle className="size-3.5" />
        {saveError === "load"
          ? "Could not load saved progress — autosave is paused so nothing already stored is overwritten."
          : "Could not save your progress."}
        {saveError === "save" && (
          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={saveNow}>
            Retry
          </Button>
        )}
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {saving ? (
        <>
          <IconLoader2 className="size-3.5 animate-spin" />
          Saving…
        </>
      ) : savedAt ? (
        <>
          <IconCheck className="size-3.5 text-success" />
          Progress saved {dateShowFormatWithTime(savedAt)}
        </>
      ) : (
        "Your progress saves automatically."
      )}
    </p>
  );
}
