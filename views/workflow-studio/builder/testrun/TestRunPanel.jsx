'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { XIcon } from 'lucide-react'
import { simulate } from '../../lib/simulate'

/**
 * TestRunPanel renders a client-side workflow simulation.
 * It walks the graph with a simulated applicant, showing the steps and verdict.
 * This is a graph-logic-only simulation: it calls no service, verifies nobody,
 * screens no one, and proves nothing about any real customer.
 */
export default function TestRunPanel({ graph, onClose }) {
  const [subject, setSubject] = useState({
    applicant: {
      type: 'individual',
      country: 'AU',
      assessment: {
        scores: {
          score: 50,
        },
      },
      riskLabels: {
        aml: [],
      },
    },
  })

  // Recompute simulation on every subject change — pure and instant
  const result = useMemo(() => simulate(graph, subject), [graph, subject])

  const handleSubjectChange = (path, value) => {
    const keys = path.split('.')
    setSubject((prev) => {
      const updated = JSON.parse(JSON.stringify(prev))
      let obj = updated
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
      return updated
    })
  }

  // Map verdict to a tone. `result.verdict` is not a closed enum — on an
  // endOfFlow step it's whatever free text the builder typed into
  // card.decision (e.g. "Final reject", "Approved"). The old version only
  // recognised its own fixed strings and fell through to green success for
  // everything else, so a decision literally named "Final reject" rendered
  // green with a check mark. Recognise reject/decline/fail language instead
  // of just a closed list, and default anything unrecognised to a neutral
  // tone rather than assuming success.
  const verdictTone = () => {
    const v = (result.verdict || '').toLowerCase()
    if (/reject|declin|fail/.test(v) || v === 'stopped' || v === 'broken connector' || v === 'no start step') {
      return 'danger'
    }
    if (v === 'loops back') return 'info'
    if (v === 'stopped early') return 'warning'
    if (/approve/.test(v) || v === 'completed' || v === 'end of flow') return 'success'
    return 'neutral'
  }

  // Project CSS variables, not raw Tailwind palette classes — colour is
  // never the only signal, so each tone also carries its own icon.
  const VERDICT_STYLE = {
    danger: { cls: 'text-[var(--danger)] bg-[var(--danger)]/10', icon: '✕' },
    warning: { cls: 'text-[var(--warning)] bg-[var(--warning)]/10', icon: '●' },
    info: { cls: 'text-[var(--info)] bg-[var(--info)]/10', icon: 'ⓘ' },
    success: { cls: 'text-[var(--success)] bg-[var(--success)]/10', icon: '✓' },
    neutral: { cls: 'text-[var(--heading)] bg-[var(--sidebar-bg)]', icon: '●' },
  }

  const { cls: verdictClass, icon: verdictIcon } = VERDICT_STYLE[verdictTone()]

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Test run</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Simulated — graph logic only, no external checks
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Simulated applicant card */}
        <div className="border border-border rounded-lg p-4 bg-muted">
          <h3 className="text-sm font-medium text-foreground mb-3">Simulated applicant</h3>
          <div className="space-y-3">
            {/* Customer type */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Customer type
              </label>
              <Select
                value={subject.applicant.type}
                onValueChange={(val) => handleSubjectChange('applicant.type', val)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="entity">Entity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Country
              </label>
              <Input
                type="text"
                placeholder="e.g., AU"
                value={subject.applicant.country || ''}
                onChange={(e) => handleSubjectChange('applicant.country', e.target.value)}
                className="h-8"
              />
            </div>

            {/* Risk score */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Risk score
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="0-100"
                value={subject.applicant.assessment.scores.score || 0}
                onChange={(e) =>
                  handleSubjectChange('applicant.assessment.scores.score', Number(e.target.value))
                }
                className="h-8"
              />
            </div>

            {/* AML risk labels */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                AML risk labels (comma-separated)
              </label>
              <Input
                type="text"
                placeholder="e.g., pep, sanctions"
                value={
                  Array.isArray(subject.applicant.riskLabels.aml)
                    ? subject.applicant.riskLabels.aml.join(', ')
                    : ''
                }
                onChange={(e) => {
                  const labels = e.target.value
                    .split(',')
                    .map((l) => l.trim())
                    .filter((l) => l)
                  handleSubjectChange('applicant.riskLabels.aml', labels)
                }}
                className="h-8"
              />
            </div>
          </div>
        </div>

        {/* Steps list */}
        {result.steps.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Simulation steps
            </h3>
            <div className="space-y-2">
              {result.steps.map((step) => (
                <div key={step.nodeId} className="border border-border rounded p-3 text-xs">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-lg leading-none">●</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{step.title}</div>
                      {step.typeLabel && (
                        <div className="text-muted-foreground text-[0.7rem]">{step.typeLabel}</div>
                      )}
                    </div>
                    {/* No per-step timing shown here: simulate.js computes `ms`
                        from step order, not a clock — displaying it next to a
                        real step like "Sanctions and PEP screening" would read
                        as evidence something was actually timed. */}
                  </div>
                  {step.answer && (
                    <div className="text-foreground pl-5 mb-1">
                      <span className="font-medium">Branch:</span> {step.answer}
                    </div>
                  )}
                  {step.result && (
                    <div className="bg-foreground text-background rounded p-2 pl-5 font-mono text-[0.65rem] overflow-x-auto whitespace-pre-wrap break-words">
                      {step.result}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verdict block */}
        <div className={`rounded-lg p-3 ${verdictClass}`}>
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none">{verdictIcon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{result.verdict}</div>
              {result.note && <div className="text-xs mt-1 opacity-90">{result.note}</div>}
            </div>
          </div>
        </div>

        {/* Truncated message */}
        {result.truncated && (
          <div className="border-l-4 border-[var(--warning)] bg-[var(--warning)]/10 p-3">
            <p className="text-xs text-[var(--warning)]">
              The run stopped at the step ceiling ({result.steps.length} steps). The workflow may continue beyond this point.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
