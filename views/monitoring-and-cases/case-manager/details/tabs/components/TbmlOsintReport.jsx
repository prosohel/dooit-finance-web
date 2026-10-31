"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, FileSearch, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCaseTbmlReports,
  getTbmlReport,
  refreshTbmlReport,
} from "@/app/dashboard/client/monitoring-and-cases/case-manager/tbml-actions";
import RunSwitcher from "./tbml-osint-report/RunSwitcher";
import NewScreeningDialog from "./tbml-osint-report/NewScreeningDialog";
import ScreeningSummaryCard from "./tbml-osint-report/ScreeningSummaryCard";
import ReviewFlagsCard from "./tbml-osint-report/ReviewFlagsCard";
import ExtractedProductsTable from "./tbml-osint-report/ExtractedProductsTable";
import LineItemAnalysisCard from "./tbml-osint-report/LineItemAnalysisCard";
import ReferencesCard from "./tbml-osint-report/ReferencesCard";
import NarrativeReportSection from "./tbml-osint-report/NarrativeReportSection";
import DocumentExtractRail from "./tbml-osint-report/DocumentExtractRail";
import AbsentFieldsCard from "./tbml-osint-report/AbsentFieldsCard";
import OsintResultsRail from "./tbml-osint-report/OsintResultsRail";
import RunAuditTrailCard from "./tbml-osint-report/RunAuditTrailCard";
import SearchTrailCard from "./tbml-osint-report/SearchTrailCard";
import {
  adaptTbmlRun,
  adaptTbmlSummary,
  isRunning,
  statusLabel,
} from "./tbml-osint-report/tbmlAdapter";

// How often to re-read the run list while the engine is still working. The API
// answers from its own database, and a run takes minutes — this is a progress
// indicator, not a race.
const POLL_MS = 15_000;

/**
 * TBML screening tab.
 *
 * A switcher across every screening run performed on this case's trade
 * documents, the selected run's price-vs-OSINT analysis and references in the
 * primary column, and a side rail with the document extract, absent fields and
 * raw OSINT research for that run.
 *
 * All data comes from our API (/api/v1/tbml), which fronts the OSINT Engine,
 * caches finished reports and chases running ones in the background. Nothing
 * here talks to the engine, and nothing here waits on an analysis.
 */
