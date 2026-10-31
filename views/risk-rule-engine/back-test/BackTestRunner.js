'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, FlaskConical, Loader2, Play, Zap } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Badge }  from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { runBacktest } from '@/app/dashboard/client/risk-rule-engine/back-test/actions'

// ─────────────────────────────────────────────────────────────────────────────
// Constants / helpers
// ─────────────────────────────────────────────────────────────────────────────

const WINDOW_CHIPS = [7, 30, 90, 180]
const SAMPLE_LIMIT = 50

const OPERATOR_LABEL = {
  eq: '=', ne: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤',
  in: 'in', nin: 'not in', between: 'between', contains: 'contains',
  startsWith: 'starts with', endsWith: 'ends with', exists: 'exists', regex: 'matches',
}

const SOURCE_LABEL = {
  logic:      'Logic tree',
  conditions: 'Structured conditions',
  dsl:        'Parsed DSL string',
}

const toYMD = (d) => d.toISOString().slice(0, 10)

const daysAgoYMD = (n) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return toYMD(d)
}

const fmtNum   = (n) => (n ?? 0).toLocaleString()
const fmtPct   = (n) => `${((n ?? 0) * 100).toFixed(2)}%`
const fmtMoney = (n) =>
  (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
const fmtDateTime = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString()
}
// perDay keys are date-only UTC strings ('2026-08-18') — format them in UTC
// so viewers west of Greenwich don't see every bar shifted a day back.
const fmtDayLabel = (v) =>
  new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })

