'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Clock, Eye, FlaskConical, Pencil, Shield, ShieldOff,
  Tag, Trash2, Users, Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import useGetUser from '@/hooks/useGetUser'

import { Button }   from '@/components/ui/button'
import { Badge }    from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getRuleById,
  deleteRule,
} from '@/app/dashboard/client/risk-rule-engine/rule-configuration/actions'
import BackTestRunner from '@/views/risk-rule-engine/back-test/BackTestRunner'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LIST_PATH = '/dashboard/client/risk-rule-engine/rule-configuration'

const RISK_VARIANT = {
  Critical: 'destructive',
  High:     'destructive',
  Medium:   'secondary',
  Low:      'outline',
  Info:     'outline',
}

const STATUS_VARIANT = {
  active:   'default',
  draft:    'secondary',
  paused:   'secondary',
  archived: 'outline',
}

const OPERATOR_LABEL = {
  eq:         '=',
  ne:         '≠',
  gt:         '>',
  gte:        '≥',
  lt:         '<',
  lte:        '≤',
  in:         'in',
  nin:        'not in',
  between:    'between',
  contains:   'contains',
  startsWith: 'starts with',
  endsWith:   'ends with',
  exists:     'exists',
  regex:      'matches',
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (val) => {
  if (!val) return '—'
  const d = new Date(val)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

const populatedName = (ref) => {
  if (!ref) return null
  return typeof ref === 'object' ? ref.name || ref.email || String(ref._id) : String(ref)
}

const conditionValueLabel = (c) => {
  if (c.operator === 'between') return `${c.min} — ${c.max}`
  if (c.operator === 'exists')  return ''
  if (Array.isArray(c.values))  return c.values.join(', ')
  return c.value !== undefined ? String(c.value) : '—'
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const Field = ({ label, children, className = '' }) => (
  <div className={className}>
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
      {label}
    </p>
    <div className="text-sm">{children ?? <span className="text-muted-foreground">—</span>}</div>
  </div>
)

const RiskBar = ({ score }) => {
  const pct   = Math.max(0, Math.min(100, score ?? 0))
  const color =
    pct >= 95 ? 'bg-red-600' :
    pct >= 75 ? 'bg-orange-500' :
    pct >= 50 ? 'bg-yellow-500' :
    pct >= 25 ? 'bg-blue-400'  : 'bg-green-500'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 rounded-full bg-muted">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-7 text-right">{pct}</span>
    </div>
  )
}

const ConditionsTable = ({ conditions }) => {
  if (!conditions?.length) return null
  return (
    <div className="rounded-md border overflow-hidden text-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Field</th>
            <th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Operator</th>
            <th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Value</th>
          </tr>
        </thead>
        <tbody>
          {conditions.map((c, i) => (
            <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
              <td className="px-3 py-2 font-mono text-xs">{c.field}</td>
              <td className="px-3 py-2">
                <Badge variant="outline" className="font-mono text-[11px]">
                  {OPERATOR_LABEL[c.operator] ?? c.operator}
                </Badge>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {conditionValueLabel(c)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function RuleDetail({ id }) {
  const router = useRouter()
  const { loggedInUser } = useGetUser()
  const isDooit = loggedInUser?.userType === 'dooit'

  const [rule,          setRule]          = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getRuleById(id).then((res) => {
      if (cancelled) return
      if (res?.success) setRule(res.data)
      else toast.error(res?.message || 'Failed to load rule')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id])

  const handleDelete = async () => {
    const res = await deleteRule(id)
    if (res?.success) {
      toast.success('Rule deleted')
      router.push(LIST_PATH)
    } else {
      toast.error(res?.message || 'Delete failed')
      setConfirmDelete(false)
    }
  }

  // ── Permission ─────────────────────────────────────────────────────────────
  // System rule (client === null): only dooit may write
  // Client rule (client !== null): only the owning client may write
  // Since canView already passed (API returned the rule), a non-dooit user
  // who loaded a client rule must own it.
  const isSystemRule = rule ? !rule.client : null
  const canWrite = rule
    ? (isDooit ? isSystemRule : !isSystemRule)
    : false

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Loading rule…
      </div>
    )
  }

  if (!rule) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Rule not found.
      </div>
    )
  }

  const hasAggregation =
    rule.aggregation?.window?.value ||
    rule.aggregation?.count ||
    rule.aggregation?.sumThreshold != null

  const hasActions = Array.isArray(rule.actions) && rule.actions.length > 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <Button variant="outline" size="sm" className="w-fit"
          onClick={() => router.push(LIST_PATH)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold truncate">{rule.ruleName}</h1>
            <Badge variant={isSystemRule ? 'secondary' : 'default'} className="shrink-0">
              {isSystemRule ? 'System Rule' : 'Client Rule'}
            </Badge>
            <Badge variant={STATUS_VARIANT[rule.status] || 'secondary'} className="capitalize shrink-0">
              {rule.status}
            </Badge>
            {isDooit && isSystemRule && (
              <Badge variant={rule.visibleToClients ? 'default' : 'outline'} className="shrink-0 gap-1">
                {rule.visibleToClients
                  ? <><Eye className="w-3 h-3" /> Visible to clients</>
                  : <><ShieldOff className="w-3 h-3" /> Hidden from clients</>
                }
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{rule.ruleId}</span>
            {rule.descriptiveExplanation ? ` — ${rule.descriptiveExplanation}` : ''}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          {/* Back Test is read-only — available to anyone who can view the rule */}
          <Button size="sm" variant="outline"
            onClick={() => router.push(`/dashboard/client/risk-rule-engine/back-test?rule=${id}`)}>
            <FlaskConical className="w-4 h-4 mr-1" /> Back Test
          </Button>

          {/* Write actions — only shown when user owns this rule type */}
          {canWrite && (
            <>
              <Button size="sm" variant="outline"
                onClick={() => router.push(`${LIST_PATH}/${id}/edit`)}>
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="destructive"
                onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left column ───────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Classification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4" /> Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Case Type">{rule.caseType}</Field>
              <Field label="Risk Label">
                <div className="space-y-1">
                  <Badge variant={RISK_VARIANT[rule.riskLabel] || 'outline'}>
                    {rule.riskLabel}
                  </Badge>
                  <RiskBar score={rule.riskScore} />
                </div>
              </Field>
              <Field label="Applies To">
                <span className="capitalize">{rule.appliesTo}</span>
              </Field>
              {rule.mainDomain && (
                <Field label="Main Domain">{rule.mainDomain}</Field>
              )}
              {rule.ruleDomainSubdomain && (
                <Field label="Sub Domain">{rule.ruleDomainSubdomain}</Field>
              )}
              {rule.category && (
                <Field label="Category">{rule.category}</Field>
              )}
            </CardContent>
          </Card>

          {/* Lifecycle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" /> Lifecycle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Version">
                <Badge variant="outline">v{rule.version}</Badge>
              </Field>
              <Field label="Effective From">{fmtDate(rule.effectiveFrom)}</Field>
              <Field label="Effective To">{fmtDate(rule.effectiveTo)}</Field>
            </CardContent>
          </Card>

          {/* Aggregation (velocity rules) */}
          {hasAggregation && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Aggregation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rule.aggregation.window?.value && (
                  <Field label="Window">
                    {rule.aggregation.window.value}{' '}
                    {rule.aggregation.window.unit}
                    {rule.aggregation.window.value !== 1 ? 's' : ''}
                  </Field>
                )}
                {rule.aggregation.count && (
                  <Field label="Min Event Count">≥ {rule.aggregation.count}</Field>
                )}
                {rule.aggregation.sumThreshold != null && (
                  <Field label="Sum Threshold">
                    ≥ {rule.aggregation.sumThreshold.toLocaleString()}
                  </Field>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        {/* ── Centre + right columns (logic spans 2 cols on large screens) ──── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Logic / Conditions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4" /> Condition Logic
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* DSL string — always shown */}
              <Field label="Rule Condition (DSL)">
                <pre className="mt-1 text-xs bg-muted p-3 rounded-md whitespace-pre-wrap leading-relaxed font-mono">
                  {rule.ruleCondition}
                </pre>
              </Field>

              {/* Structured conditions table */}
              {Array.isArray(rule.conditions) && rule.conditions.length > 0 && (
                <>
                  <Separator />
                  <Field label="Structured Conditions">
                    <div className="mt-1">
                      <ConditionsTable conditions={rule.conditions} />
                    </div>
                  </Field>
                </>
              )}

              {/* Logic tree */}
              {rule.logic && (
                <>
                  <Separator />
                  <Field label="Logic Tree">
                    <pre className="mt-1 text-xs bg-muted p-3 rounded-md overflow-x-auto font-mono">
                      {JSON.stringify(rule.logic, null, 2)}
                    </pre>
                  </Field>
                </>
              )}

            </CardContent>
          </Card>

          {/* Actions */}
          {hasActions && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Actions on Fire</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rule.actions.map((a, i) => (
                    <div key={i}
                      className="flex items-start gap-3 p-2.5 rounded-md border bg-muted/30">
                      <Badge variant="secondary" className="capitalize shrink-0 mt-0.5">
                        {a.type?.replace(/_/g, ' ')}
                      </Badge>
                      {a.params && Object.keys(a.params).length > 0 && (
                        <pre className="text-xs text-muted-foreground font-mono overflow-x-auto flex-1">
                          {JSON.stringify(a.params, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Telemetry + Audit */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" /> Telemetry & Audit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <Field label="Total Hits">{rule.hitCount ?? 0}</Field>
                <Field label="Last Fired">{fmtDate(rule.lastFiredAt)}</Field>
                <Field label="Created">{fmtDate(rule.createdAt)}</Field>
                <Field label="Updated">{fmtDate(rule.updatedAt)}</Field>
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Created By">{populatedName(rule.createdBy)}</Field>
                <Field label="Updated By">{populatedName(rule.updatedBy)}</Field>
                <Field label="Client">{populatedName(rule.client) ?? 'System (dooit)'}</Field>
                <Field label="Branch">{populatedName(rule.branch)}</Field>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── Back Test — replay this rule against history, in place ──────────── */}
      <div className="space-y-2 pt-2">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FlaskConical className="w-4 h-4" /> Back Test
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Replay this rule against historical transactions — read-only, no
            alerts are created.
          </p>
        </div>
        <BackTestRunner rule={rule} />
      </div>

      {/* ── Delete confirmation ──────────────────────────────────────────────── */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              {rule.ruleId} — {rule.ruleName}
              <br />
              This cannot be undone. Historical alerts referencing this rule
              will lose their backing definition.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
