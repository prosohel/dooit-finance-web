'use client'
import { Handle, Position } from '@xyflow/react'
import { stepType } from '../../lib/stepTypes'
import { operatorLabel } from '../../lib/variableCatalog'

// Tag pill colours, matched pixel-for-pixel to the design prototype's TAG map
// (AML Workflow Builder.dc.html, nodeViews()). Each tone pairs a background/
// text/border triad — never used alone, the tag's own text always carries the
// same meaning, so colour-blind readers and greyscale printouts still work.
const TAG_TONE = {
  warn:  'bg-[#fdf6e3] text-[#8a6400] border-[#f0e0b0]',
  bad:   'bg-[#fdeef5] text-[#a3195e] border-[#f3cfe0]',
  plain: 'bg-[var(--sidebar-bg)] text-[var(--smoke-600)] border-[var(--border)]',
}

/**
 * One card for every step type. The type registry supplies colour, letter and
 * label; nothing here branches on `type` except to choose which optional
 * sections render.
 *
 * Colour is never the only signal: the strip is always accompanied by the
 * icon letter and the type label in text, so the card survives greyscale
 * printing and colour-blind readers.
 *
 * `data.isStart` is computed by WorkflowCanvas from `workflow.startNodeId` —
 * it is NOT a field stored on the node itself. A workflow has exactly one
 * start, named once on the workflow; duplicating that flag onto every node
 * would let a node's copy drift from the truth (e.g. after a duplicate/paste).
 */
