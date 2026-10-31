'use client'
import React, { useState } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createRule } from '@/app/dashboard/client/risk-rule-engine/rule-configuration/actions'

const CASE_TYPES = ['Fraud', 'AML', 'Compliance', 'TF']
const RISK_LABELS = ['Low', 'Medium', 'High', 'Critical', 'Info']
const STATUSES = ['draft', 'active', 'paused', 'archived']
const APPLIES_TO = ['transaction', 'customer']
// How the rule evaluates (appliesTo = against what). The builder only produces
// predicate rules; the others are stamped by the import/repair scripts.
const ENGINES = [
  { value: 'predicate', label: 'Predicate (per record)' },
  { value: 'screening', label: 'Screening (list / PEP / sanctions)' },
  { value: 'manual',    label: 'Manual (analyst typology)' },
]

const OPERATORS = [
  { value: 'gt',         label: 'Greater Than' },
  { value: 'gte',        label: 'Greater Than or Equal' },
  { value: 'lt',         label: 'Less Than' },
  { value: 'lte',        label: 'Less Than or Equal' },
  { value: 'eq',         label: 'Equals' },
  { value: 'ne',         label: 'Not Equals' },
  { value: 'in',         label: 'In List' },
  { value: 'nin',        label: 'Not In List' },
  { value: 'between',    label: 'Between' },
  { value: 'contains',   label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith',   label: 'Ends With' },
  { value: 'exists',     label: 'Exists' },
  { value: 'regex',      label: 'Matches Pattern' },
]

const ACTION_TYPES = [
  { value: 'create_alert', label: 'Create Alert' },
  { value: 'assign',       label: 'Assign' },
  { value: 'notify',       label: 'Send Notification' },
  { value: 'escalate',     label: 'Escalate' },
  { value: 'block',        label: 'Block' },
]

const needsValueList = (op) => ['in', 'nin'].includes(op)
const needsRange     = (op) => op === 'between'
const needsNoValue   = (op) => op === 'exists'

// combinator lives on each row (ignored on the first row)
const emptyCondition = (combinator = 'AND') => ({
  field: '', operator: 'gt', value: '', valueMin: '', valueMax: '', valueList: '', combinator,
})
const emptyAction = () => ({ type: 'create_alert' })

// Single condition → DSL expression string
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

// Build DSL string using per-row combinator
const buildDSL = (conditions) =>
  conditions
    .filter((c) => c.field && c.operator)
    .reduce((acc, c, i) => {
      const expr = conditionToExpr(c)
      return i === 0 ? expr : `${acc} ${c.combinator || 'AND'} ${expr}`
    }, '')

// Single condition → API leaf
const conditionToLeaf = (c) => {
  const leaf = { field: c.field, operator: c.operator }
  if (needsValueList(c.operator)) {
    leaf.values = c.valueList.split(',').map((v) => v.trim()).filter(Boolean)
  } else if (needsRange(c.operator)) {
    leaf.min = c.valueMin
    leaf.max = c.valueMax
  } else if (!needsNoValue(c.operator)) {
    leaf.value = c.value
  }
  return leaf
}

// Flat conditions[] for backward-compat
const buildConditions = (conditions) =>
  conditions.filter((c) => c.field && c.operator).map(conditionToLeaf)

// Proper AND/OR logic tree (AND has precedence over OR)
// e.g. A AND B OR C  →  { OR: [{ AND: [A, B] }, C] }
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

const EMPTY_FORM = {
  ruleId: '',
  ruleName: '',
  mainDomain: '',
  ruleDomainSubdomain: '',
  category: '',
  caseType: 'AML',
  riskLabel: 'Medium',
  riskScore: 50,
  appliesTo: 'transaction',
  engine: 'predicate',
  status: 'active',
  isActive: true,
  effectiveFrom: '',
  effectiveTo: '',
  descriptiveExplanation: '',
}

export default function RuleEditor({ onSaved }) {
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [conditions, setConditions] = useState([emptyCondition()])
  const [actions,    setActions]    = useState([emptyAction()])
  const [submitting, setSubmitting] = useState(false)
  const [errors,     setErrors]     = useState({})

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.ruleId.trim())   e.ruleId   = 'Required'
    if (!form.ruleName.trim()) e.ruleName = 'Required'
    if (!form.caseType)        e.caseType = 'Required'
    if (!form.riskLabel)       e.riskLabel = 'Required'
    if (form.riskScore === '' || form.riskScore === undefined || form.riskScore === null) {
      e.riskScore = 'Required'
    }
    return e
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setConditions([emptyCondition()])
    setActions([emptyAction()])
    setErrors({})
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      toast.error('Please fix the required fields')
      return
    }

    const structuredConditions = buildConditions(conditions)
    const logicTree            = buildLogicTree(conditions)
    const dsl                  = buildDSL(conditions)

    const payload = {
      ...form,
      ruleCondition: dsl || form.ruleName,
      conditions:    structuredConditions.length ? structuredConditions : undefined,
      logic:         logicTree ?? null,
      actions:       actions.filter((a) => a.type).map((a) => ({ type: a.type, params: {} })),
      effectiveFrom: form.effectiveFrom ? new Date(form.effectiveFrom) : null,
      effectiveTo:   form.effectiveTo   ? new Date(form.effectiveTo)   : null,
    }

    setSubmitting(true)
    try {
      const res = await createRule(payload)
      if (res?.success) {
        toast.success(`Rule "${res.data?.ruleName || form.ruleName}" created`)
        resetForm()
        onSaved?.(res.data)
      } else {
        toast.error(res?.message || 'Failed to create rule')
      }
    } catch (err) {
      toast.error(err?.message || 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const addCondition    = () => setConditions((prev) => [...prev, emptyCondition()])
  const removeCondition = (i) => setConditions((prev) => prev.filter((_, idx) => idx !== i))
  const updateCondition = (i, key, value) =>
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)))

  const addAction    = () => setActions((prev) => [...prev, emptyAction()])
  const removeAction = (i) => setActions((prev) => prev.filter((_, idx) => idx !== i))
  const updateAction = (i, value) =>
    setActions((prev) => prev.map((a, idx) => (idx === i ? { ...a, type: value } : a)))

  const dslPreview = buildDSL(conditions)

  return (
    <div className="max-w-3xl space-y-4">
      {/* Identity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">
                Rule ID <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.ruleId}
                onChange={(e) => set('ruleId', e.target.value)}
                placeholder="e.g. AML-HVT-001"
                className={`h-8 text-sm font-mono ${errors.ruleId ? 'border-destructive' : ''}`}
              />
              {errors.ruleId && <p className="text-xs text-destructive">{errors.ruleId}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Rule Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.ruleName}
                onChange={(e) => set('ruleName', e.target.value)}
                placeholder="e.g. High Value Transaction Alert"
                className={`h-8 text-sm ${errors.ruleName ? 'border-destructive' : ''}`}
              />
              {errors.ruleName && <p className="text-xs text-destructive">{errors.ruleName}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Main Domain</Label>
              <Input
                value={form.mainDomain}
                onChange={(e) => set('mainDomain', e.target.value)}
                placeholder="e.g. Transaction Amount"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sub Domain</Label>
              <Input
                value={form.ruleDomainSubdomain}
                onChange={(e) => set('ruleDomainSubdomain', e.target.value)}
                placeholder="e.g. Threshold Rules"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Engine</Label>
              <Select value={form.engine} onValueChange={(v) => set('engine', v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGINES.map((e) => (
                    <SelectItem key={e.value} value={e.value} className="text-xs">{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Input
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="e.g. threshold, velocity, geography"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={form.descriptiveExplanation}
              onChange={(e) => set('descriptiveExplanation', e.target.value)}
              placeholder="Describe what this rule detects and why it matters for compliance…"
              rows={2}
              className="text-sm resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Classification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Classification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">
                Case Type <span className="text-destructive">*</span>
              </Label>
              <Select value={form.caseType} onValueChange={(v) => set('caseType', v)}>
                <SelectTrigger className={`h-8 text-xs ${errors.caseType ? 'border-destructive' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Risk Label <span className="text-destructive">*</span>
              </Label>
              <Select value={form.riskLabel} onValueChange={(v) => set('riskLabel', v)}>
                <SelectTrigger className={`h-8 text-xs ${errors.riskLabel ? 'border-destructive' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LABELS.map((l) => (
                    <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Risk Score (0–100) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.riskScore}
                onChange={(e) => set('riskScore', Number(e.target.value))}
                className={`h-8 text-sm ${errors.riskScore ? 'border-destructive' : ''}`}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Applies To</Label>
              <Select value={form.appliesTo} onValueChange={(v) => set('appliesTo', v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLIES_TO.map((a) => (
                    <SelectItem key={a} value={a} className="text-xs capitalize">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <Switch
                id="re-isActive"
                checked={form.isActive}
                onCheckedChange={(v) => set('isActive', v)}
              />
              <Label htmlFor="re-isActive" className="text-xs cursor-pointer">
                Active
              </Label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="space-y-1">
              <Label className="text-xs">Effective From</Label>
              <input
                type="datetime-local"
                value={form.effectiveFrom}
                onChange={(e) => set('effectiveFrom', e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Effective To</Label>
              <input
                type="datetime-local"
                value={form.effectiveTo}
                onChange={(e) => set('effectiveTo', e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            <span className="text-muted-foreground font-normal mr-1">IF</span>
            Conditions
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              — click AND / OR between rows to change logic
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {conditions.map((cond, i) => (
            <React.Fragment key={i}>
              {/* Per-row combinator pill — click to toggle AND / OR */}
              {i > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                  <button
                    type="button"
                    onClick={() => updateCondition(i, 'combinator', cond.combinator === 'AND' ? 'OR' : 'AND')}
                    title="Click to toggle AND / OR"
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer select-none ${
                      cond.combinator === 'OR'
                        ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
                        : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800'
                    }`}
                  >
                    {cond.combinator || 'AND'}
                  </button>
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                </div>
              )}
              <div className="flex items-start gap-2 p-2.5 rounded-md border bg-muted/20">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Field (e.g. amount, country)"
                    value={cond.field}
                    onChange={(e) => updateCondition(i, 'field', e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Select
                    value={cond.operator}
                    onValueChange={(v) => updateCondition(i, 'operator', v)}
                  >
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
                      placeholder="Comma-separated, e.g. IR, KP, SY"
                      value={cond.valueList}
                      onChange={(e) => updateCondition(i, 'valueList', e.target.value)}
                      className="h-8 text-xs"
                    />
                  ) : needsRange(cond.operator) ? (
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Min"
                        value={cond.valueMin}
                        onChange={(e) => updateCondition(i, 'valueMin', e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                      <Input
                        placeholder="Max"
                        value={cond.valueMax}
                        onChange={(e) => updateCondition(i, 'valueMax', e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeCondition(i)}
                  disabled={conditions.length === 1}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </React.Fragment>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={addCondition}
          >
            <Plus className="w-3 h-3" />
            Add Condition
          </Button>

          {dslPreview && (
            <div className="mt-2 p-2.5 rounded-md bg-muted/50 border">
              <p className="text-xs text-muted-foreground font-medium mb-1">DSL Preview</p>
              <code className="text-xs font-mono break-all leading-relaxed">{dslPreview}</code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            <span className="text-muted-foreground font-normal mr-1">THEN</span>
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {actions.map((action, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select value={action.type} onValueChange={(v) => updateAction(i, v)}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value} className="text-xs">
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeAction(i)}
                disabled={actions.length === 1}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={addAction}
          >
            <Plus className="w-3 h-3" />
            Add Action
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          className="gap-1.5 flex-1"
          disabled={submitting}
          onClick={handleSave}
        >
          <Save className="w-4 h-4" />
          {submitting ? 'Creating…' : 'Create Rule'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={resetForm}>
          Reset
        </Button>
      </div>
    </div>
  )
}
