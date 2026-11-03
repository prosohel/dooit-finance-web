"use client";

import { IconAlertTriangle, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { dateShowFormatWithTime } from "@/lib/utils";
import StepWorkspacePanel from "./StepWorkspacePanel";
import OsintReportPanel from "./OsintReportPanel";
import StepsChecklistPanel from "./StepsChecklistPanel";
import { useInvestigationWizard } from "./hooks/useInvestigationWizard";

/**
 * The step-driven investigation workspace: one card split into the step list
 * + checklist on the left and the active step's form on the right, with the
 * save status and the OSINT report drawer in the workspace header. All wizard
 * state lives in `useInvestigationWizard` and is threaded down as a single
 * `wizard` object so step components stay simple props-in/callbacks-out.
 */
export default function InvestigationHub({ caseData, caseId, onCaseChange }) {
  // `caseId` gives the wizard somewhere to save; without it the hub still
  // works, but only in memory (docs/74 C18).
  const wizard = useInvestigationWizard(caseData, caseId);

  return (
    <div className="flex h-[calc(100vh-300px)] min-h-[620px] overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <StepsChecklistPanel wizard={wizard} />

      <StepWorkspacePanel
        caseData={caseData}
        caseId={caseId}
        onCaseChange={onCaseChange}
        wizard={wizard}
        headerActions={
          <>
            <SaveIndicator wizard={wizard} />
            <OsintReportPanel caseData={caseData} />
          </>
        }
      />
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
      <p className="flex max-w-[420px] items-center gap-2 rounded-md bg-danger/5 px-2 py-1 text-xs text-danger">
        <IconAlertTriangle className="size-3.5 shrink-0" />
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
    <p className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
      {saving ? (
        <>
          <IconLoader2 className="size-3.5 animate-spin" />
          Saving…
        </>
      ) : savedAt ? (
        <>
          <IconCheck className="size-3.5 text-success" />
          Saved {dateShowFormatWithTime(savedAt)}
        </>
      ) : (
        "Your progress saves automatically."
      )}
    </p>
  );
}
