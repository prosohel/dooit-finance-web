'use client'

import { stepType, STEP_TYPES, STEP_TYPE_ORDER } from '../../lib/stepTypes'
import { OPERATORS, VARIABLE_NAMESPACES } from '../../lib/variableCatalog'

import SectionLabel from './SectionLabel'
import { BOXED_SELECT } from './fieldStyles'
import Settings from './sections/Settings'
import CardContent from './sections/CardContent'
import Branches from './sections/Branches'
import Outcomes from './sections/Outcomes'
import Ownership from './sections/Ownership'
import FlowControl from './sections/FlowControl'

/**
 * Step Inspector: header + six sections that manage the selected node.
 * - Header: type badge, editable title, remove button, purpose textarea, type select
 * - Sections: Settings, CardContent, Branches (condition only), Outcomes, Ownership, FlowControl
 * - Condition nodes also show operator chips and variable reference below Branches
 */
export default function StepInspector({
  node,
  startNodeId,
  onPatch,
  onRemove,
  onClearEdges,
  onSetStart,
}) {
  if (!node) {
    // The design names this state rather than leaving the panel blank, so an
    // empty inspector reads as "nothing selected yet" instead of "broken".
    return (
      <div className="border-l border-border bg-card p-4">
        <div className="text-[17px] font-semibold tracking-[-0.01em]">Step settings</div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--mute-200)]">
          Select a step on the canvas to configure it.
        </p>
      </div>
    )
  }

  const type = stepType(node.type)
  const isCondition = node.type === 'cond'

  // One continuous padded column that scrolls as a whole — the design draws no
  // rule between the header and the sections, and a nested scroller here would
  // strand the header while the sections moved under it.
  return (
    <div className="h-full overflow-y-auto border-l border-border bg-card p-4">
      <div>
        {/* Identity row: icon, type name in the type's own colour, step number. */}
        <div className="flex items-center gap-2">
          <div
            className="flex size-5 items-center justify-center rounded-[5px] font-mono text-[10px] text-white"
            style={{ backgroundColor: `var(${type.colorVar})` }}
            aria-hidden="true"
          >
            {type.iconLetter}
          </div>
          <div
            className="font-mono text-[10px] uppercase tracking-[0.1em]"
            style={{ color: `var(${type.colorVar})` }}
          >
            {type.label}
          </div>
          {node.num ? (
            <span className="ml-auto font-mono text-[10px] text-[var(--primary-gray)]">
              Step {node.num}
            </span>
          ) : null}
        </div>

        {/* Title reads as a heading until you click it — the design gives it no
            box at rest, which is what keeps this dense panel calm. */}
        <div className="mt-2.5 flex items-start gap-2.5">
          <input
            value={node.title || ''}
            onChange={(e) => onPatch({ title: e.target.value })}
            placeholder="Step title"
            aria-label="Step title"
            className="-ml-1.5 min-w-0 flex-1 rounded-[6px] border border-transparent bg-transparent px-1.5 py-[3px] font-sans text-[17px] font-semibold tracking-[-0.01em] text-[var(--smoke-700)] hover:border-[var(--wf-card-border)] focus:border-[var(--primary)] focus:outline-none"
          />
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-[6px] border border-[var(--wf-card-border)] bg-card px-[9px] py-[5px] font-sans text-[11.5px] font-medium text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--wf-danger-tint)]"
          >
            Remove
          </button>
        </div>

        <textarea
          value={node.purpose || ''}
          onChange={(e) => onPatch({ purpose: e.target.value })}
          placeholder="What this step is for, in one sentence"
          aria-label="Purpose"
          rows={3}
          className="-ml-1.5 mt-1.5 w-full resize-y rounded-[7px] border border-transparent bg-transparent p-1.5 font-sans text-[12.5px] leading-relaxed text-[var(--mute-200)] hover:border-[var(--wf-card-border)] focus:border-[var(--primary)] focus:text-[var(--heading)] focus:outline-none"
        />

        <SectionLabel>Step type</SectionLabel>
        <select
          value={node.type}
          onChange={(e) => onPatch({ type: e.target.value })}
          aria-label="Step type"
          className={BOXED_SELECT}
        >
          {STEP_TYPE_ORDER.map((key) => (
            <option key={key} value={key}>
              {STEP_TYPES[key].label}
            </option>
          ))}
        </select>
      </div>

      {/* Sections. Each owns its own heading now, because the design puts the
          section's "Add …" control flush right on that same heading row — so
          the label and the action have to live together. */}
      <div>
        <Settings node={node} onPatch={onPatch} />

        <CardContent node={node} onPatch={onPatch} />

        {isCondition && (
          <>
            <Branches node={node} onPatch={onPatch} />

            <SectionLabel>Operators</SectionLabel>
            <div className="flex flex-wrap gap-[5px]">
              {OPERATORS.map((op) => (
                <span
                  key={op.value}
                  className="rounded-[5px] border border-[var(--wf-card-border)] bg-card px-[7px] py-[3px] font-mono text-[10.5px] text-[var(--smoke-600)]"
                >
                  {op.label}
                </span>
              ))}
            </div>

            <SectionLabel>Variables</SectionLabel>
            <div className="overflow-hidden rounded-[9px] border border-[var(--wf-card-border)]">
              {VARIABLE_NAMESPACES.map((ns) => (
                <div key={ns.ns} className="border-b border-[var(--wf-rule)] px-[11px] py-[9px] last:border-b-0">
                  <div className="font-mono text-[11px] text-[var(--primary)]">{ns.ns}</div>
                  <div className="mt-[3px] font-mono text-[10px] leading-[1.5] text-[var(--txt-mute)] break-words">
                    {ns.fields}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!isCondition && (
          <Outcomes node={node} onPatch={onPatch} />
        )}

        <FlowControl
          node={node}
          startNodeId={startNodeId}
          onPatch={onPatch}
          onClearEdges={onClearEdges}
          onSetStart={onSetStart}
        />

        <Ownership node={node} onPatch={onPatch} />
      </div>
    </div>
  )
}