const chartConfig = {
  matched: { label: 'Matched', color: 'var(--primary)' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const StatTile = ({ label, value, sub }) => (
  <Card className="p-4 gap-1">
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </Card>
)

const PassedLeafBadges = ({ leaves }) => (
  <div className="flex flex-wrap gap-1">
    {leaves.filter((l) => l.pass).map((l, i) => (
      <Badge
        key={i}
        variant="outline"
        className="font-mono text-[10px] font-normal"
        title={`actual: ${Array.isArray(l.actual) ? l.actual.join(', ') : String(l.actual)}`}
      >
        {l.field} {OPERATOR_LABEL[l.operator] ?? l.operator} {l.expected}
      </Badge>
    ))}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Self-contained backtest runner + results for ONE rule.
 *
 * Used in three places:
 *   - the Back Test page   → `leading` carries the rule picker
 *   - the rule detail page → rule is preloaded, no `leading`
 *   - the list-row modal   → rule is preloaded, `autoRun` starts immediately
 *
 * Props:
 *   rule    — full rule object ({ _id, evaluable, aggregation, … }) or null
 *   leading — optional node rendered at the start of the controls row
 *   autoRun — start the backtest as soon as a runnable rule is set
 */
export default function BackTestRunner({ rule, leading = null, autoRun = false }) {
  const [fromDate, setFromDate] = useState(daysAgoYMD(90))
  const [toDate,   setToDate]   = useState(toYMD(new Date()))
  const [running,  setRunning]  = useState(false)
  const [result,   setResult]   = useState(null)

  // Remembers which rule already auto-ran, so re-renders don't re-fire it
  const autoRanFor = useRef(null)

  // Switching rules invalidates the previous run's results
  useEffect(() => { setResult(null) }, [rule?._id])

  const activeWindow = useMemo(() => {
    if (toDate !== toYMD(new Date())) return null
    return WINDOW_CHIPS.find((d) => fromDate === daysAgoYMD(d)) ?? null
  }, [fromDate, toDate])

  const applyWindow = (days) => {
    setFromDate(daysAgoYMD(days))
    setToDate(toYMD(new Date()))
  }

  const handleRun = async () => {
    if (!rule?._id) { toast.error('Select a rule to backtest'); return }
    if (!fromDate || !toDate) { toast.error('Pick a date range'); return }
    // Equal dates are a valid single-day window (00:00 → 23:59)
    if (fromDate > toDate) { toast.error('"From" must be on or before "To"'); return }

    setRunning(true)
    setResult(null)
    try {
      const res = await runBacktest({
        ruleId: rule._id,
        from: `${fromDate}T00:00:00.000Z`,
        to:   `${toDate}T23:59:59.999Z`,
        sampleLimit: SAMPLE_LIMIT,
      })
      if (!res?.success) {
        toast.error(res?.message || 'Backtest failed')
        return
      }
      setResult(res)
      if (res.matchedCount === 0) toast.info('Backtest complete — no matches in this window')
      else toast.success(`Backtest complete — ${res.matchedCount.toLocaleString()} match${res.matchedCount === 1 ? '' : 'es'}`)
    } catch (e) {
      toast.error(e?.message || 'Backtest failed')
    } finally {
      setRunning(false)
    }
  }

  // Auto-start (list-row modal): run once per rule with the default window.
  useEffect(() => {
    if (!autoRun || !rule?._id || rule.evaluable === false) return
    if (autoRanFor.current === rule._id) return
    autoRanFor.current = rule._id
    handleRun()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, rule?._id])

  const hasAgg = !!result?.aggregation

  return (
    <div className="space-y-4">

      {/* ── Runner controls ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {leading}

            <div className="flex items-center gap-1">
              {WINDOW_CHIPS.map((d) => (
                <Button
                  key={d}
                  variant={activeWindow === d ? 'default' : 'outline'}
                  size="sm"
                  className="px-2.5"
                  onClick={() => applyWindow(d)}
                >
                  {d}d
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-sm">
              <Input type="date" className="w-[150px]" value={fromDate}
                onChange={(e) => setFromDate(e.target.value)} />
              <span className="text-muted-foreground">→</span>
              <Input type="date" className="w-[150px]" value={toDate}
                onChange={(e) => setToDate(e.target.value)} />
            </div>

            <div className="flex-1" />

            <Button onClick={handleRun}
              disabled={running || !rule || rule.evaluable === false}
              className="gap-1.5">
              {running
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
                : <><Play className="w-4 h-4" /> Run Back Test</>}
            </Button>
          </div>

          {rule?.evaluable === false && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p>
                This rule&apos;s condition is free-text prose
                {rule.ruleCondition ? <> (<span className="italic">“{rule.ruleCondition}”</span>)</> : ''} —
                it has no logic tree, no structured conditions, and the text isn&apos;t parseable DSL,
                so the engine has nothing to execute. Edit the rule and add structured conditions
                to make it backtestable.
              </p>
            </div>
          )}

          {rule?.aggregation && (rule.aggregation.count || rule.aggregation.sumThreshold != null) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Velocity rule — matches are grouped into
              {' '}{rule.aggregation.window?.value ?? 1} {rule.aggregation.window?.unit ?? 'minute'} windows
              per customer before firing.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!result && !running && (
        <div className="py-16 text-center text-muted-foreground">
          <FlaskConical className="w-9 h-9 mx-auto mb-2 opacity-60" />
          <p className="text-sm">
            {rule ? 'Pick a window, then run the back test.' : 'Pick a rule and a window, then run the back test.'}
          </p>
        </div>
      )}

      {running && (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p className="text-sm">Replaying transactions…</p>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {result && !running && (
        <div className="space-y-4">

          {/* Warnings */}
          {result.truncated && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p>
                The window holds {fmtNum(result.totalInRange)} transactions but only the first{' '}
                {fmtNum(result.scanned)} (oldest first) were evaluated. Narrow the date range for
                complete coverage.
              </p>
            </div>
          )}
          {result.fieldMisses?.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium">Some rule fields never resolved against transaction data:</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {result.fieldMisses.map((m) => `${m.field} (${fmtNum(m.count)}×)`).join(' · ')}
                  {' '}— these conditions evaluated as false every time. Check spelling or field aliases.
                </p>
              </div>
            </div>
          )}

          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatTile
              label="Transactions Scanned"
              value={fmtNum(result.scanned)}
              sub={`of ${fmtNum(result.totalInRange)} in range`}
            />
            <StatTile
              label="Matched"
              value={fmtNum(result.matchedCount)}
              sub={`hit rate ${fmtPct(result.hitRate)}`}
            />
            <StatTile
              label="Would-be Alerts"
              value={fmtNum(result.wouldFireAlerts)}
              sub={`≈ ${result.alertsPerDay.toFixed(1)} / day`}
            />
            <StatTile
              label="Unique Customers"
              value={fmtNum(result.uniqueCustomers)}
            />
            <StatTile
              label="Matched Volume"
              value={fmtMoney(result.matchedAmount)}
              sub="AUD equiv. where available"
            />
            <StatTile
              label="Evaluated Via"
              value={
                <Badge variant="secondary" className="text-xs">
                  {SOURCE_LABEL[result.evaluationSource] || result.evaluationSource}
                </Badge>
              }
              sub={result.rule?.version ? `rule v${result.rule.version}` : undefined}
            />
          </div>

          {/* Daily chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Matched transactions per day
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {result.matchedCount === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No matches in this window.
                </p>
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
                  <BarChart data={result.perDay}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={fmtDayLabel}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={34}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                      content={
                        <ChartTooltipContent
                          labelFormatter={fmtDayLabel}
                          indicator="dot"
                        />
                      }
                    />
                    <Bar
                      dataKey="matched"
                      fill="var(--color-matched)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Aggregation windows (velocity rules) */}
          {hasAgg && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Velocity Windows
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {fmtNum(result.aggregation.windowsFired)} of{' '}
                  {fmtNum(result.aggregation.windowsEvaluated)} customer-windows breached the
                  thresholds
                  {result.aggregation.count != null && <> · count ≥ {result.aggregation.count}</>}
                  {result.aggregation.sumThreshold != null && <> · sum ≥ {fmtMoney(result.aggregation.sumThreshold)}</>}
                  {' '}({result.aggregation.window?.value ?? 1} {result.aggregation.window?.unit ?? 'minute'} window,
                  tumbling approximation).
                </p>
                {result.aggregation.firedWindows?.length > 0 && (
                  <div className="w-full overflow-x-auto rounded-md border">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Window Start</th>
                          <th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Subject</th>
                          <th className="text-right px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Txn Count</th>
                          <th className="text-right px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Sum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.aggregation.firedWindows.map((w, i) => (
                          <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                            <td className="px-3 py-2 text-xs">{fmtDateTime(w.windowStart)}</td>
                            <td className="px-3 py-2 font-mono text-xs">{w.subject}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmtNum(w.count)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(w.sum)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Matched samples */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Matched Transactions
                <span className="ml-2 font-normal text-xs text-muted-foreground">
                  showing {fmtNum(result.sample?.length || 0)} of {fmtNum(result.matchedCount)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result.sample?.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nothing matched this rule in the selected window.
                </p>
              ) : (
                <div className="w-full overflow-x-auto rounded-md border">
                  <table className="w-full text-sm min-w-[860px]">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Time</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Txn</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Type</th>
                        <th className="text-right px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Amount</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Parties</th>
                        {hasAgg && (
                          <th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Window</th>
                        )}
                        <th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Matched Conditions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.sample.map((s, i) => (
                        <tr key={s.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                          <td className="px-3 py-2 text-xs whitespace-nowrap">{fmtDateTime(s.timestamp)}</td>
                          <td className="px-3 py-2 font-mono text-xs">{s.uid || s.id.slice(-8)}</td>
                          <td className="px-3 py-2 text-xs capitalize">
                            {s.type}{s.channel ? ` · ${s.channel}` : ''}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                            {fmtMoney(s.amount)} {s.currency}
                            {s.convertedAmountAUD != null && s.currency !== 'AUD' && (
                              <span className="block text-[10px] text-muted-foreground">
                                ≈ {fmtMoney(s.convertedAmountAUD)} AUD
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {s.senderName || '—'} → {s.receiverName || '—'}
                          </td>
                          {hasAgg && (
                            <td className="px-3 py-2">
                              {s.inFiredWindow
                                ? <Badge className="text-[10px]">Fired</Badge>
                                : <Badge variant="outline" className="text-[10px]">Below threshold</Badge>}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <PassedLeafBadges leaves={s.leaves || []} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
