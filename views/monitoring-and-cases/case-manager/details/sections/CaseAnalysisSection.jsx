"use client";

// Case Analysis — every figure this case's reports are built from, straight
// from GET /cases/:id/analysis (docs/74 §6.2). Nothing here is invented in the
// browser and nothing comes from the AI service: the API computes the numbers,
// this panel renders them.
//
// Form note: these are headline numbers and long class lists, so the panel is a
// KPI row of stat tiles plus tables — not charts. Tile values use the font's
// proportional figures; only table columns get `tabular-nums` so they align.

import { useState } from "react";
import {
  IconAlertTriangle,
  IconBuildingBank,
  IconChartHistogram,
  IconCoinBitcoin,
  IconDeviceDesktop,
  IconFileText,
  IconLoader2,
  IconRefresh,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/skeleton";
import CollapsibleSection from "../components/CollapsibleSection";
import SubCard from "../components/SubCard";
import { dateShowFormat } from "@/lib/utils";

/* ── formatting ─────────────────────────────────────────────────────────── */

// Compact above a million so a tile never wraps; the exact figure is always
// repeated in the tile's context line and in the tables below it.
const audTile = (n) => {
  const value = Number(n) || 0;
  return Math.abs(value) >= 1_000_000
    ? new Intl.NumberFormat("en-AU", { notation: "compact", maximumFractionDigits: 1 }).format(value)
    : new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(value);
};

const exact = (n) => new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 }).format(Number(n) || 0);

const amountWithCurrency = (n, currency) => `${exact(n)}${currency ? ` ${currency}` : ""}`;

/* ── small building blocks ──────────────────────────────────────────────── */

/** One headline number: label, value, and a line of context under it. */
function StatTile({ label, value, context, tone }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${tone === "danger" ? "text-danger" : "text-heading"}`}
      >
        {value}
      </p>
      {context && <p className="mt-0.5 text-xs text-muted-foreground">{context}</p>}
    </div>
  );
}

/** Compact table. Numeric cells opt into tabular figures so columns line up. */
function DataTable({ columns, rows, empty }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => (
              <th key={c.key} className={`py-1.5 pr-3 font-medium ${c.numeric ? "text-right" : ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row._key || i} className="border-b border-border/60 last:border-0">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`py-1.5 pr-3 align-top ${c.numeric ? "text-right tabular-nums" : ""}`}
                >
                  {c.render ? c.render(row) : (row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "cash-intensive · 2" pills from a { key: count } map. */
function CountPills({ counts, empty }) {
  const entries = Object.entries(counts || {});
  if (!entries.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([key, n]) => (
        <Badge key={key} variant="outline" className="text-xs font-normal">
          {key} · {n}
        </Badge>
      ))}
    </div>
  );
}

/* ── panel ──────────────────────────────────────────────────────────────── */

