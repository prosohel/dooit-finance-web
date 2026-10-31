'use client'
import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, Search, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageDescription, PageHeader, PageTitle } from '@/components/common'
import {
  getAllRules,
  getRuleById,
} from '@/app/dashboard/client/risk-rule-engine/rule-configuration/actions'
import BackTestRunner from './BackTestRunner'

const RISK_VARIANT = {
  Critical: 'destructive',
  High:     'destructive',
  Medium:   'secondary',
  Low:      'outline',
  Info:     'outline',
}

// Searchable rule picker — queries the rule-engine list API as the user types.
const RulePicker = ({ rule, onSelect }) => {
  const [open,      setOpen]      = useState(false)
  const [query,     setQuery]     = useState('')
  const [options,   setOptions]   = useState([])
  const [searching, setSearching] = useState(false)
  const wrapRef    = useRef(null)
  const timerRef   = useRef(null)
  const requestSeq = useRef(0)

  // Debounced search whenever the dropdown is open
  useEffect(() => {
    if (!open) return
    clearTimeout(timerRef.current)
    const requestId = ++requestSeq.current
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const qs = `search=${encodeURIComponent(query)}&limit=50&sort=ruleId&order=asc`
      const res = await getAllRules(qs)
      // A newer keystroke superseded this request — drop the stale response
      if (requestId !== requestSeq.current) return
      setSearching(false)
      setOptions(res?.success && Array.isArray(res.data) ? res.data : [])
    }, 300)
    return () => clearTimeout(timerRef.current)
  }, [open, query])

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={wrapRef} className="relative w-full sm:w-[380px]">
      {rule ? (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="font-mono text-xs shrink-0">{rule.ruleId}</span>
          <span className="truncate flex-1">{rule.ruleName}</span>
          <Badge variant={rule.client ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
            {rule.client ? 'Client' : 'System'}
          </Badge>
          <button
            className="text-muted-foreground hover:text-foreground shrink-0"
            title="Change rule"
            onClick={() => { onSelect(null); setOpen(true) }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search rule by ID, name, condition…"
              className="pl-8 pr-8"
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>

          {open && (
            <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
              {searching && (
                <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
              )}
              {!searching && options.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No rules found.</p>
              )}
              {!searching && options.map((r) => {
                // evaluable === false → prose-only rule the engine can't execute
                const dead = r.evaluable === false
                return (
                  <button
                    key={r._id}
                    disabled={dead}
                    title={dead ? 'No structured logic — this rule cannot be backtested' : undefined}
                    className={`w-full text-left px-3 py-2 border-b last:border-b-0 ${
                      dead ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/60'
                    }`}
                    onClick={() => { onSelect(r); setOpen(false); setQuery('') }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs shrink-0">{r.ruleId}</span>
                      <span className="text-sm truncate flex-1">{r.ruleName}</span>
                      {dead && (
                        <Badge variant="outline" className="text-[10px] shrink-0 border-amber-500/60 text-amber-600 dark:text-amber-400">
                          No logic
                        </Badge>
                      )}
                      <Badge variant={RISK_VARIANT[r.riskLabel] || 'outline'} className="text-[10px] shrink-0">
                        {r.riskLabel}
                      </Badge>
                      <Badge variant={r.client ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {r.client ? 'Client' : 'System'}
                      </Badge>
                    </div>
                    {r.ruleCondition && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{r.ruleCondition}</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function RuleBackTest({ initialRuleId }) {
  const [rule, setRule] = useState(null)

  // Preselect from ?rule=<id> (e.g. the Back Test button on a rule's detail page)
  useEffect(() => {
    if (!initialRuleId) return
    getRuleById(initialRuleId).then((res) => {
      if (res?.success) setRule(res.data)
      else toast.error(res?.message || 'Could not load the linked rule — pick one below')
    })
  }, [initialRuleId])

  return (
    <div>
      <PageHeader>
        <PageTitle>Rule Back Test</PageTitle>
        <PageDescription>
          Replay a rule against historical transactions to see what it would have
          flagged — read-only, no alerts are created
        </PageDescription>
      </PageHeader>

      <BackTestRunner
        rule={rule}
        leading={<RulePicker rule={rule} onSelect={setRule} />}
      />
    </div>
  )
}