export default function TbmlOsintReport({ caseId, caseData }) {
  // The list endpoint returns headlines only; the cached extract, research and
  // narrative come from the detail endpoint, one run at a time.
  const [summaries, setSummaries] = useState([]);
  const [listState, setListState] = useState({ loading: true, error: null });
  const [activeId, setActiveId] = useState(null);
  const [runs, setRuns] = useState({}); // reportId -> adapted run
  const [runState, setRunState] = useState({ loading: false, error: null });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadList = useCallback(
    async ({ quiet = false } = {}) => {
      if (!caseId) {
        setListState({ loading: false, error: null });
        return;
      }
      if (!quiet) setListState({ loading: true, error: null });

      const res = await getCaseTbmlReports(caseId);
      if (!res?.succeed) {
        setListState({ loading: false, error: res?.message || "Could not load screening runs." });
        return;
      }

      const next = (res.data || []).map(adaptTbmlSummary);
      setSummaries((prev) => {
        // A run that has just settled has an extract, research and a narrative
        // it did not have a moment ago — drop the cached (empty) detail so it
        // is fetched again.
        const settled = next.filter(
          (r) => !isRunning(r.status) && prev.some((p) => p.id === r.id && isRunning(p.status)),
        );
        if (settled.length) {
          setRuns((cache) => {
            const copy = { ...cache };
            for (const r of settled) delete copy[r.id];
            return copy;
          });
        }
        return next;
      });
      setListState({ loading: false, error: null });
      // Default to the newest run, but never yank the analyst off the one they
      // are reading when the list refreshes underneath them.
      setActiveId((current) =>
        current && next.some((r) => r.id === current) ? current : (next[0]?.id ?? null),
      );
    },
    [caseId],
  );

  useEffect(() => {
    loadList();
  }, [loadList]);

  // ── Detail for the selected run ────────────────────────────────────────────
  const activeSummary = summaries.find((r) => r.id === activeId) || null;
  const activeRun = activeId ? runs[activeId] : null;
  const activeIsRunning = activeSummary ? isRunning(activeSummary.status) : false;

  useEffect(() => {
    // Nothing to fetch for a run the engine has not finished with — there is no
    // report behind it yet.
    if (!activeId || !activeSummary || activeIsRunning || runs[activeId]) return undefined;

    let cancelled = false;
    setRunState({ loading: true, error: null });

    (async () => {
      const res = await getTbmlReport(activeId);
      if (cancelled) return;

      if (!res?.succeed) {
        setRunState({ loading: false, error: res?.message || "Could not load this run." });
        return;
      }

      setRuns((prev) => ({ ...prev, [activeId]: adaptTbmlRun(res.data) }));
      setRunState({ loading: false, error: null });
    })();

    return () => {
      cancelled = true;
    };
  }, [activeId, activeSummary, activeIsRunning, runs]);

  // ── Poll while the engine is still working ─────────────────────────────────
  const anyRunning = summaries.some((r) => isRunning(r.status));

  useEffect(() => {
    if (!anyRunning) return undefined;
    const timer = setInterval(() => loadList({ quiet: true }), POLL_MS);
    return () => clearInterval(timer);
  }, [anyRunning, loadList]);

  // A newly queued run is returned by the API already recorded, so it just goes
  // to the front of the list and the poll takes over from there.
  const handleSubmitted = useCallback(
    async (record) => {
      if (record?.reportId) {
        setSummaries((prev) => [
          adaptTbmlSummary(record),
          ...prev.filter((r) => r.id !== record.reportId),
        ]);
        setActiveId(record.reportId);
      }
      loadList({ quiet: true });
    },
    [loadList],
  );

  // Forces the API to re-read the run from the engine — for when a report looks
  // stuck or the background sweep reported an error.
  const handleRefresh = useCallback(async () => {
    if (!activeId) return;
    setRefreshing(true);
    const res = await refreshTbmlReport(activeId);
    setRefreshing(false);

    if (!res?.succeed) {
      toast.error(res?.message || "Could not reach the screening engine.");
      return;
    }
    setRuns((prev) => {
      const next = { ...prev };
      delete next[activeId];
      return next;
    });
    loadList({ quiet: true });
  }, [activeId, loadList]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (listState.loading) return <TbmlSkeleton />;

  if (listState.error) {
    return (
      <Panel
        icon={AlertTriangle}
        tone="danger"
        title="Screening runs could not be loaded"
        body={listState.error}
        action={
          <Button size="sm" variant="outline" onClick={() => loadList()}>
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        }
      />
    );
  }

  const dialog = (
    <NewScreeningDialog
      open={uploadOpen}
      onOpenChange={setUploadOpen}
      caseId={caseId}
      caseUid={caseData?.displayId}
      onSubmitted={handleSubmitted}
    />
  );

  if (!summaries.length) {
    return (
      <div className="flex flex-col gap-3">
        <Panel
          icon={FileSearch}
          title="No trade documents have been screened on this case"
          body="Upload a proforma invoice, commercial invoice or letter of credit. It is stored with the case and sent for extraction, price-testing against OSINT market data, and scoring. Screening runs in the background — you can leave this tab."
          action={
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              Run new screening
            </Button>
          }
        />
        {dialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <RunHeadline
        summary={activeSummary}
        run={activeRun}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <RunSwitcher
        runs={summaries}
        activeIndex={summaries.findIndex((r) => r.id === activeId)}
        onSelect={(index) => setActiveId(summaries[index]?.id ?? null)}
        onOpenUpload={() => setUploadOpen(true)}
      />

      {activeIsRunning ? (
        <RunningPanel summary={activeSummary} />
      ) : runState.loading ? (
        <TbmlSkeleton compact />
      ) : runState.error ? (
        <Panel
          icon={AlertTriangle}
          tone="danger"
          title="This run could not be loaded"
          body={runState.error}
          action={
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? "size-3.5 animate-spin" : "size-3.5"} />
              Try again
            </Button>
          }
        />
      ) : activeRun ? (
        <RunBody run={activeRun} />
      ) : (
        <Panel
          icon={AlertTriangle}
          tone="danger"
          title={`Screening did not complete (${statusLabel(activeSummary?.status)})`}
          body={
            activeSummary?.errorMessage ||
            "The engine returned no assessment for this document. This is not a finding that the transaction is free of TBML risk — the document still needs a manual review."
          }
          action={
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? "size-3.5 animate-spin" : "size-3.5"} />
              Re-check with the engine
            </Button>
          }
        />
      )}

      {dialog}
    </div>
  );
}

// ── The completed report ─────────────────────────────────────────────────────

function RunBody({ run }) {
  const failed = run.status === "FAILED" || run.status === "COLLECTION_FAILED";

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_380px]">
      <div className="flex min-w-0 flex-col gap-4">
        {failed ? (
          <Panel
            icon={AlertTriangle}
            tone="danger"
            title={`Screening did not complete (${statusLabel(run.status)})`}
            body={
              run.errorMessage ||
              "The engine returned no assessment for this document. This is not a finding that the transaction is free of TBML risk."
            }
          />
        ) : (
          <ScreeningSummaryCard run={run} />
        )}

        <ReviewFlagsCard run={run} />

        {!failed && (
          <>
            <ExtractedProductsTable run={run} />

            {run.lineAnalyses.map((lineItem) => (
              <LineItemAnalysisCard key={`${run.id}-${lineItem.lineNumber}`} lineItem={lineItem} />
            ))}

            <ReferencesCard run={run} />

            {run.narrative && <NarrativeReportSection run={run} />}
          </>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {!failed && (
          <>
            <DocumentExtractRail key={`extract-${run.id}`} run={run} />
            <AbsentFieldsCard fields={run.absentFields} />
            <OsintResultsRail key={`osint-${run.id}`} results={run.osintResults} />
          </>
        )}
        <RunAuditTrailCard audit={run.audit} />
        <SearchTrailCard reportId={run.id} />
      </div>
    </div>
  );
}

// ── Small pieces ─────────────────────────────────────────────────────────────

// The line above the switcher: when this run finished, and whether anything
// about it needs saying before the report is read.
function RunHeadline({ summary, run, onRefresh, refreshing }) {
  if (!summary) return null;

  const running = isRunning(summary.status);
  const done = summary.status === "COMPLETED";
  const label = run?.createdAtLabel || `Screening run ${statusLabel(summary.status)}`;
  const Icon = running ? Loader2 : done ? Check : AlertTriangle;

  const tone = done
    ? "text-success"
    : running
      ? "text-muted-foreground"
      : "text-danger";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className={`flex items-center gap-1.5 text-xs font-medium ${tone}`}>
        <Icon className={running ? "size-3.5 animate-spin" : "size-3.5"} />
        {label}
      </p>

      {summary.documentName && (
        <span className="font-mono text-[11px] text-muted-foreground">{summary.documentName}</span>
      )}

      {/* A stage run is a test artefact and must never be read as a compliance
          conclusion — the engine says so in its own review reasons, and the
          label belongs where the report is opened, not only inside it. */}
      {summary.environment && summary.environment !== "production" && (
        <span className="rounded border border-warning/30 bg-warning/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-yellow-700 uppercase">
          {summary.environment}
        </span>
      )}

      {summary.pollError && (
        <span className="text-[11px] text-warning">
          last engine check failed — showing the last known state
        </span>
      )}

      <div className="flex-1" />

      <Button
        size="sm"
        variant="ghost"
        className="h-6 gap-1 px-2 text-[11px]"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <RefreshCw className={refreshing ? "size-3 animate-spin" : "size-3"} />
        Re-check
      </Button>
    </div>
  );
}

function RunningPanel({ summary }) {
  return (
    <Panel
      icon={Loader2}
      spin
      title={`Screening is ${statusLabel(summary.status)}`}
      body="The document is being extracted, researched against open sources and scored. This usually takes 3–5 minutes and continues on the server — you can leave this tab and come back. The report appears here as soon as it lands."
    />
  );
}

function Panel({ icon: Icon, title, body, action, tone, spin }) {
  const danger = tone === "danger";
  return (
    <div
      className={
        danger
          ? "flex flex-col items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/5 p-6"
          : "flex flex-col items-start gap-2.5 rounded-xl border border-border bg-card p-6"
      }
    >
      <span
        className={
          danger
            ? "inline-flex size-8 items-center justify-center rounded-lg bg-danger/10 text-danger"
            : "inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
        }
      >
        <Icon className={spin ? "size-4 animate-spin" : "size-4"} />
      </span>
      <p className="text-sm font-semibold text-heading">{title}</p>
      <p className="max-w-[68ch] text-xs leading-relaxed text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

function TbmlSkeleton({ compact = false }) {
  return (
    <div className="flex flex-col gap-4">
      {!compact && <Skeleton className="h-14 w-full rounded-xl" />}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
