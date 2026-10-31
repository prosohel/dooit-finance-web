'use client'
import { useReactFlow, useStore } from '@xyflow/react'

/**
 * The canvas zoom control, drawn as the design canvas draws it: one vertical
 * stack in the bottom-right — plus, the live zoom percentage, minus, and FIT —
 * in a white card with a hairline border and a soft shadow.
 *
 * React Flow ships its own <Controls>, but it is a different object: a
 * horizontal bar with fit/lock/interactive icons and no zoom readout. The
 * design shows the percentage, which is the part that actually helps someone
 * working on a 31-step graph know where they are.
 *
 * There is deliberately no minimap. React Flow offers one and the design does
 * not use it.
 */
export default function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  // Live zoom straight from React Flow's transform, so the readout can never
  // drift from the actual viewport.
  const zoom = useStore((s) => s.transform[2])

  const btn =
    'border-0 bg-card px-[11px] text-[15px] leading-none text-[var(--smoke-600)] hover:bg-[var(--sidebar-bg)] transition-colors'

  return (
    <div className="absolute bottom-[14px] right-[14px] z-10 flex flex-col overflow-hidden rounded-[9px] border border-[var(--wf-card-border)] bg-card shadow-[0_2px_10px_rgba(8,7,12,0.06)]">
      <button type="button" onClick={() => zoomIn()} aria-label="Zoom in" className={`${btn} py-2`}>
        +
      </button>
      <div className="border-y border-[var(--wf-rule)] px-1 py-1 text-center font-mono text-[10.5px] text-[var(--mute-200)]">
        {Math.round((zoom || 1) * 100)}%
      </div>
      <button type="button" onClick={() => zoomOut()} aria-label="Zoom out" className={`${btn} py-2`}>
        −
      </button>
      <button
        type="button"
        onClick={() => fitView({ padding: 0.12 })}
        aria-label="Fit the whole workflow in view"
        className="border-0 border-t border-[var(--wf-rule)] bg-card px-[11px] py-[7px] font-mono text-[10px] tracking-[0.06em] text-[var(--smoke-600)] hover:bg-[var(--sidebar-bg)] transition-colors"
      >
        FIT
      </button>
    </div>
  )
}
