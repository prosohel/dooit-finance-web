'use client'

import SectionLabel from '../SectionLabel'
import AddButton from '../AddButton'
import { REMOVE_X } from '../fieldStyles'

/**
 * Outcomes — what can come of this step, in words.
 *
 * Both halves are FREE TEXT, deliberately. `then` is prose ("Continue to
 * consent collection"), not a node reference: the seeded template documents
 * each step's possible results this way, and the executable truth about where
 * the flow actually goes lives in the graph's edges, not here. Rendering this
 * as a node picker silently rewrote that prose into an id the moment anyone
 * touched it.
 *
 * The left stripe cycles green → amber → pink, so the happy path, the held
 * path and the refused path are distinguishable at a glance. Colour is never
 * alone: the condition text always says which is which.
 */
const STRIPE = ['var(--success)', 'var(--warning)', 'var(--danger)']

export default function Outcomes({ node, onPatch }) {
  const outcomes = node.config?.outcomes || []

  const write = (next) => onPatch({ config: { ...node.config, outcomes: next } })

  const addOutcome = () => write([...outcomes, { cond: '', then: '' }])

  const updateOutcome = (index, key, val) =>
    write(outcomes.map((o, i) => (i === index ? { ...o, [key]: val } : o)))

  const removeOutcome = (index) => write(outcomes.filter((_, i) => i !== index))

  // Seamless until hover/focus, then a box — so a column of outcomes reads as
  // a list of statements rather than a stack of form fields.
  const seam =
    'w-full rounded-[5px] border border-transparent bg-transparent px-1 py-0.5 hover:border-[var(--wf-card-border)] focus:border-[var(--primary)] focus:bg-card focus:outline-none'

  return (
    <>
      <SectionLabel action={<AddButton onClick={addOutcome}>Add outcome</AddButton>}>
        Outcomes
      </SectionLabel>

      <div className="flex flex-col gap-1.5">
        {outcomes.map((outcome, i) => (
          <div
            key={i}
            className="rounded-r-[7px] bg-[var(--sidebar-bg)] px-2.5 py-2"
            style={{ borderLeft: `3px solid ${STRIPE[Math.min(i, 2)]}` }}
          >
            <div className="grid grid-cols-[1fr_18px] items-center gap-1">
              <input
                value={outcome.cond || ''}
                onChange={(e) => updateOutcome(i, 'cond', e.target.value)}
                placeholder="If this happens"
                aria-label={`Outcome ${i + 1} condition`}
                className={`${seam} font-mono text-[11px] text-[var(--heading)]`}
              />
              <button
                type="button"
                onClick={() => removeOutcome(i)}
                aria-label={`Remove outcome ${i + 1}`}
                className={`${REMOVE_X} text-[12px]`}
              >
                &times;
              </button>
            </div>
            <input
              value={outcome.then || ''}
              onChange={(e) => updateOutcome(i, 'then', e.target.value)}
              placeholder="then this follows"
              aria-label={`Outcome ${i + 1} result`}
              className={`${seam} mt-0.5 font-sans text-[12px] text-[var(--smoke-600)]`}
            />
          </div>
        ))}

        {outcomes.length === 0 && (
          <p className="text-[11.5px] text-[var(--txt-mute)]">
            No outcomes recorded for this step.
          </p>
        )}
      </div>
    </>
  )
}
