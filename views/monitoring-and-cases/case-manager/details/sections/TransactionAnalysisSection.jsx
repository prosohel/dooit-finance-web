"use client";

// Transaction analysis — the case's linked transactions, read the way an
// analyst reads them: money in vs money out (in AUD, so rows in different
// currencies can be summed), what was flagged, and who was on each side.
//
// Direction and AUD amounts are derived in caseAdapter from real payload
// fields (party customer refs, convertedAmountAUD) — nothing here guesses
// from display strings.

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import CollapsibleSection from "../components/CollapsibleSection";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconSearch,
  IconArrowRight,
  IconAlertTriangle,
  IconCircleCheck,
  IconArrowsSort,
  IconArrowsExchange,
} from "@tabler/icons-react";
import { cn, dateShowFormat, dateShowFormatWithTime } from "@/lib/utils";

const CustomResizableTable = dynamic(() => import("@/components/ui/CustomResizable"), {
  ssr: false,
});

const chartConfig = {
  flagged: { label: "Flagged", color: "var(--danger)" },
  normal: { label: "Normal", color: "var(--muted-foreground)" },
};

// Transaction sender/receiver are PartySchema subdocuments on the API
// ({ name, account, institution, ... }) but plain strings in the mock
// fixtures — never render either straight into JSX.
const partyName = (party) => {
  if (!party) return "";
  if (typeof party === "string") return party;
  return party.name || party.account || party.institution || "";
};

const partyInstitution = (party) =>
  party && typeof party === "object" ? party.institution || null : null;

function formatCurrency(amount, currency = "AUD") {
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

const DIRECTION_STYLE = {
  in: "bg-success/10 text-success",
  out: "bg-danger/10 text-danger",
  internal: "bg-info/10 text-cyan-800",
};

function DirectionPill({ txn }) {
  if (!txn.direction) {
    return <span className="text-xs text-muted-foreground">{txn.paymentChannel || "—"}</span>;
  }
  const label = { in: "In", out: "Out", internal: "Internal" }[txn.direction];
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        DIRECTION_STYLE[txn.direction],
      )}
    >
      {label}
    </span>
  );
}

