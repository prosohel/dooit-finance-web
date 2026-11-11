"use client";

// Monitoring analytics — what the day's detections look like at a glance:
// volume, risk mix, the rules and domains driving them, and score spread.
//
// Built only from fields the daily summary actually returns. Deliberately left
// out: per-currency amounts (they can't be summed, and a KPI of three currency
// lines reads poorly), detector splits (rule-based is ~100% today), and
// triggered fields (an engineering signal, not a triage one).

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CASE_TYPES, RISK_LABELS } from "../constants";
import DetectionNetwork, { hasTransferData } from "./DetectionNetwork";
import DistributionDonut from "./DistributionDonut";
import KpiRow from "./KpiRow";
import ScoreBandsChart from "./ScoreBandsChart";
import { CASE_COLORS, COLORS, HintProvider, RISK_COLORS } from "./shared";

/** Object of counts → donut slices, in a fixed order, unknown keys last. */
const toSlices = (counts = {}, order, colors) =>
  Object.entries(counts)
    .sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
    })
    .map(([key, count]) => ({ key, label: key, count, color: colors[key] || COLORS.muted }));

export function MonitoringAnalyticsSkeleton() {
  return (
    <Card className="gap-0 py-0 shadow-sm">
      <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <div className="grid gap-4 border-t border-border p-5 lg:grid-cols-12">
        <Skeleton className="h-72 lg:col-span-7" />
        <Skeleton className="h-72 lg:col-span-5" />
      </div>
    </Card>
  );
}

export default function MonitoringAnalytics({ summary, transactions, subtitle }) {
  // The network is built from the detection items (sender → beneficiary).
  const networkReady = hasTransferData(transactions);
  const network = <DetectionNetwork transactions={transactions} />;

  // Severity order for risk (worst first) — the reverse of RISK_LABELS.
  const riskSlices = toSlices(summary.byRiskLabel, [...RISK_LABELS].reverse(), RISK_COLORS);
  const caseSlices = toSlices(summary.byCaseType, CASE_TYPES, CASE_COLORS);

  return (
    <HintProvider>
      <Card className="gap-0 overflow-hidden border-border py-0 ">
        <header className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
          <h2 className="text-sm font-semibold text-heading">Monitoring analytics</h2>
          {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
        </header>

        <KpiRow summary={summary} />

        {/* With real links the network earns the top slot; as an empty state it
            would only push the populated charts down, so it moves to the end. */}
        {networkReady && <div className="border-t border-border">{network}</div>}

        <div className="grid grid-cols-1 border-t border-border lg:grid-cols-12 lg:divide-x lg:divide-border ">
          {/* <div className="min-w-0 lg:col-span-7">
            <TopRulesChart rules={summary.topRules} total={summary.total} />
          </div> */}
          <div className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:col-span-6 lg:grid-cols-2 lg:divide-x-0 lg:divide-y lg:border-t-0 ">
            <DistributionDonut title="Risk distribution" data={riskSlices} />
            <DistributionDonut title="Case distribution" data={caseSlices} />
          </div>
          <div className="grid grid-cols-1 border-t border-border lg:grid-cols-6 lg:divide-x lg:divide-border lg:col-span-6 border ">
            {/* <div className="lg:col-span-7">
            <DomainsChart domains={summary.byDomain} total={summary.total} />
          </div> */}
            <div className="border-t border-border lg:col-span-5 lg:border-t-0">
              <ScoreBandsChart bands={summary.scoreBands} />
            </div>
          </div>
        </div>

        {!networkReady && <div className="border-t border-border">{network}</div>}
      </Card>
    </HintProvider>
  );
}
