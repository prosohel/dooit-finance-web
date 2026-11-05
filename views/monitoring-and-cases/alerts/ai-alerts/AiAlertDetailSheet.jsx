"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { IconAlertTriangle, IconBell, IconFolder } from "@tabler/icons-react";
import { formatDateTime } from "@/lib/utils";
import { getAiResult } from "@/app/dashboard/client/monitoring-and-cases/alerts/ai-actions";
import { riskVariants } from "./constants";
import {
  CollectiveContext,
  DetectorBadges,
  ModelDetections,
  Reasons,
  RuleHits,
  Section,
  TransactionDetails,
  TriggeredFields,
} from "./DetectionSections";

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "—";
  const { date, time } = formatDateTime(timestamp);
  return `${date}, ${time}`;
};

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function RiskHeader({ record }) {
  const overall = record.overall || {};
  return (
    <div className="flex items-center gap-4 rounded-md border p-3">
      <div className="text-center">
        <p className="text-[28px] font-semibold leading-none tabular-nums text-heading">{overall.riskScore}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Risk score</p>
      </div>
      <Separator orientation="vertical" className="h-12" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill variant={riskVariants[overall.riskLabel]}>{overall.riskLabel}</StatusPill>
          <span className="text-xs text-muted-foreground">{overall.primaryCaseType}</span>
          <span className="text-xs text-muted-foreground">· {overall.agreement} detectors agree</span>
        </div>
        <DetectorBadges detectors={overall.detectedBy} />
      </div>
    </div>
  );
}

export default function AiAlertDetailSheet({ transactionId, onClose }) {
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getAiResult(transactionId);
    if (res.ok) setRecord(res.data);
    else setError(res.detail);
    setLoading(false);
  }, [transactionId]);

  // Only reset when a new row opens — clearing on close would blank the sheet
  // mid exit-animation.
  useEffect(() => {
    if (!transactionId) return;
    setRecord(null);
    load();
  }, [transactionId, load]);

  const alertId = record?.alert?.alertId;
  const caseId = record?.case?.caseId;

  return (
    <Sheet open={Boolean(transactionId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader className="border-b pr-10">
          <SheetTitle className="font-mono text-base">{record?.transactionUid || transactionId}</SheetTitle>
          <SheetDescription>
            {record
              ? `Transaction ${formatTimestamp(record.transactionTimestamp)} · detected ${formatTimestamp(record.detectedAt)}`
              : "AI monitoring result"}
          </SheetDescription>
          {record && (alertId || caseId) && (
            <div className="flex gap-2 pt-1">
              {alertId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/client/monitoring-and-cases/alerts/${alertId}`)}
                >
                  <IconBell /> Alert {record.alert.uid}
                </Button>
              )}
              {caseId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/client/monitoring-and-cases/case-manager/${caseId}`)}
                >
                  <IconFolder /> Open case
                </Button>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {loading && !record && <DetailSkeleton />}

          {error && (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <IconAlertTriangle className="size-6 text-warning" />
              <p className="text-sm text-heading">{error}</p>
              <Button size="sm" variant="outline" onClick={load}>
                Try again
              </Button>
            </div>
          )}

          {record && (
            <div className="space-y-6 p-4">
              <RiskHeader record={record} />
              <TransactionDetails transaction={record.transaction} />
              <TriggeredFields fields={record.triggeredFields} />
              <Reasons reasons={record.reasons} />
              <RuleHits hits={record.ruleHits} />
              <ModelDetections detections={record.modelDetections} />
              <CollectiveContext context={record.collectiveContext} />
              {record.runHistory?.length > 0 && (
                <Section title="Run history">
                  <ul className="space-y-1 text-xs">
                    {record.runHistory.map((run) => (
                      <li key={run.runId} className="flex justify-between gap-2">
                        <span className="truncate font-mono text-neutral-600">{run.runId}</span>
                        <span className="shrink-0 text-muted-foreground">
                          Score {run.riskScore} · {formatTimestamp(run.detectedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
