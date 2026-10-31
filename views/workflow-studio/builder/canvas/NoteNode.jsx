'use client'

// A canvas annotation — free-text context for whoever is reading the
// workflow, not a step. It has no handles: nothing connects to or from a
// note, so it never appears as a `from`/`to` in an edge.
//
// Visual spec (design prototype, AML Workflow Builder.dc.html lines 114-118):
// a 3px --primary left border, a light background, a semibold --primary
// title, and a relaxed-line-height body in the app's standard muted text.
export default function NoteNode({ data }) {
  const { node, selected } = data

  return (
    <div
      className="w-[240px] rounded-[10px] border px-[14px] py-[13px]"
      style={{
        // `border` (1px, all sides) comes from the className above; the left
        // edge is widened and always tinted --primary, which is what marks
        // this card as a note rather than a step at a glance.
        borderColor: selected ? 'var(--wf-level)' : 'var(--wf-note-border)',
        borderLeftWidth: '3px',
        borderLeftColor: 'var(--wf-level)',
        background: 'var(--wf-note-bg)',
      }}
    >
      <div className="text-[13px] font-semibold leading-[1.35] text-[var(--wf-level)]">
        {node.title}
      </div>
      <div className="mt-[7px] text-[11.5px] leading-[1.6] text-[var(--wf-note-text)]">
        {node.purpose}
      </div>
    </div>
  )
}
