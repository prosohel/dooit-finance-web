"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconLoader2,
  IconRefresh,
  IconSparkles,
} from "@tabler/icons-react";
import SmrPartStepper from "./SmrPartStepper";
import SmrPartA from "./SmrPartA";
import SmrPartB from "./SmrPartB";
import { SmrPartC, SmrPartD, SmrPartE, SmrPartF, SmrPartG, SmrPartH } from "./SmrFactParts";
import { useSmrDraft } from "./useSmrDraft";
import { SMR_PART_TITLES } from "../../data/investigationHubData";

const SMR_FORM_PATH = "/dashboard/client/report-compliance/smr-filing/smr/form";

const PART_COMPONENTS = {
  A: SmrPartA,
  B: SmrPartB,
  C: SmrPartC,
  D: SmrPartD,
  E: SmrPartE,
  F: SmrPartF,
  G: SmrPartG,
  H: SmrPartH,
};

/**
 * The AUSTRAC SMR, edited in the Investigation Hub against the case's real
 * SMR draft — the same record the standalone SMR form and the Reports tab
 * open, not a copy (docs/74 phase C9).
 */
export default function SmrStep({ caseId, wizard }) {
  const { smrPart, setSmrPart, smrGo, setSmrReportId } = wizard;
  const draft = useSmrDraft(caseId, {
    onReportLoaded: (doc) => setSmrReportId?.(doc._id),
  });

  const isFirst = smrPart === "A";
  const isLast = smrPart === "H";
  const Part = PART_COMPONENTS[smrPart] || SmrPartA;

  if (!caseId) {
    return <p className="text-sm text-muted-foreground">Open this workspace from a case to draft its SMR.</p>;
  }
  if (draft.loadState.loading) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
        <IconLoader2 className="size-4 animate-spin" />
        Loading the case&apos;s SMR — a first draft is written from the case data, which can take up to 20 seconds…
      </p>
    );
  }
  if (draft.loadState.error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        <div className="flex items-center gap-2 font-semibold">
          <IconAlertTriangle className="size-4" />
          {draft.loadState.error}
        </div>
      </div>
    );
  }

  const aiError = draft.report?.aiMeta?.error;
  const scope = draft.report?.aiMeta?.scope;

  return (
    <div>
      <SmrPartStepper smrPart={smrPart} setSmrPart={setSmrPart} />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SaveStatus state={draft.saveState} onRetry={draft.flush} />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={draft.suggest} disabled={draft.suggesting}>
            {draft.suggesting ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconSparkles className="size-3.5" />}
            Suggest narrative
          </Button>
          <Button size="sm" variant="outline" onClick={draft.refreshFromCase} disabled={draft.refreshing}>
            {draft.refreshing ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconRefresh className="size-3.5" />}
            Refresh from case
          </Button>
          {draft.report?._id && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`${SMR_FORM_PATH}?id=${draft.report._id}`} target="_blank">
                <IconExternalLink className="size-3.5" />
                Open SMR {draft.report.uid || ""}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {aiError && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            The AI narrative could not be drafted ({aiError.message || aiError.code}). The facts are complete; write
            Part B yourself or try &ldquo;Suggest narrative&rdquo; again.
          </span>
        </p>
      )}
      {scope?.mismatch && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            The summary service saw {scope.theirTransactionCount} transaction(s) against this client&apos;s{" "}
            {scope.ourTransactionCount}. Its narrative may describe activity outside this client — read it carefully.
          </span>
        </p>
      )}

      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex size-[34px] items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {smrPart}
        </span>
        <span className="text-base font-bold uppercase tracking-wide text-heading">
          {SMR_PART_TITLES[smrPart]}
        </span>
      </div>

      <Part draft={draft} />

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => smrGo(-1)} disabled={isFirst}>
          <IconChevronLeft className="size-3.5" />
          Previous
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => smrGo(1)}>
          {isLast ? "Done" : "Next"}
          {isLast ? <IconCheck className="size-3.5" /> : <IconChevronRight className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function SaveStatus({ state, onRetry }) {
  if (state.saving) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconLoader2 className="size-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (state.error) {
    return (
      <span className="flex items-center gap-2 text-xs text-danger">
        <IconAlertTriangle className="size-3.5" /> Not saved: {state.error}
        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={onRetry}>
          Retry
        </Button>
      </span>
    );
  }
  if (state.savedAt) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconCheck className="size-3.5 text-success" /> Saved to the SMR
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Changes save automatically to the case&apos;s SMR.</span>;
}