export default function StepNode({ data }) {
  const { node, selected, isStart } = data
  const t = stepType(node.type)
  const color = `var(${t.colorVar})`
  const hasBranches = (node.branches || []).length > 0

  const card = node.card || {}
  const hasTags = (card.tags || []).length > 0
  const hasDecision = !!card.decision
  const hasReason = !!card.reason
  const hasChips = (card.chips || []).length > 0

  return (
    <div
      className="w-[240px] overflow-hidden rounded-[10px] border bg-white"
      style={{
        borderColor: selected ? color : 'var(--wf-card-border)',
        boxShadow: selected
          ? `0 0 0 3px color-mix(in srgb, ${color} 13%, transparent), 0 6px 18px rgba(8,7,12,0.10)`
          : '0 1px 3px rgba(8,7,12,0.05)',
      }}
    >
      <div className="h-[3px]" style={{ background: color }} />

      {/* Incoming connections terminate at the card's left edge. The design
          draws no dot there — an edge simply meets the card — so the handle is
          present and functional but invisible. */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-0 !bg-transparent !opacity-0"
      />

      <div className="px-[11px] pt-[9px] pb-[10px]">
        <div className="flex items-center gap-[7px]">
          <div
            className="flex h-4 w-4 items-center justify-center rounded font-mono text-[9px] text-white"
            style={{ background: color }}
            aria-hidden
          >
            {t.iconLetter}
          </div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.08em]" style={{ color }}>
            {t.label}
          </div>
          {isStart && (
            <span className="rounded bg-[var(--accent)] px-[6px] py-[2px] font-mono text-[8.5px] uppercase tracking-[0.1em] text-[var(--smoke-700)]">
              Start
            </span>
          )}
          <div className="ml-auto font-mono text-[9.5px] text-[var(--primary-gray)]">{node.num}</div>
        </div>

        <div className="mt-[6px] text-[13px] font-semibold leading-[1.3] text-[var(--heading)]">
          {node.title}
        </div>

        {card.inset && (
          <div
            className="mt-2 flex h-[30px] items-center rounded-md border bg-[var(--sidebar-bg)] px-[9px] text-[11.5px] text-[var(--heading)]"
            style={{ borderColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
          >
            {card.inset}
          </div>
        )}

        {/* Tags — e.g. risk labels applied by an action step. Tone (warn/bad/
            plain) is always paired with the tag's own text, never colour alone. */}
        {hasTags && (
          <div className="mt-2">
            {card.tagLabel && (
              <div className="text-[10px] text-[var(--txt-mute)]">{card.tagLabel}</div>
            )}
            <div className="mt-[5px] flex flex-wrap gap-[5px]">
              {card.tags.map((tag, i) => (
                <span
                  key={i}
                  className={`rounded-[5px] border px-[7px] py-[3px] text-[10.5px] ${TAG_TONE[tag.tone] || TAG_TONE.plain}`}
                >
                  {tag.text}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Decision + reason — a review step's outcome ("Approved", "Final
            reject") and why, when the analyst recorded one. */}
        {hasDecision && (
          <div className="mt-2">
            <div className="text-[10.5px] font-semibold text-[var(--heading)]">{card.decision}</div>
            {hasReason && (
              <div className="mt-1 rounded-md border bg-[var(--sidebar-bg)] px-[8px] py-[5px] text-[11px] leading-[1.35] text-[var(--heading)]">
                <span className="text-[9.5px] text-[var(--txt-mute)]">Reasons</span>
                <div className="mt-[2px]">{card.reason}</div>
              </div>
            )}
          </div>
        )}

        {/* Chips — free-text detail lines, e.g. "Not configured" on a fresh
            node, or a summary of the step's settings. */}
        {hasChips && (
          <div className="mt-2 flex flex-col gap-1">
            {card.chips.map((chip, i) => (
              <div
                key={i}
                className="rounded-[5px] bg-[var(--sidebar-bg)] px-[7px] py-1 text-[11px] leading-[1.35] text-[var(--smoke-600)]"
              >
                {chip}
              </div>
            ))}
          </div>
        )}
      </div>

      {hasBranches
        ? (node.branches || []).map((b, i) => (
            <div
              key={b.key}
              className="relative border-t border-[var(--wf-rule)] px-[11px] py-[9px]"
              style={{ background: i % 2 ? 'var(--wf-stripe)' : '#ffffff' }}
            >
              <div className="text-[10px] font-semibold text-[var(--mute-200)]">{b.label}</div>
              <div className="mt-1 flex flex-col gap-[3px]">
                {(b.conditions || []).map((c, ci) => (
                  <div key={ci} className="font-mono text-[10.5px] leading-[1.35] text-[var(--heading)]">
                    <span className="text-[var(--txt-mute)]">{ci === 0 ? 'If' : b.logic === 'OR' ? 'Or' : 'And'}</span>{' '}
                    <span className="font-medium">{c.field}</span>{' '}
                    <span className="text-[var(--txt-mute)]">{operatorLabel(c.operator)}</span>{' '}
                    <span className="text-[var(--primary)]">{String(c.values ?? c.value ?? `${c.min}–${c.max}`)}</span>
                  </div>
                ))}
              </div>
              {/* The port sits INLINE beside its label at the branch's
                  bottom-right, exactly as the design draws it — not floating on
                  the card edge. `!static !transform-none` opts the handle out of
                  React Flow's absolute positioning; React Flow reads the real
                  DOM rect either way, so the edge still anchors correctly.
                  This is why React Flow was chosen: the prototype computes each
                  port's pixel offset by hand and re-derives every card's height
                  to do it. */}
              <div className="mt-[6px] flex items-center justify-end gap-[6px] font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--txt-mute)]">
                Next step
                <Handle
                  id={b.key}
                  type="source"
                  position={Position.Right}
                  title="Drag to another step to connect"
                  className="!static !transform-none !h-3 !w-3 !min-h-0 !min-w-0 !rounded-full !border-[1.5px] !border-[var(--wf-port)] !bg-white hover:!border-[var(--primary)] hover:!bg-[var(--accent)]"
                />
              </div>
            </div>
          ))
        : !node.endOfFlow && (
            <div className="flex items-center justify-end gap-[6px] border-t border-[var(--wf-rule)] px-[11px] py-[7px] font-mono text-[9.5px] uppercase tracking-[0.06em] text-[var(--txt-mute)]">
              {/* A condition step with no branches yet still says "Branches",
                  matching the design — it tells the author what this port will
                  become once they add one. */}
              {node.type === 'cond' ? 'Branches' : 'Next step'}
              <Handle
                type="source"
                position={Position.Right}
                title="Drag to another step to connect"
                className="!static !transform-none !h-[13px] !w-[13px] !min-h-0 !min-w-0 !rounded-full !border-[1.5px] !border-[var(--wf-port)] !bg-white hover:!border-[var(--primary)] hover:!bg-[var(--accent)]"
              />
            </div>
          )}

      {node.endOfFlow && (
        <div className="flex items-center justify-end border-t border-[var(--wf-rule)] px-[11px] py-[7px] font-mono text-[9.5px] uppercase tracking-[0.06em] text-[var(--danger)]">
          End of flow
        </div>
      )}
    </div>
  )
}
