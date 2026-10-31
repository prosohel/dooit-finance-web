'use client'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Save, ArrowLeft, ArrowRight, Plus, X, RefreshCw,
  FileText, GitBranch, Tag, Clock, Zap, Check, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { FormField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import CreatableSelect from '@/components/ui/CreatableSelect'
import {
  createRule,
  getRuleById,
  getRuleDomains,
  updateRule,
} from '@/app/dashboard/client/risk-rule-engine/rule-configuration/actions'
import { CONDITION_FIELD_OPTIONS } from './fieldCatalog'

// ── Enums (mirror server-side) ─────────────────────────────────────────────
export const CASE_TYPES = ['Fraud', 'AML', 'Compliance', 'TF']
export const RISK_LABELS = ['Low', 'Medium', 'High', 'Critical', 'Info']
export const APPLIES_TO = ['transaction', 'customer', 'account']
export const STATUSES = ['draft', 'active', 'paused', 'archived']
const WINDOW_UNITS = ['minute', 'hour', 'day']
const ACTION_TYPES = ['create_alert', 'assign', 'notify', 'escalate', 'block', 'create_report']
const ACTION_LABELS = {
  create_alert:  'Create Alert',
  assign:        'Assign',
  notify:        'Send Notification',
  escalate:      'Escalate',
  block:         'Block',
  create_report: 'Create Report',
}
const ACTION_DESC = {
  create_alert:  'Opens a new alert case for review',
  assign:        'Assigns the case to a team member',
  notify:        'Sends a notification to configured recipients',
  escalate:      'Escalates to a higher review tier',
  block:         'Blocks the transaction immediately',
  create_report: 'Auto-drafts a TTR/IFTI report for analyst review',
}
const STATUS_DESC = {
  draft:    'Not yet active — safe to edit without affecting live processing',
  active:   'Live and evaluated against every incoming transaction',
  paused:   'Temporarily disabled — can be re-activated at any time',
  archived: 'Retired — kept for audit history, never evaluated',
}

// ── Step configuration ─────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Identity',       icon: FileText,  desc: 'Rule ID and name' },
  { id: 2, label: 'Logic',          icon: GitBranch, desc: 'Condition builder & DSL' },
  { id: 3, label: 'Classification', icon: Tag,       desc: 'Case type, risk, domain' },
  { id: 4, label: 'Lifecycle',      icon: Clock,     desc: 'Status and effective dates' },
  { id: 5, label: 'Actions',        icon: Zap,       desc: 'What fires when triggered' },
]

// ── Risk helpers ───────────────────────────────────────────────────────────
const riskBarColor = (score) => {
  if (score >= 95) return 'bg-red-500'
  if (score >= 75) return 'bg-orange-500'
  if (score >= 50) return 'bg-yellow-500'
  if (score >= 25) return 'bg-blue-400'
  return 'bg-green-500'
}
const riskTextColor = {
  Critical: 'text-red-600',
  High:     'text-orange-500',
  Medium:   'text-yellow-600',
  Low:      'text-blue-500',
  Info:     'text-green-600',
}