export default function CaseAnalysisSection({ analysis, loading, onRefresh, sectionRef }) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  const header = (
    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={refresh} disabled={refreshing || loading}>
      {refreshing ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconRefresh className="size-3.5" />}
      Recompute
    </Button>
  );

  if (loading || !analysis) {
    return (
      <CollapsibleSection id="case-analysis" title="Case Analysis" icon={IconChartHistogram} sectionRef={sectionRef}>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No analysis available for this case yet.
          </p>
        )}
      </CollapsibleSection>
    );
  }

  const { window, totals, byCurrency, counts, ratios, largestTransaction, structuring } = analysis;
  const windowLabel =
    window?.source === "analyst" ? "analyst-set period" : window?.source === "request" ? "ad-hoc period" : "default period";

  // Currencies appear on either side, so build the row set from both maps.
  const currencyRows = [
    ...new Set([...Object.keys(byCurrency?.deposits || {}), ...Object.keys(byCurrency?.withdrawals || {})]),
  ].map((code) => ({
    _key: code,
    code,
    deposits: byCurrency.deposits?.[code] ?? 0,
    withdrawals: byCurrency.withdrawals?.[code] ?? 0,
  }));

  return (
    <CollapsibleSection
      id="case-analysis"
      title="Case Analysis"
      icon={IconChartHistogram}
      badge={totals.transactionCount}
      sectionRef={sectionRef}
      actions={header}
    >
      <div className="flex flex-col gap-4">
        {/* period + provenance */}
        <p className="text-xs text-muted-foreground">
          {dateShowFormat(window?.start)} → {dateShowFormat(window?.end)} ({windowLabel}) · computed from linked
          transactions and the persons of interest&apos;s activity in this tenant.
        </p>

        {/* completeness warnings — never let a partial total read as a full one */}
        {(totals.unconvertedCount > 0 || analysis.truncated) && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
            <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              {totals.unconvertedCount > 0 && (
                <p>
                  {totals.unconvertedCount} transaction{totals.unconvertedCount === 1 ? " has" : "s have"} no AUD
                  conversion and {totals.unconvertedCount === 1 ? "is" : "are"} excluded from every AUD total below.
                  The per-currency table is complete.
                </p>
              )}
              {analysis.truncated && <p>Only the most recent transactions were analysed — totals are a lower bound.</p>}
            </div>
          </div>
        )}

        {/* headline numbers */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label="Transactions"
            value={totals.transactionCount}
            context={`${totals.activeDays} active day${totals.activeDays === 1 ? "" : "s"} · ${totals.flaggedTxnCount} flagged`}
          />
          <StatTile label="Inflow (AUD)" value={audTile(totals.depositsAUD)} context={`${exact(totals.depositsAUD)} across ${totals.depositCount}`} />
          <StatTile label="Outflow (AUD)" value={audTile(totals.withdrawalsAUD)} context={`${exact(totals.withdrawalsAUD)} across ${totals.withdrawalCount}`} />
          <StatTile
            label="Net flow (AUD)"
            value={audTile(totals.netFlowAUD)}
            context={exact(totals.netFlowAUD)}
            tone={totals.netFlowAUD < 0 ? "danger" : undefined}
          />
          <StatTile
            label="Pass-through"
            value={ratios.passThrough === null ? "—" : `${(ratios.passThrough * 100).toFixed(0)}%`}
            context={ratios.passThrough === null ? "No inflow to compare against" : "Outflow ÷ inflow"}
          />
          <StatTile label="Peak day (AUD)" value={audTile(totals.peakDailyVolumeAUD)} context={`Average ${exact(totals.averageAUD)}`} />
        </div>

        {/* exact per-currency figures — always complete, conversion or not */}
        <SubCard icon={IconFileText} title="By currency" count={currencyRows.length} empty="No transactions in scope.">
          <DataTable
            columns={[
              { key: "code", header: "Currency" },
              { key: "deposits", header: "In", numeric: true, render: (r) => exact(r.deposits) },
              { key: "withdrawals", header: "Out", numeric: true, render: (r) => exact(r.withdrawals) },
            ]}
            rows={currencyRows}
            empty="No transactions in scope."
          />
        </SubCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <SubCard icon={IconUsers} title="Counterparties" count={analysis.counterparties.length} empty="No counterparties recorded.">
            <DataTable
              columns={[
                { key: "name", header: "Name", render: (r) => r.name || r.account || "—" },
                { key: "institutionCountry", header: "Country", render: (r) => r.institutionCountry || "—" },
                { key: "transactionCount", header: "Txns", numeric: true },
                { key: "totalAmountAUD", header: "AUD", numeric: true, render: (r) => exact(r.totalAmountAUD) },
              ]}
              rows={analysis.counterparties.slice(0, 10).map((c, i) => ({ ...c, _key: `${c.name}-${i}` }))}
              empty="No counterparties recorded."
            />
          </SubCard>

          <SubCard icon={IconBuildingBank} title="Institutions" count={analysis.institutions.length} empty="No institutions recorded.">
            <DataTable
              columns={[
                { key: "name", header: "Institution" },
                { key: "country", header: "Country", render: (r) => r.country || "—" },
                { key: "bic", header: "BIC", render: (r) => r.bic || "—" },
                { key: "transactionCount", header: "Txns", numeric: true },
              ]}
              rows={analysis.institutions.map((x, i) => ({ ...x, _key: `${x.name}-${i}` }))}
              empty="No institutions recorded."
            />
          </SubCard>

          <SubCard icon={IconWorld} title="Jurisdictions" count={analysis.jurisdictions.length} empty="No jurisdictions recorded.">
            <DataTable
              columns={[
                {
                  key: "code",
                  header: "Country",
                  // High risk is labelled, not just coloured.
                  render: (r) => (
                    <span className="flex items-center gap-1.5">
                      {r.name || r.code}
                      {r.highRisk && <StatusPill variant="danger">High risk</StatusPill>}
                    </span>
                  ),
                },
                { key: "riskCategory", header: "Band", render: (r) => r.riskCategory || "—" },
                { key: "transactionCount", header: "Txns", numeric: true },
                { key: "totalAmountAUD", header: "AUD", numeric: true, render: (r) => exact(r.totalAmountAUD) },
              ]}
              rows={analysis.jurisdictions.map((j) => ({ ...j, _key: j.code }))}
              empty="No jurisdictions recorded."
            />
          </SubCard>

          <SubCard icon={IconUsers} title="Persons of interest" count={analysis.pois.length} empty="No POIs on this case.">
            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Name",
                  render: (r) => (
                    <span className="flex flex-col">
                      <span>{r.name || r.uid || "—"}</span>
                      <span className="text-xs text-muted-foreground">{r.role === "subject" ? "Subject" : "Linked"}</span>
                    </span>
                  ),
                },
                { key: "kycStatus", header: "KYC", render: (r) => r.kycStatus || "—" },
                {
                  key: "flags",
                  header: "Screening",
                  render: (r) => (
                    <span className="flex flex-wrap gap-1">
                      {r.isPep && <StatusPill variant="warning">PEP</StatusPill>}
                      {r.sanction && <StatusPill variant="danger">Sanctioned</StatusPill>}
                      {!r.isPep && !r.sanction && <span className="text-muted-foreground">Clear</span>}
                    </span>
                  ),
                },
                { key: "riskScore", header: "CRA", numeric: true, render: (r) => (r.riskScore ?? "—") },
              ]}
              rows={analysis.pois.map((p) => ({ ...p, _key: String(p.customer) }))}
              empty="No POIs on this case."
            />
          </SubCard>
        </div>

        {/* how the money moved: type, status and channel mix */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SubCard icon={IconFileText} title="By type" count={Object.keys(counts.byType).length} empty="—">
            <CountPills counts={counts.byType} empty="—" />
          </SubCard>
          <SubCard icon={IconFileText} title="By status" count={Object.keys(counts.byStatus).length} empty="—">
            <CountPills counts={counts.byStatus} empty="—" />
          </SubCard>
          <SubCard icon={IconFileText} title="By channel" count={Object.keys(counts.byChannel).length} empty="—">
            <CountPills counts={counts.byChannel} empty="—" />
          </SubCard>
        </div>

        {/* pattern indicators */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SubCard icon={IconAlertTriangle} title="Risk flags" count={Object.keys(analysis.riskFlags).length} empty="No risk flags on these transactions.">
            <CountPills counts={analysis.riskFlags} empty="No risk flags on these transactions." />
          </SubCard>

          <SubCard icon={IconAlertTriangle} title="Rules triggered" count={analysis.rulesTriggered.length} empty="No rules recorded against this case.">
            <ul className="flex flex-col gap-1.5 text-sm">
              {analysis.rulesTriggered.map((r) => (
                <li key={r.ruleId || r.ruleName} className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs">{r.ruleId || "—"}</span>
                  <span className="text-muted-foreground">{r.ruleName}</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {r.alertCount} alert{r.alertCount === 1 ? "" : "s"}
                  </Badge>
                </li>
              ))}
            </ul>
          </SubCard>
        </div>

        {/* structuring */}
        <SubCard
          icon={IconAlertTriangle}
          title="Sub-threshold deposits"
          count={structuring.candidates}
          empty={`No deposits between ${exact(structuring.bandFromAUD)} and the ${exact(structuring.thresholdAUD)} AUD threshold.`}
        >
          <p className="text-sm">
            {structuring.candidates} deposit{structuring.candidates === 1 ? "" : "s"} between{" "}
            {exact(structuring.bandFromAUD)} and {exact(structuring.thresholdAUD)} AUD, forming{" "}
            {structuring.clusters} cluster{structuring.clusters === 1 ? "" : "s"} inside a 24-hour window.
          </p>
          {structuring.transactions.length > 0 && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">{structuring.transactions.join(", ")}</p>
          )}
        </SubCard>

        {/* evidence */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SubCard icon={IconCoinBitcoin} title="Crypto legs" count={analysis.cryptoAddresses.length} empty="No crypto activity recorded.">
            <DataTable
              columns={[
                { key: "address", header: "Address", render: (r) => <span className="font-mono text-xs">{r.address}</span> },
                { key: "network", header: "Network", render: (r) => r.network || "—" },
                { key: "hops", header: "Hops", numeric: true, render: (r) => r.hops ?? "—" },
                { key: "chainalysisScore", header: "Score", numeric: true, render: (r) => r.chainalysisScore ?? "—" },
              ]}
              rows={analysis.cryptoAddresses.map((c, i) => ({ ...c, _key: `${c.address}-${i}` }))}
              empty="No crypto activity recorded."
            />
          </SubCard>

          <SubCard icon={IconDeviceDesktop} title="IP addresses" count={analysis.ipAddresses.length} empty="No IP evidence recorded.">
            <DataTable
              columns={[
                { key: "ip", header: "IP", render: (r) => <span className="font-mono text-xs">{r.ip}</span> },
                { key: "country", header: "Country", render: (r) => r.country || "—" },
                { key: "transactionCount", header: "Txns", numeric: true },
                { key: "deviceCount", header: "Devices", numeric: true },
              ]}
              rows={analysis.ipAddresses.map((x) => ({ ...x, _key: x.ip }))}
              empty="No IP evidence recorded."
            />
          </SubCard>
        </div>

        {/* largest single movement */}
        {largestTransaction && (
          <SubCard icon={IconFileText} title="Largest transaction" count={1} empty="">
            <p className="text-sm">
              <span className="font-mono text-xs">{largestTransaction.uid || largestTransaction.transactionId}</span>{" "}
              — {amountWithCurrency(largestTransaction.amount, largestTransaction.currency)} (
              {exact(largestTransaction.amountAUD)} AUD) {largestTransaction.direction} on{" "}
              {dateShowFormat(largestTransaction.date)}.
            </p>
          </SubCard>
        )}

        {/* the exact strings the ECDD / GFS drafts reuse */}
        <SubCard icon={IconFileText} title="Report-ready text" count={3} empty="">
          <div className="flex flex-col gap-3 text-sm">
            {[
              ["Deposit details", analysis.narrativeFacts.depositDetails],
              ["Withdrawal details", analysis.narrativeFacts.withdrawalDetails],
              ["Additional information", analysis.narrativeFacts.additionalInfo],
            ].map(([label, text]) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-0.5 whitespace-pre-line">{text}</p>
              </div>
            ))}
          </div>
        </SubCard>
      </div>
    </CollapsibleSection>
  );
}
