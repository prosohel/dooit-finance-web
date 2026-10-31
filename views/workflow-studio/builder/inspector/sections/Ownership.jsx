'use client'

import SectionLabel from '../SectionLabel'
import { SEAMLESS_INPUT } from '../fieldStyles'

/**
 * Ownership — who answers for this step and how long they have.
 *
 * The design draws this as one bordered card of right-aligned rows, like a
 * summary table rather than a form: the values read as facts about the step
 * until you click one. Both are recorded for the audit trail; neither is
 * enforced by anything in this slice.
 */
export default function Ownership({ node, onPatch }) {
  const config = node.config || {}
  const write = (key, value) => onPatch({ config: { ...config, [key]: value } })

  const rowInput = `flex-1 min-w-0 text-right focus:text-left ${SEAMLESS_INPUT} text-[12.5px] text-[var(--heading)]`

  return (
    <>
      <SectionLabel>Ownership</SectionLabel>

      <div className="rounded-[9px] border border-[var(--wf-card-border)] p-3 text-[12.5px] leading-[1.6]">
        <div className="flex items-center justify-between gap-2.5">
          <span className="shrink-0 text-[var(--mute-200)]">Owner</span>
          <input
            value={config.owner || ''}
            onChange={(e) => write('owner', e.target.value)}
            placeholder="Unassigned"
            aria-label="Owner"
            className={rowInput}
          />
        </div>

        <div className="flex items-center justify-between gap-2.5">
          <span className="shrink-0 text-[var(--mute-200)]">SLA</span>
          <input
            value={config.sla || ''}
            onChange={(e) => write('sla', e.target.value)}
            placeholder="Not set"
            aria-label="SLA"
            className={rowInput}
          />
        </div>

        {/* Not editable: it states how this step is treated, it is not a
            setting someone chooses. */}
        <div className="flex justify-between gap-2.5">
          <span className="text-[var(--mute-200)]">Audit</span>
          <span>Every field logged</span>
        </div>
      </div>
    </>
  )
}
