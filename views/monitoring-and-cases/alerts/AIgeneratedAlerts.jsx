"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { IconAlertTriangle, IconEye, IconFolder } from "@tabler/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/StatusPill";
import CustomPagination from "@/components/CustomPagination";
import { formatDateTime } from "@/lib/utils";
import {
  getAiResults,
  getLatestAiRun,
} from "@/app/dashboard/client/monitoring-and-cases/alerts/ai-actions";
import AiAlertFilters from "./ai-alerts/AiAlertFilters";
import AiAlertSummary from "./ai-alerts/AiAlertSummary";
import AiAlertDetailSheet from "./ai-alerts/AiAlertDetailSheet";
import { DetectorBadges } from "./ai-alerts/DetectionSections";
import {
  daysAgo,
  daysBetween,
  dhakaDate,
  formatMoney,
  MAX_RANGE_DAYS,
  riskVariants,
} from "./ai-alerts/constants";

const CustomResizableTable = dynamic(() => import("@/components/ui/CustomResizable"), {
  ssr: false,
});

const defaultFilters = () => ({
  start: dhakaDate(daysAgo(6)),
  end: dhakaDate(),
  dateField: "run",
  detector: "",
  riskLabel: "",
  caseType: "",
  minScore: "",
  ruleId: "",
  field: "",
  sort: "score",
});

const validateFilters = ({ start, end, minScore }) => {
  if (!start || !end) return "Choose both a start and an end date.";
  if (start > end) return "The start date must be on or before the end date.";
  if (daysBetween(start, end) > MAX_RANGE_DAYS)
    return `The date range can be at most ${MAX_RANGE_DAYS} days.`;
  if (minScore !== "" && (Number(minScore) < 0 || Number(minScore) > 100))
    return "Min score must be between 0 and 100.";
  return null;
};

const buildColumns = ({ onView, onOpenCase }) => [
  {
    id: "actions",
    header: "Actions",
    size: 40,
    cell: ({ row }) => {
      const caseId = row.original.case?.caseId;
      return (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onView(row.original.transactionId)}>
            <IconEye /> Evidence
          </Button>
          {caseId && (
            <Button size="sm" variant="outline" onClick={() => onOpenCase(caseId)}>
              <IconFolder /> Case
            </Button>
          )}
        </div>
      );
    },
  },
  {
    id: "transactionUid",
    header: "Transaction",
    cell: ({ row }) => {
      const { date, time } = formatDateTime(row.original.transactionTimestamp);
      return (
        <div>
          <p className="font-mono text-xs text-neutral-500">{row.original.transactionUid}</p>
          <p className="text-xs text-neutral-400">
            {date} · {time}
          </p>
        </div>
      );
    },
  },
  {
    id: "parties",
    header: "Sender → Beneficiary",
    cell: ({ row }) => {
      const { sender, beneficiary } = row.original.transaction || {};
      return (
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <div>
            <p className="text-sm text-neutral-900">{sender?.name || "—"}</p>
            <p className="text-xs text-neutral-400">{sender?.account}</p>
          </div>
          <ArrowRight className="size-4 text-green-500" />
          <div>
            <p className="text-sm text-neutral-900">{beneficiary?.name || "—"}</p>
            <p className="text-xs text-neutral-400">{beneficiary?.account}</p>
          </div>
        </div>
      );
    },
  },
  {
    id: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <p className="text-end tabular-nums text-neutral-600">
        {formatMoney(row.original.transaction?.amount, row.original.transaction?.currency)}
      </p>
    ),
  },
  {
    id: "risk",
    header: "Risk",
    cell: ({ row }) => {
      const overall = row.original.overall || {};
      return (
        <div className="flex items-center gap-2">
          <span className="w-7 text-end font-semibold tabular-nums text-heading">
            {overall.riskScore}
          </span>
          <StatusPill variant={riskVariants[overall.riskLabel]}>{overall.riskLabel}</StatusPill>
        </div>
      );
    },
  },
  {
    id: "detectedBy",
    header: "Detected by",
    cell: ({ row }) => <DetectorBadges detectors={row.original.overall?.detectedBy} />,
  },
  {
    id: "caseType",
    header: "Case Type",
    cell: ({ row }) => <p className="text-neutral-500">{row.original.overall?.primaryCaseType}</p>,
  },
  {
    id: "primaryReason",
    header: "Primary Reason",
    size: 280,
    cell: ({ row }) => (
      <p
        className="line-clamp-2 text-xs text-neutral-600"
        title={row.original.overall?.primaryReason}
      >
        {row.original.overall?.primaryReason}
      </p>
    ),
  },
  {
    id: "alert",
    header: "Alert",
    cell: ({ row }) => (
      <p className="font-mono text-xs text-neutral-500">{row.original.alert?.uid || "—"}</p>
    ),
  },
];

