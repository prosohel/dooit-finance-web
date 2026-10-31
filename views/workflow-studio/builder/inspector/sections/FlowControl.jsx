'use client'

import SectionLabel from '../SectionLabel'

/**
 * Flow control — whether this step ends the flow, and whether it starts it.
 *
 * The design draws "End of flow" as a whole tickable card that turns pink when
 * armed, so a terminal step is obvious at a glance in a long inspector rather
 * than being one checkbox among many.
 *
 * The "start step" control below it is NOT in the design canvas. It is here
 * because nothing else in the builder can set `startNodeId`: without it, a
 * workflow whose start was deleted — or one created empty from the gallery —
 * fails validation with no way to recover from the UI.
 */
export default function FlowControl({ node, startNodeId, onPatch, onClearEdges, onSetStart }) {
  const isEnd = !!node.endOfFlow
  const isStart = node.id === startNodeId
  const isNote = node.type === 'note'

  const handleEndOfFlow = (checked) => {
    onPatch({ endOfFlow: checked })
    // A terminal step that still points somewhere is a graph error the author
    // did not ask for, so the edges go with the flag.
    if (checked) onClearEdges(node.id)
  }

  return (
    <>
      <SectionLabel>Flow control</SectionLabel>

      <label
        className="flex cursor-pointer items-start gap-[9px] rounded-[9px] border px-3 py-[11px] transition-colors"
        style={{
          borderColor: isEnd ? 'var(--wf-danger-border)' : 'var(--wf-card-border)',
          background: isEnd ? 'var(--wf-danger-tint)' : 'var(--color-card)',
        }}
      >
        <input
          type="checkbox"
          checked={isEnd}
          onChange={(e) => handleEndOfFlow(e.target.checked)}
          className="m-0 size-3.5 accent-[var(--danger)]"
        />
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-[var(--heading)]">End of flow</div>
          <div className="mt-0.5 text-[11.5px] leading-[1.4] text-[var(--mute-200)]">
            Terminal step. No outgoing connections; existing ones are removed.
          </div>
        </div>
      </label>

      {/* Notes are annotations, not steps — the validator rejects one as the
          start, so it must not be offered here. */}
      {!isNote && (
        <button
          type="button"
          onClick={() => onSetStart(node.id)}
          disabled={isStart}
          className="mt-2 flex w-full items-start gap-[9px] rounded-[9px] border px-3 py-[11px] text-left transition-colors disabled:cursor-default"
          style={{
            borderColor: isStart ? 'var(--primary)' : 'var(--wf-card-border)',
            background: isStart ? 'var(--wf-primary-tint)' : 'var(--color-card)',
          }}
        >
          <span
            className="mt-px flex size-3.5 shrink-0 items-center justify-center rounded-full border text-[9px] leading-none"
            style={{
              borderColor: isStart ? 'var(--primary)' : 'var(--primary-gray)',
              background: isStart ? 'var(--primary)' : 'transparent',
              color: '#fff',
            }}
            aria-hidden="true"
          >
            {isStart ? '✓' : ''}
          </span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-medium text-[var(--heading)]">
              {isStart ? 'This is the start step' : 'Make this the start step'}
            </span>
            <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-[var(--mute-200)]">
              The flow begins here. Only one step can start a workflow.
            </span>
          </span>
        </button>
      )}
    </>
  )
}