function SummaryStat({ label, value, sub, colorClass }) {
  return (
    <div className="min-w-0 flex-1 px-4 py-2 first:pl-3 last:pr-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("truncate text-base font-bold", colorClass)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function TransactionAnalysisSection({ caseData, sectionRef, collapsible = true }) {
  const transactions = useMemo(() => caseData?.transactions || [], [caseData?.transactions]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortAmt, setSortAmt] = useState(null); // "asc" | "desc" | null

  // All sums in AUD — amountAUD falls back to the raw amount only for rows the
  // server never converted.
  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        const aud = t.amountAUD ?? t.amount ?? 0;
        if (t.direction === "in") acc.in += aud;
        if (t.direction === "out") acc.out += aud;
        if (t.status === "flagged") {
          acc.flaggedCount += 1;
          acc.flaggedValue += aud;
        }
        return acc;
      },
      { in: 0, out: 0, flaggedCount: 0, flaggedValue: 0 },
    );
  }, [transactions]);

  const chartData = useMemo(() => {
    const map = new Map();
    transactions.forEach((t) => {
      // Mock fixtures use `date`; the API uses `timestamp`.
      const day = String(t.date || t.timestamp || "").slice(0, 10);
      if (!day) return;
      if (!map.has(day)) map.set(day, { date: day, flagged: 0, normal: 0 });
      const entry = map.get(day);
      entry[t.status === "flagged" ? "flagged" : "normal"] += t.amountAUD ?? t.amount ?? 0;
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = transactions.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return [
          partyName(t.sender),
          partyName(t.receiver),
          partyInstitution(t.sender),
          partyInstitution(t.receiver),
          t.country,
          t.id || t.uid,
        ].some((field) => String(field || "").toLowerCase().includes(q));
      }
      return true;
    });

    if (sortAmt === "asc") list = [...list].sort((a, b) => (a.amountAUD ?? 0) - (b.amountAUD ?? 0));
    if (sortAmt === "desc") list = [...list].sort((a, b) => (b.amountAUD ?? 0) - (a.amountAUD ?? 0));

    return list;
  }, [transactions, search, statusFilter, sortAmt]);

  const columns = useMemo(
    () => [
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <p className="text-xs text-muted-foreground">
              {dateShowFormatWithTime(row.original.date)}
            </p>
            {row.original.uid && (
              <p className="font-mono text-[10px] text-muted-foreground/70">{row.original.uid}</p>
            )}
          </div>
        ),
        size: 180,
      },
      {
        id: "direction",
        header: "Direction",
        cell: ({ row }) => <DirectionPill txn={row.original} />,
        size: 90,
      },
      {
        id: "amount",
        header: () => (
          <button
            className="flex items-center gap-1 hover:text-heading transition-colors"
            onClick={() =>
              setSortAmt((prev) => (prev === null ? "desc" : prev === "desc" ? "asc" : null))
            }
          >
            Amount
            <IconArrowsSort className="size-3.5" />
          </button>
        ),
        cell: ({ row }) => {
          const t = row.original;
          const foreign = t.currency && t.currency !== "AUD";
          return (
            <div className="whitespace-nowrap">
              <p className="font-semibold text-heading">{formatCurrency(t.amount, t.currency)}</p>
              {foreign && t.amountAUD != null && (
                <p className="text-[11px] text-muted-foreground">
                  ≈ {formatCurrency(t.amountAUD)}
                </p>
              )}
            </div>
          );
        },
        size: 150,
      },
      {
        id: "senderReceiver",
        header: "Sender → Receiver",
        cell: ({ row }) => {
          const { sender, receiver } = row.original;
          const institutions = [partyInstitution(sender), partyInstitution(receiver)]
            .filter(Boolean)
            .join(" → ");
          return (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-heading">{partyName(sender) || "—"}</span>
                <IconArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-heading">{partyName(receiver) || "—"}</span>
              </div>
              {institutions && (
                <p className="text-[11px] text-muted-foreground">{institutions}</p>
              )}
            </div>
          );
        },
        size: 260,
      },
      {
        id: "country",
        header: "Country",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.country || "—"}</span>
        ),
        size: 100,
      },
      {
        id: "channel",
        header: "Channel",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.original.paymentChannel}
          </Badge>
        ),
        size: 130,
      },
      {
        id: "risk",
        header: "Risk",
        cell: ({ row }) => {
          const { riskScore, riskIndicator } = row.original;
          if (!riskScore && !riskIndicator?.length) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-wrap items-center gap-1">
              {riskScore > 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    riskScore >= 60
                      ? "border-danger/20 bg-danger/10 text-danger"
                      : "border-warning/20 bg-warning/10 text-yellow-700",
                  )}
                >
                  {riskScore}
                </Badge>
              )}
              {(riskIndicator || []).map((r) => (
                <Badge
                  key={r}
                  className="border-danger/20 bg-danger/10 text-xs text-danger"
                  variant="outline"
                >
                  {r}
                </Badge>
              ))}
            </div>
          );
        },
        size: 220,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.status === "flagged" ? (
            <StatusPill icon={<IconAlertTriangle />} variant="danger">
              Flagged
            </StatusPill>
          ) : (
            <StatusPill icon={<IconCircleCheck />} variant="success">
              Normal
            </StatusPill>
          ),
        size: 110,
      },
    ],
    [],
  );

  return (
    <CollapsibleSection
      id="transactions"
      title="Transaction Analysis"
      icon={IconArrowsExchange}
      badge={transactions.length}
      sectionRef={sectionRef}
      collapsible={collapsible}
    >
      {transactions.length > 0 && (
        <div className="mb-3 flex flex-col divide-y divide-border rounded-lg border border-border sm:flex-row sm:divide-x sm:divide-y-0">
          <SummaryStat label="Money in" value={formatCurrency(summary.in)} colorClass="text-success" />
          <SummaryStat label="Money out" value={formatCurrency(summary.out)} colorClass="text-danger" />
          <SummaryStat
            label="Net movement"
            value={formatCurrency(summary.in - summary.out)}
            sub="All amounts in AUD"
            colorClass="text-heading"
          />
          <SummaryStat
            label="Flagged"
            value={formatCurrency(summary.flaggedValue)}
            sub={`${summary.flaggedCount} of ${transactions.length} transactions`}
            colorClass={summary.flaggedCount > 0 ? "text-danger" : "text-heading"}
          />
        </div>
      )}

      {/* A daily pattern needs more than one day — with a single day the chart
          is one giant bar that says nothing the summary strip doesn't. */}
      {chartData.length > 1 && (
        <div className="mb-3 rounded-lg border border-border p-3">
          <ChartContainer config={chartConfig} className="aspect-auto h-[140px] w-full">
            <BarChart data={chartData} barCategoryGap={12}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => dateShowFormat(v)}
                fontSize={11}
              />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => dateShowFormat(v)} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="normal" stackId="a" maxBarSize={48} fill="var(--color-normal)" radius={[0, 0, 4, 4]} />
              <Bar dataKey="flagged" stackId="a" maxBarSize={48} fill="var(--color-flagged)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
        <div className="relative">
          <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 w-56 pl-7 text-xs"
            placeholder="Search parties, reference, country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {transactions.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No transactions are linked to this case. Linking an alert brings its transaction with it.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <CustomResizableTable
            mainClass="case-transactions-table"
            tableId="case-transactions-table"
            columns={columns}
            data={filtered}
            className="border-0"
          />
        </div>
      )}
    </CollapsibleSection>
  );
}