function LastRun({ run }) {
  if (!run) return null;
  const { date, time } = formatDateTime(run.finishedAt || run.startedAt);
  const statusVariant = { succeeded: "success", failed: "danger" }[run.status] || "warning";

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>Last monitoring run</span>
      <StatusPill variant={statusVariant}>{run.status}</StatusPill>
      <span>
        {date}, {time} · {run.counts?.transactions ?? 0} transactions scanned ·{" "}
        {run.counts?.risky ?? 0} flagged
      </span>
    </div>
  );
}

export default function AIgeneratedAlerts() {
  const router = useRouter();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState({ items: [], total: 0, summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const requestRef = useRef(0);

  const validationError = validateFilters(filters);

  const fetchResults = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);

    const res = await getAiResults({ ...filters, page, limit });

    console.log("ai-results", res);
    // A newer request was fired while this one was in flight.
    if (requestId !== requestRef.current) return;

    if (res.ok) {
      setResult({
        items: res.data?.items || [],
        total: res.data?.pagination?.total || 0,
        summary: res.data?.summary || null,
      });
    } else {
      setError(res.detail);
      setResult({ items: [], total: 0, summary: null });
    }
    setLoading(false);
  }, [filters, page, limit]);

  // Debounced so typing in the text filters doesn't fire a request per key.
  useEffect(() => {
    if (validationError) return;
    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [fetchResults, validationError]);

  useEffect(() => {
    getLatestAiRun().then((res) => res.ok && setLastRun(res.data));
  }, []);

  const handleFiltersChange = (next) => {
    setFilters(next);
    setPage(1);
  };

  const columns = useMemo(
    () =>
      buildColumns({
        onView: setSelectedId,
        onOpenCase: (id) =>
          router.push(`/dashboard/client/monitoring-and-cases/case-manager/${id}`),
      }),
    [router],
  );

  return (
    <div className="space-y-4">
      <AiAlertFilters
        filters={filters}
        onChange={handleFiltersChange}
        onReset={() => handleFiltersChange(defaultFilters())}
        error={validationError}
      />

      <LastRun run={lastRun} />

      {error ? (
        <Alert variant="destructive">
          <IconAlertTriangle />
          <AlertTitle>Could not load AI generated alerts</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={fetchResults}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <AiAlertSummary summary={result.summary} loading={loading} />
      )}

      <div>
        <CustomResizableTable
          data={result.items}
          columns={columns}
          loading={loading}
          tableId="ai-alert-list-table"
          mainClass="ai-alert-list-table"
          onDoubleClick={(row) => setSelectedId(row.transactionId)}
        />
        <CustomPagination
          currentPage={page}
          onPageChange={({ selected }) => setPage(selected + 1)}
          totalItems={result.total}
          limit={limit}
          onChangeLimit={(value) => {
            setLimit(Number(value));
            setPage(1);
          }}
        />
      </div>

      <AiAlertDetailSheet transactionId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
