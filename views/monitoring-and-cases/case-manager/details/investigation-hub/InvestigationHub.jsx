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
  console.log("wizard", wizard);

  return (
    <div className="flex h-[calc(100vh-300px)] min-h-[620px] overflow-hidden rounded-2xl bg-white">
      <StepsChecklistPanel wizard={wizard} />

      <div className="border rounded-r-2xl border-black/[0.09] bg-white w-full overflow-y-auto">
        <StepWorkspacePanel
          caseData={caseData}
          caseId={caseId}
          onCaseChange={onCaseChange}
          wizard={wizard}
          headerActions={<SaveIndicator wizard={wizard} />}
        />
      </div>
      {/* Docked to the viewport's right edge, outside the step header. */}
      <OsintReportPanel caseData={caseData} />
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
  const quiet =
    "flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs text-muted-foreground transition-colors duration-200";

  if (!loaded) {
    return (
      <p className={quiet} aria-live="polite">
        <IconLoader2 className="size-3.5 animate-spin" />
        Loading saved progress…
      </p>
    );
  }

  if (saveError) {
    return (
      <p
        role="alert"
        className="flex max-w-[420px] items-center gap-2 rounded-lg bg-danger/[0.06] py-1 pl-2.5 pr-1 text-xs leading-snug text-danger"
      >
        <IconAlertTriangle className="size-3.5 shrink-0" />
        <span className="py-0.5">
          {saveError === "load"
            ? "Could not load saved progress — autosave is paused so nothing already stored is overwritten."
            : "Could not save your progress."}
        </span>
        {saveError === "save" && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 shrink-0 px-2 text-xs active:scale-[0.97]"
            onClick={saveNow}
          >
            Retry
          </Button>
        )}
      </p>
    );
  }

  return (
    <p className={quiet} aria-live="polite">
      {saving ? (
        <>
          <IconLoader2 className="size-3.5 animate-spin" />
          Saving…
        </>
      ) : savedAt ? (
        <>
          <span className="flex size-4 items-center justify-center rounded-full bg-success/12 text-success">
            <IconCheck className="size-2.5" strokeWidth={3.5} />
          </span>
          Saved <span className="tabular-nums">{dateShowFormatWithTime(savedAt)}</span>
        </>
      ) : (
        "Saves automatically"
      )}
    </p>
  );
}