// ── Operators ──────────────────────────────────────────────────────────────
const OPERATORS = [
  { value: 'gt',         label: 'Greater Than (>)' },
  { value: 'gte',        label: 'Greater Than or Equal (≥)' },
  { value: 'lt',         label: 'Less Than (<)' },
  { value: 'lte',        label: 'Less Than or Equal (≤)' },
  { value: 'eq',         label: 'Equals (==)' },
  { value: 'ne',         label: 'Not Equals (!=)' },
  { value: 'in',         label: 'In List' },
  { value: 'nin',        label: 'Not In List' },
  { value: 'between',    label: 'Between' },
  { value: 'contains',   label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith',   label: 'Ends With' },
  { value: 'exists',     label: 'Exists' },
  { value: 'regex',      label: 'Matches Pattern' },
]

// ── Condition helpers ──────────────────────────────────────────────────────
const needsValueList = (op) => ['in', 'nin'].includes(op)
const needsRange     = (op) => op === 'between'
const needsNoValue   = (op) => op === 'exists'

const emptyCondition = (combinator = 'AND') => ({
  field: '', operator: 'gt', value: '', valueMin: '', valueMax: '', valueList: '', combinator,
})

const conditionToExpr = (c) => {
  switch (c.operator) {
    case 'gt':         return `${c.field} > ${c.value}`
    case 'gte':        return `${c.field} >= ${c.value}`
    case 'lt':         return `${c.field} < ${c.value}`
    case 'lte':        return `${c.field} <= ${c.value}`
    case 'eq':         return `${c.field} == ${c.value}`
    case 'ne':         return `${c.field} != ${c.value}`
    case 'in':         return `${c.field} IN [${c.valueList}]`
    case 'nin':        return `${c.field} NOT IN [${c.valueList}]`
    case 'between':    return `${c.field} BETWEEN ${c.valueMin} AND ${c.valueMax}`
    case 'contains':   return `${c.field} CONTAINS "${c.value}"`
    case 'startsWith': return `${c.field} STARTS WITH "${c.value}"`
    case 'endsWith':   return `${c.field} ENDS WITH "${c.value}"`
    case 'exists':     return `${c.field} EXISTS`
    case 'regex':      return `${c.field} MATCHES /${c.value}/`
    default:           return `${c.field} ${c.operator} ${c.value}`
  }
}

const buildDSL = (conditions) =>
  conditions
    .filter((c) => c.field && c.operator)
    .reduce((acc, c, i) => {
      const expr = conditionToExpr(c)
      return i === 0 ? expr : `${acc} ${c.combinator || 'AND'} ${expr}`
    }, '')

// Text inputs give us strings, but the evaluator compares against real
// numbers/booleans on the transaction — emit typed values so "true" matches
// isPep:true and "50,000" matches 50000. Mirrors the API's DSL coerceValue.
const coerceLeafValue = (raw) => {
  const t = String(raw).trim()
  if (t === '') return t
  const stripped = t.replace(/,(?=\d{3}(\D|$))/g, '') // "50,000" → "50000"
  if (/^-?\d+(\.\d+)?$/.test(stripped)) return Number(stripped)
  if (t.toLowerCase() === 'true') return true
  if (t.toLowerCase() === 'false') return false
  return t
}

// Text-matching operators keep the raw string ("true" as a substring is not
// a boolean) — only comparison operators get typed values.
const TEXT_OPERATORS = ['contains', 'startsWith', 'endsWith', 'regex']

const conditionToLeaf = (c) => {
  const leaf = { field: c.field, operator: c.operator }
  if (needsValueList(c.operator)) {
    leaf.values = c.valueList
      .split(',')
      .map((v) => coerceLeafValue(v.trim()))
      .filter((v) => v !== '')
  } else if (needsRange(c.operator)) {
    leaf.min = coerceLeafValue(c.valueMin)
    leaf.max = coerceLeafValue(c.valueMax)
  } else if (!needsNoValue(c.operator)) {
    leaf.value = TEXT_OPERATORS.includes(c.operator) ? c.value : coerceLeafValue(c.value)
  }
  return leaf
}

const buildConditions = (conditions) =>
  conditions.filter((c) => c.field && c.operator).map(conditionToLeaf)

const buildLogicTree = (conditions) => {
  const valid = conditions.filter((c) => c.field && c.operator)
  if (!valid.length) return null
  const leafs = valid.map(conditionToLeaf)
  if (leafs.length === 1) return leafs[0]

  const orGroups = []
  let chunk = [leafs[0]]
  for (let i = 1; i < valid.length; i++) {
    if ((valid[i].combinator || 'AND') === 'OR') {
      orGroups.push(chunk)
      chunk = [leafs[i]]
    } else {
      chunk.push(leafs[i])
    }
  }
  orGroups.push(chunk)

  const orChildren = orGroups.map((g) =>
    g.length === 1 ? g[0] : { logic: 'AND', children: g }
  )
  return orChildren.length === 1 ? orChildren[0] : { logic: 'OR', children: orChildren }
}

const hydrateConditions = (apiConditions) => {
  if (!Array.isArray(apiConditions) || !apiConditions.length) return [emptyCondition()]
  return apiConditions.map((c) => ({
    field:      c.field    || '',
    operator:   c.operator || 'gt',
    value:      c.value    !== undefined ? String(c.value) : '',
    valueMin:   c.min      !== undefined ? String(c.min)   : '',
    valueMax:   c.max      !== undefined ? String(c.max)   : '',
    valueList:  Array.isArray(c.values) ? c.values.join(', ') : '',
    combinator: 'AND', // conditions[] is an implicit AND list
  }))
}

// depth: leaf = 1, AND/OR node = 1 + deepest child. Depth > 2 means nested
// groups (e.g. A AND (B OR C)) that the linear builder cannot represent.
const treeDepth = (node) => {
  if (!node || typeof node !== 'object') return 0
  if (node.field) return 1
  const children = Array.isArray(node.children) ? node.children : []
  return 1 + Math.max(0, ...children.map(treeDepth))
}

const hydrateFromLogicTree = (tree) => {
  if (!tree) return [emptyCondition()]
  const flatten = (node, combinator) => {
    if (!node) return []
    if (node.field) {
      return [{
        field:      node.field    || '',
        operator:   node.operator || 'gt',
        value:      node.value    !== undefined ? String(node.value) : '',
        valueMin:   node.min      !== undefined ? String(node.min)   : '',
        valueMax:   node.max      !== undefined ? String(node.max)   : '',
        valueList:  Array.isArray(node.values) ? node.values.join(', ') : '',
        combinator,
      }]
    }
    return (node.children || []).flatMap((child, i) =>
      flatten(child, i === 0 ? combinator : node.logic)
    )
  }
  const rows = flatten(tree, 'AND')
  if (!rows.length) return [emptyCondition()]
  rows[0].combinator = 'AND'
  return rows
}

// Render as LOCAL time for <input type="datetime-local"> — the browser parses
// the value back as local time on save, so rendering UTC via toISOString()
// here would shift the stored date by the timezone offset on every edit.
const toDateInput = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Form state keeps aggregation as a real nested object — react-hook-form
// resolves dotted field names ("aggregation.window.value") as nested paths,
// so flat dotted keys would never round-trip through reset/submit.
const hydrateAggregation = (agg) => ({
  window: {
    value: agg?.window?.value ?? '',
    unit:  agg?.window?.unit  ?? 'hour',
  },
  count:        agg?.count        ?? '',
  sumThreshold: agg?.sumThreshold ?? '',
})

const buildAggregationPayload = (agg) => {
  const wv    = agg?.window?.value
  const wu    = agg?.window?.unit
  const count = agg?.count
  const sum   = agg?.sumThreshold
  if (!wv && !count && !sum) return undefined
  return {
    ...(wv    ? { window: { value: Number(wv), unit: wu || 'hour' } } : {}),
    ...(count ? { count: Number(count) } : {}),
    ...(sum !== '' && sum !== undefined ? { sumThreshold: Number(sum) } : {}),
  }
}

const toOptions = (values) => values.map((v) => ({ label: v, value: v }))

// ── Zod schema ─────────────────────────────────────────────────────────────
// Blank ('') must be tried BEFORE number coercion — z.coerce.number() turns
// '' into 0, which would silently make an untouched threshold input a real 0.
const blankOrNumber = (min) => z.literal('').or(z.coerce.number().min(min)).optional()

const schema = z.object({
  ruleId:                 z.string().trim().min(1, 'Rule ID is required'),
  ruleName:               z.string().trim().min(1, 'Name is required'),
  ruleCondition:          z.string().trim().min(1, 'Condition is required'),
  descriptiveExplanation: z.string().trim().optional().or(z.literal('')),
  ruleDomainSubdomain:    z.string().trim().optional().or(z.literal('')),
  mainDomain:             z.string().trim().optional().or(z.literal('')),
  category:               z.string().trim().optional().or(z.literal('')),
  caseType:               z.enum(CASE_TYPES, { message: 'Case Type is required' }),
  riskScore:              z.coerce.number().min(0, 'Min 0').max(100, 'Max 100'),
  riskLabel:              z.enum(RISK_LABELS, { message: 'Risk Label is required' }),
  appliesTo:              z.enum(APPLIES_TO).optional(),
  status:                 z.enum(STATUSES).optional(),
  effectiveFrom:          z.string().optional().or(z.literal('')),
  effectiveTo:            z.string().optional().or(z.literal('')),
  aggregation: z.object({
    window: z.object({
      value: blankOrNumber(1),
      unit:  z.enum(['minute', 'hour', 'day']).optional(),
    }),
    count:        blankOrNumber(1),
    sumThreshold: blankOrNumber(0),
  }),
})

const EMPTY = {
  ruleId: '', ruleName: '', ruleCondition: '', descriptiveExplanation: '',
  ruleDomainSubdomain: '', mainDomain: '', category: '',
  caseType: '', riskScore: 0, riskLabel: '',
  appliesTo: 'transaction', status: 'active',
  effectiveFrom: '', effectiveTo: '',
  aggregation: hydrateAggregation(null),
}

// ── Step sidebar item ──────────────────────────────────────────────────────
function StepItem({ step, currentStep, onClick }) {
  const Icon    = step.icon
  const isActive = currentStep === step.id
  const isDone   = currentStep > step.id

  return (
    <button
      type="button"
      onClick={() => onClick(step.id)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : isDone
          ? 'hover:bg-muted/60 text-foreground'
          : 'hover:bg-muted/40 text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors',
          isActive
            ? 'bg-white/20 text-white'
            : isDone
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
      </span>

      <span className="flex-1 min-w-0">
        <span className="text-sm font-semibold block leading-tight">{step.label}</span>
        <span
          className={cn(
            'text-[11px] block truncate mt-0.5',
            isActive ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          {step.desc}
        </span>
      </span>
    </button>
  )
}

// ── Section label ──────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </p>
  )
}

// ── Step 1: Identity ───────────────────────────────────────────────────────
function IdentityStep({ form }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Rule identifier</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <FormField form={form} name="ruleId" label="Rule ID" required
              placeholder="e.g. FRAUD_001" />
            <p className="text-[11px] text-muted-foreground px-0.5">
              Unique per tenant — cannot be changed once rules are active
            </p>
          </div>
          <div className="space-y-1">
            <FormField form={form} name="ruleName" label="Rule Name" required
              placeholder="e.g. High-Value Transaction Alert" />
            <p className="text-[11px] text-muted-foreground px-0.5">
              Human-readable name shown in the dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Step 2: Logic ──────────────────────────────────────────────────────────
function LogicStep({ form, conditions, setConditions, storedLogicIsNested }) {
  const dslPreview = buildDSL(conditions)
  const dslValue   = form.watch('ruleCondition')
  const dslOutOfSync = !!dslPreview && !!dslValue?.trim() && dslValue.trim() !== dslPreview

  const addCondition    = () => setConditions((p) => [...p, emptyCondition()])
  const removeCondition = (i) => setConditions((p) => p.filter((_, idx) => idx !== i))
  const updateCondition = (i, key, value) =>
    setConditions((p) => p.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)))

  const syncDSL = () => {
    const dsl = buildDSL(conditions)
    if (dsl) form.setValue('ruleCondition', dsl, { shouldValidate: true })
  }

  return (
    <div className="space-y-6">

      {storedLogicIsNested && (
        <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-sm">
          This rule stores nested logic groups (e.g. A AND (B OR C)) that this
          linear builder cannot fully represent. Your saved logic stays
          untouched unless you edit the conditions below — editing rebuilds it
          as AND-groups joined by OR.
        </div>
      )}

      {/* Visual builder */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Visual condition builder</SectionLabel>
          {dslPreview && (
            <Button type="button" variant="ghost" size="sm"
              className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground -mt-1"
              onClick={syncDSL}>
              <RefreshCw className="w-3 h-3" /> Sync to DSL
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {conditions.map((cond, i) => (
            <React.Fragment key={i}>

              {/* Combinator pill */}
              {i > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex-1 border-t border-dashed border-muted-foreground/25" />
                  <button
                    type="button"
                    onClick={() => updateCondition(i, 'combinator', cond.combinator === 'AND' ? 'OR' : 'AND')}
                    className={cn(
                      'text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer select-none',
                      cond.combinator === 'OR'
                        ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
                        : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
                    )}
                  >
                    {cond.combinator || 'AND'}
                  </button>
                  <div className="flex-1 border-t border-dashed border-muted-foreground/25" />
                </div>
              )}

              {/* Condition row */}
              <div className="flex items-start gap-2 p-3 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Known evaluator fields, creatable for raw schema paths */}
                  <CreatableSelect
                    options={CONDITION_FIELD_OPTIONS}
                    value={cond.field}
                    onChange={(v) => updateCondition(i, 'field', v)}
                    placeholder="Field (e.g. amount)"
                  />
                  <Select value={cond.operator} onValueChange={(v) => updateCondition(i, 'operator', v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value} className="text-xs">
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {needsNoValue(cond.operator) ? (
                    <div className="h-8 flex items-center px-3 text-xs text-muted-foreground border rounded-md bg-background">
                      (no value needed)
                    </div>
                  ) : needsValueList(cond.operator) ? (
                    <Input
                      placeholder="IR, KP, SY  (comma-separated)"
                      value={cond.valueList}
                      onChange={(e) => updateCondition(i, 'valueList', e.target.value)}
                      className="h-8 text-xs"
                    />
                  ) : needsRange(cond.operator) ? (
                    <div className="flex gap-1.5">
                      <Input placeholder="Min" value={cond.valueMin}
                        onChange={(e) => updateCondition(i, 'valueMin', e.target.value)}
                        className="h-8 text-xs flex-1" />
                      <Input placeholder="Max" value={cond.valueMax}
                        onChange={(e) => updateCondition(i, 'valueMax', e.target.value)}
                        className="h-8 text-xs flex-1" />
                    </div>
                  ) : (
                    <Input
                      placeholder="Value"
                      value={cond.value}
                      onChange={(e) => updateCondition(i, 'value', e.target.value)}
                      className="h-8 text-xs"
                    />
                  )}
                </div>

                <Button type="button" variant="ghost" size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeCondition(i)}
                  disabled={conditions.length === 1}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

            </React.Fragment>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm"
          className="h-7 gap-1 text-xs mt-3"
          onClick={addCondition}>
          <Plus className="w-3 h-3" /> Add Condition
        </Button>

        {/* DSL preview */}
        {dslPreview && (
          <div className="mt-3 p-3 rounded-xl bg-muted/50 border">
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
              Generated DSL — click <strong>Sync to DSL</strong> to push into the field below
            </p>
            <code className="text-xs font-mono break-all leading-relaxed text-foreground">
              {dslPreview}
            </code>
          </div>
        )}
      </div>

      <Separator />

      {/* DSL string + description */}
      <div>
        <SectionLabel>Rule condition string</SectionLabel>
        <div className="space-y-4">
          <FormField
            form={form}
            name="ruleCondition"
            label="Condition (DSL)"
            type="textarea"
            required
            placeholder='e.g. "amount > 50000 AND country IN [IR, KP]"'
          />
          {dslOutOfSync && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 -mt-2 px-0.5">
              The engine executes the visual builder logic above, not this text —
              click <strong>Sync to DSL</strong> to keep them aligned.
            </p>
          )}
          <FormField
            form={form}
            name="descriptiveExplanation"
            label="Description"
            type="textarea"
            placeholder="Plain-language explanation for auditors and reviewers"
          />
        </div>
      </div>

    </div>
  )
}

// ── Step 3: Classification ─────────────────────────────────────────────────
function ClassificationStep({ form, domains, domainsLoading }) {
  const riskScore = form.watch('riskScore')
  const riskLabel = form.watch('riskLabel')

  return (
    <div className="space-y-6">

      {/* Case type + risk */}
      <div>
        <SectionLabel>Risk classification</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField form={form} name="caseType"  label="Case Type"
            type="select" options={toOptions(CASE_TYPES)} required />
          <FormField form={form} name="riskLabel" label="Risk Label"
            type="select" options={toOptions(RISK_LABELS)} required />
          <FormField form={form} name="riskScore" label="Risk Score (0–100)"
            type="number" required />
        </div>

        {/* Live risk bar */}
        {(riskScore > 0 || riskLabel) && (
          <div className="mt-3 p-3 rounded-xl bg-muted/40 border flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className={cn('text-xs font-semibold', riskTextColor[riskLabel] || 'text-foreground')}>
                  {riskLabel || '—'}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground font-mono">
                  {riskScore ?? 0} / 100
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-2 rounded-full transition-all duration-300', riskBarColor(riskScore))}
                  style={{ width: `${Math.max(0, Math.min(100, riskScore ?? 0))}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Domain — existing tenant values as options, creatable for new ones */}
      <div>
        <SectionLabel>Domain</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField form={form} name="mainDomain" label="Main Domain"
            type="creatable" options={domains.mainDomains}
            loading={domainsLoading}
            placeholder="e.g. AML, Fraud Detection" />
          <FormField form={form} name="ruleDomainSubdomain" label="Sub Domain"
            type="creatable" options={domains.subDomains}
            loading={domainsLoading}
            placeholder="e.g. Velocity, Geographic" />
        </div>
      </div>

      <Separator />

      {/* Applies to + category */}
      <div>
        <SectionLabel>Targeting</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField form={form} name="appliesTo" label="Applies To"
            type="select" options={toOptions(APPLIES_TO)} />
          <FormField form={form} name="category" label="Category"
            type="creatable" options={domains.categories}
            loading={domainsLoading}
            placeholder="threshold, velocity, geography, …" />
        </div>
      </div>

    </div>
  )
}

// ── Step 4: Lifecycle ──────────────────────────────────────────────────────
function LifecycleStep({ form }) {
  const currentStatus = form.watch('status')

  return (
    <div className="space-y-6">

      {/* Status */}
      <div>
        <SectionLabel>Status</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => form.setValue('status', s)}
              className={cn(
                'flex flex-col items-start p-3 rounded-xl border text-left transition-all',
                currentStatus === s
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30',
              )}
            >
              <span className="flex items-center gap-2 w-full mb-1">
                <span className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  s === 'active'   ? 'bg-green-500' :
                  s === 'draft'    ? 'bg-yellow-500' :
                  s === 'paused'   ? 'bg-orange-400' : 'bg-muted-foreground',
                )} />
                <span className={cn(
                  'text-xs font-semibold capitalize',
                  currentStatus === s ? 'text-primary' : 'text-foreground',
                )}>
                  {s}
                </span>
                {currentStatus === s && (
                  <Check className="w-3 h-3 ml-auto text-primary shrink-0" />
                )}
              </span>
              <span className="text-[10px] text-muted-foreground leading-snug">
                {STATUS_DESC[s]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Effective dates */}
      <div>
        <SectionLabel>Effective window</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <FormField form={form} name="effectiveFrom" label="Effective From"
              type="datetime-local" />
            <p className="text-[11px] text-muted-foreground px-0.5">
              Leave blank to take effect immediately
            </p>
          </div>
          <div className="space-y-1">
            <FormField form={form} name="effectiveTo" label="Effective To"
              type="datetime-local" />
            <p className="text-[11px] text-muted-foreground px-0.5">
              Leave blank for no expiry
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Aggregation */}
      <div>
        <SectionLabel>Aggregation (velocity rules)</SectionLabel>
        <p className="text-xs text-muted-foreground mb-3">
          Optional. Fill in to evaluate the rule over a rolling time window
          rather than per-transaction.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <FormField form={form} name="aggregation.window.value"
                label="Window Size" type="number" placeholder="e.g. 24" />
            </div>
            <div className="w-28 pt-[22px]">
              <FormField form={form} name="aggregation.window.unit"
                label="" type="select" options={toOptions(WINDOW_UNITS)} />
            </div>
          </div>
          <FormField form={form} name="aggregation.count"
            label="Min Event Count" type="number"
            placeholder="e.g. 5  (≥ 5 events)" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <FormField form={form} name="aggregation.sumThreshold"
            label="Sum Threshold" type="number"
            placeholder="e.g. 50000  (≥ $50k in window)" />
        </div>
      </div>

    </div>
  )
}

// ── Step 5: Actions ────────────────────────────────────────────────────────
function ActionsStep({ actions, addAction, removeAction, updateAction }) {
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Actions on fire</SectionLabel>
        <p className="text-xs text-muted-foreground mb-4">
          These actions execute automatically when the rule matches a transaction.
          Add one or more actions below.
        </p>

        <div className="space-y-2">
          {actions.map((action, i) => {
            const desc = ACTION_DESC[action.type]
            return (
              <div key={i}
                className="flex items-start gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="flex-1 space-y-1">
                  <Select value={action.type} onValueChange={(v) => updateAction(i, v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {ACTION_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {desc && (
                    <p className="text-[11px] text-muted-foreground px-0.5">{desc}</p>
                  )}
                </div>
                <Button type="button" variant="ghost" size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive mt-0.5"
                  onClick={() => removeAction(i)}
                  disabled={actions.length === 1}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )
          })}
        </div>

        <Button type="button" variant="outline" size="sm"
          className="h-7 gap-1 text-xs mt-3"
          onClick={addAction}>
          <Plus className="w-3 h-3" /> Add Action
        </Button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
/**
 * Reusable rule form — create and edit pages.
 * Props: mode ('create'|'edit'), id, onCancel, onSaved
 */
export default function RuleForm({ mode = 'create', id, onCancel, onSaved }) {
  const [step,         setStep]         = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading,    setIsLoading]    = useState(mode === 'edit')
  const [conditions,   setConditions]   = useState([emptyCondition()])
  const [actions,      setActions]      = useState([{ type: 'create_alert', params: {} }])

  // The linear builder can't represent nested logic (A AND (B OR C)) — keep
  // the stored tree and only rebuild when the user actually edits conditions,
  // so opening Edit + Save never silently rewrites a rule's semantics.
  const [originalLogic, setOriginalLogic] = useState(null)
  const [builderDirty,  setBuilderDirty]  = useState(false)

  const editConditions = (updater) => {
    setBuilderDirty(true)
    setConditions(updater)
  }

  // Existing tenant values feeding the creatable domain/category dropdowns
  const [domains,        setDomains]        = useState({ mainDomains: [], subDomains: [], categories: [] })
  const [domainsLoading, setDomainsLoading] = useState(true)

  const form = useForm({ defaultValues: EMPTY, resolver: zodResolver(schema) })

  useEffect(() => {
    getRuleDomains()
      .then((res) => {
        if (res?.success) {
          setDomains({
            mainDomains: res.mainDomains ?? [],
            subDomains:  res.subDomains  ?? [],
            categories:  res.categories  ?? [],
          })
        }
      })
      .finally(() => setDomainsLoading(false))
  }, [])

  // ── Hydrate (edit mode) ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const hydrate = async () => {
      if (mode !== 'edit' || !id) return
      setIsLoading(true)
      try {
        const res = await getRuleById(id)
        if (cancelled) return
        if (res?.success && res.data) {
          // Only lift form-owned keys out of the API document — server-only
          // fields (_id, client, hitCount, …) stay out of the form state.
          const fromServer = {}
          for (const key of Object.keys(EMPTY)) {
            if (res.data[key] !== undefined && res.data[key] !== null) {
              fromServer[key] = res.data[key]
            }
          }
          form.reset({
            ...EMPTY,
            ...fromServer,
            effectiveFrom: toDateInput(res.data.effectiveFrom),
            effectiveTo:   toDateInput(res.data.effectiveTo),
            aggregation:   hydrateAggregation(res.data.aggregation),
          })
          const logicTree = res.data.logic
          setOriginalLogic(logicTree ?? null)
          if (logicTree && (logicTree.logic || logicTree.field)) {
            setConditions(hydrateFromLogicTree(logicTree))
          } else {
            setConditions(hydrateConditions(res.data.conditions))
          }
          if (Array.isArray(res.data.actions) && res.data.actions.length) {
            // Keep params — dropping them here would silently wipe existing
            // action configuration on the next save.
            setActions(res.data.actions.map((a) => ({ type: a.type, params: a.params || {} })))
          }
        } else {
          toast.error(res?.message || 'Failed to load rule')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    hydrate()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id])

  // ── Submit ───────────────────────────────────────────────────────────────
  const onSubmit = async (values) => {
    setIsSubmitting(true)
    try {
      const aggregation          = buildAggregationPayload(values.aggregation)
      const structuredConditions = buildConditions(conditions)
      const logicTree            = buildLogicTree(conditions)

      // Builder untouched on edit → leave stored logic/conditions exactly as
      // they are (protects nested trees the builder can't round-trip).
      const keepStoredLogic = mode === 'edit' && !builderDirty && !!originalLogic

      const payload = {
        ruleId:                 values.ruleId,
        ruleName:               values.ruleName,
        ruleCondition:          values.ruleCondition,
        descriptiveExplanation: values.descriptiveExplanation,
        ruleDomainSubdomain:    values.ruleDomainSubdomain,
        mainDomain:             values.mainDomain,
        category:               values.category,
        caseType:               values.caseType,
        riskScore:              values.riskScore,
        riskLabel:              values.riskLabel,
        appliesTo:              values.appliesTo,
        status:                 values.status,
        effectiveFrom:          values.effectiveFrom ? new Date(values.effectiveFrom) : null,
        effectiveTo:            values.effectiveTo   ? new Date(values.effectiveTo)   : null,
        // Always send these keys — omitting them on edit would leave the
        // previously saved value on the server after the user cleared it.
        aggregation: aggregation ?? null,
        ...(keepStoredLogic
          ? {} // stored logic/conditions stay verbatim
          : { conditions: structuredConditions, logic: logicTree ?? null }),
        actions: actions.filter((a) => a.type).map((a) => ({ type: a.type, params: a.params || {} })),
      }

      const res = mode === 'edit' ? await updateRule(id, payload) : await createRule(payload)
      if (res?.success) {
        toast.success(`Rule ${mode === 'edit' ? 'updated' : 'created'}`)
        onSaved?.(res.data)
      } else {
        toast.error(res?.message || 'Save failed')
      }
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Action handlers ──────────────────────────────────────────────────────
  const addAction    = () => setActions((p) => [...p, { type: 'create_alert', params: {} }])
  const removeAction = (i) => setActions((p) => p.filter((_, idx) => idx !== i))
  const updateAction = (i, type) =>
    setActions((p) => p.map((a, idx) => (idx === i ? { ...a, type } : a)))

  // ── Invalid submit ───────────────────────────────────────────────────────
  // Jump to the step holding the first invalid field — without this, a failed
  // save triggered from another step looks like a dead Save button.
  const FIELD_STEP = {
    ruleId: 1, ruleName: 1,
    ruleCondition: 2, descriptiveExplanation: 2,
    caseType: 3, riskScore: 3, riskLabel: 3,
    mainDomain: 3, ruleDomainSubdomain: 3, category: 3, appliesTo: 3,
    status: 4, effectiveFrom: 4, effectiveTo: 4, aggregation: 4,
  }
  const onInvalid = (errors) => {
    const firstField = Object.keys(errors)[0]
    if (FIELD_STEP[firstField]) setStep(FIELD_STEP[firstField])
    toast.error('Some required fields are missing or invalid')
  }

  // ── Step content ─────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1: return <IdentityStep form={form} />
      case 2: return (
        <LogicStep
          form={form}
          conditions={conditions}
          setConditions={editConditions}
          storedLogicIsNested={treeDepth(originalLogic) > 2}
        />
      )
      case 3: return <ClassificationStep form={form} domains={domains} domainsLoading={domainsLoading} />
      case 4: return <LifecycleStep form={form} />
      case 5: return <ActionsStep actions={actions} addAction={addAction} removeAction={removeAction} updateAction={updateAction} />
      default: return null
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-16 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading rule…</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentStepInfo = STEPS[step - 1]
  const StepIcon = currentStepInfo.icon

  return (
    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
      <div className="flex gap-6">

        {/* ── Sidebar (desktop) ───────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-52 shrink-0 pt-1">
          {/* Form title */}
          <div className="mb-5 px-1">
            <h2 className="font-bold text-base">
              {mode === 'edit' ? 'Edit Rule' : 'New Rule'}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {mode === 'edit'
                ? 'Update the rule configuration'
                : 'Complete all sections and save'}
            </p>
          </div>

          {/* Steps */}
          <nav className="space-y-1 flex-1">
            {STEPS.map((s) => (
              <StepItem key={s.id} step={s} currentStep={step} onClick={setStep} />
            ))}
          </nav>

          {/* Bottom progress */}
          <div className="mt-6 px-1">
            <div className="flex gap-1 mb-1">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    'flex-1 h-1 rounded-full transition-colors',
                    step === s.id ? 'bg-primary' : step > s.id ? 'bg-primary/40' : 'bg-muted',
                  )}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Step {step} of {STEPS.length}
            </p>
          </div>
        </aside>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Mobile progress bar */}
          <div className="lg:hidden flex gap-1">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-colors',
                  step === s.id ? 'bg-primary' : step > s.id ? 'bg-primary/40' : 'bg-muted',
                )}
              />
            ))}
          </div>

          {/* Step header */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="hidden lg:inline">
              {STEPS.slice(0, step - 1).map((s) => (
                <React.Fragment key={s.id}>
                  <button type="button" onClick={() => setStep(s.id)}
                    className="hover:text-foreground transition-colors">
                    {s.label}
                  </button>
                  <ChevronRight className="w-3 h-3 inline mx-0.5" />
                </React.Fragment>
              ))}
            </span>
            <span className="text-foreground font-semibold">{currentStepInfo.label}</span>
          </div>

          {/* Step card */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3 mb-5">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shrink-0">
                  <StepIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base leading-tight">{currentStepInfo.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{currentStepInfo.desc}</p>
                </div>
              </div>

              <Separator className="mb-5" />

              {renderStep()}
            </CardContent>
          </Card>

          {/* Footer navigation */}
          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? onCancel : () => setStep((s) => s - 1)}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>

            <div className="flex items-center gap-2">
              <Button type="submit" variant="outline" disabled={isSubmitting}
                className="gap-1">
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save'}
              </Button>

              {step < STEPS.length && (
                <Button type="button" onClick={() => setStep((s) => s + 1)} className="gap-1">
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {step === STEPS.length && (
                <Button type="submit" disabled={isSubmitting} className="gap-1">
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create rule'}
                </Button>
              )}
            </div>
          </div>

        </div>
      </div>
    </form>
  )
}
