"use client";

// Case Analytics — one panel.
//
// Replaces AnalyticsCards + ChartsSection, which rendered seven separate cards
// above the case table. Most of that height was chrome, not data: every Card
// carries 24px of padding top AND bottom, and six 16px gaps sat between them —
// roughly 380px of padding around ~140px of content, pushing the table itself
// below the fold. One panel with hairline dividers keeps every figure and every
// chart in about 230px.
//
// It also collapses a duplicated request: the two old components each called
// GET /cases/analytics on mount, so the dashboard fetched the same payload
// twice. One panel, one call.

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconAlertCircle,
  IconCircleCheck,
  IconClipboardList,
  IconClock,
} from "@tabler/icons-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  caseAnalytics,
  caseTypeDistribution,
  caseTrendData,
  analystPerformanceData,
} from "@/lib/case-manager-data";
import { getCaseAnalytics } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";

// Series colours are unchanged from the previous charts — this was a density
// pass, not a palette change.
const TREND_SERIES = [
  { key: "opened", label: "Opened", color: "#3b82f6" },
  { key: "closed", label: "Closed", color: "#22c55e" },
  { key: "inReview", label: "In review", color: "#f97316" },
];

const PERFORMANCE_SERIES = [
  { key: "assigned", label: "Assigned", color: "#6366f1" },
  { key: "completed", label: "Completed", color: "#22c55e" },
];

const METRICS = [
  { label: "Total Reviews", valueKey: "totalReviews", changeKey: "totalReviewsChange", icon: IconClipboardList, iconColor: "text-primary" },
  { label: "Completed", valueKey: "completedReviews", changeKey: "completedReviewsChange", icon: IconCircleCheck, iconColor: "text-success" },
  { label: "Open", valueKey: "openReviews", changeKey: "openReviewsChange", icon: IconAlertCircle, iconColor: "text-warning" },
  { label: "Avg Review Time", valueKey: "avgReviewTimeDays", changeKey: "avgReviewTimeChange", icon: IconClock, iconColor: "text-primary-light", suffix: "days" },
];

// Fewer open cases and a shorter review time are improvements, so their arrows
// point down in green. Reading the sign alone would paint both red.
const LOWER_IS_BETTER = new Set(["openReviews", "avgReviewTimeDays"]);

/** Shared chart tooltip — the only place exact values are shown, now that the
 *  charts are small enough to drop their inline labels. */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white p-2.5 text-xs shadow-md">
      {label && <p className="mb-1 font-semibold text-heading">{label}</p>}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="capitalize text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-heading">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/** A chart's title row, with its legend inline — the legend used to cost a
 *  whole row beneath each chart. */
function ChartHead({ title, aside, series }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[11px] font-semibold text-heading">{title}</span>
      {aside && <span className="text-[10px] text-muted-foreground">{aside}</span>}
      {series && (
        <span className="flex gap-2.5 text-[10px] text-muted-foreground">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1">
              <span className="size-2 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

export default function CaseAnalyticsPanel() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    let active = true;
    getCaseAnalytics()
      .then((r) => {
        if (active && r?.data) setAnalytics(r.data);
      })
      .catch((e) => console.error("Failed to load case analytics", e));
    return () => {
      active = false;
    };
  }, []);

  // The mock data stays as the initial value so the panel has shape before the
  // request lands, and as the fallback if it fails.
  const summary = analytics?.summary || caseAnalytics;
  const types = analytics?.typeDistribution?.length ? analytics.typeDistribution : caseTypeDistribution;
  const trend = analytics?.trend?.length ? analytics.trend : caseTrendData;
  const performance = analytics?.analystPerformance?.length
    ? analytics.analystPerformance
    : analystPerformanceData;

  const totalCases = types.reduce((sum, t) => sum + (t.count || 0), 0);

  return (
    <Card className="gap-0 overflow-hidden border-border py-0 shadow-sm">
      {/* ── Metrics: one row, divided rather than boxed ── */}
      <div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          const change = summary[metric.changeKey] ?? 0;
          const improved = LOWER_IS_BETTER.has(metric.valueKey) ? change <= 0 : change >= 0;
          const Arrow = change >= 0 ? IconArrowUpRight : IconArrowDownRight;

          return (
            <div key={metric.label} className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Icon className={cn("size-3.5", metric.iconColor)} />
                <span className="text-[11px] text-muted-foreground">{metric.label}</span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-[22px] font-semibold leading-tight text-heading">
                  {summary[metric.valueKey]}
                  {metric.suffix && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {metric.suffix}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[11px] font-medium",
                    improved ? "text-success" : "text-danger"
                  )}
                >
                  <Arrow className="size-3" />
                  {Math.abs(change)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts: the same three, shorter, legends moved into their titles ── */}
      <div className="grid grid-cols-1 divide-y divide-border border-t border-border lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        <div className="px-4 py-3">
          <ChartHead title="Case Types" aside={`${totalCases} cases`} />
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <ResponsiveContainer width={92} height={92}>
                <PieChart>
                  <Pie
                    data={types}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {types.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-lg border bg-white p-2.5 text-xs shadow-md">
                          <p className="font-semibold text-heading">{payload[0].payload.name}</p>
                          <p className="text-muted-foreground">
                            {payload[0].payload.value}% · {payload[0].payload.count} cases
                          </p>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* The total belongs in the hole the donut already leaves. */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-semibold leading-none text-heading">{totalCases}</span>
                <span className="text-[8px] text-muted-foreground">cases</span>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {types.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-[10.5px]">
                  <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="flex-1 truncate text-muted-foreground">{item.name}</span>
                  <span className="font-semibold text-heading">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-3">
          <ChartHead title="Case Trend" series={TREND_SERIES} />
          <ResponsiveContainer width="100%" height={104}>
            <LineChart data={trend} margin={{ top: 4, right: 6, bottom: 0, left: -22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eeef" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              {TREND_SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={1.75}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="px-4 py-3 lg:col-span-2">
          <ChartHead title="Analyst Performance" series={PERFORMANCE_SERIES} />
          <ResponsiveContainer width="100%" height={104}>
            <BarChart data={performance} margin={{ top: 4, right: 6, bottom: 0, left: -22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eeef" vertical={false} />
              {/* Only the first name: the full names forced a -20° tilt and a
                  30px bottom margin just to fit. */}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                tickFormatter={(name) => String(name).split(" ")[0]}
              />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              {PERFORMANCE_SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
