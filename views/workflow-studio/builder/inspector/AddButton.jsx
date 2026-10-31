'use client'

/**
 * The inspector's small "Add …" control, as the design canvas draws it.
 *
 * Not a shadcn <Button>: the design's control is 11px on a 4px/8px box with a
 * hairline --primary-gray border, which is smaller than any Button size
 * variant and would need enough overrides to stop being a Button anyway.
 *
 * Two sizes, both from the design:
 *   section — sits flush right on a section heading row ("Add setting",
 *             "Add outcome", "Add branch"); slightly heavier, tints on hover
 *   inline  — sits on a field's own label row ("Add line", "Add tag")
 *   block   — full width dashed, inside a branch card ("Add condition")
 */
export default function AddButton({ children, onClick, variant = 'section' }) {
  const base =
    'font-sans text-[11px] rounded-[6px] bg-card text-[var(--primary)] transition-colors'

  const variants = {
    section:
      'font-medium px-2 py-1 border border-[var(--primary-gray)] hover:border-[var(--primary)] hover:bg-[var(--wf-primary-tint)]',
    inline:
      'px-[7px] py-[3px] border border-[var(--primary-gray)] hover:border-[var(--primary)]',
    block:
      'mt-2 w-full px-2 py-1 border border-dashed border-[var(--primary-gray)] text-[var(--smoke-600)] hover:border-[var(--primary)] hover:text-[var(--primary)]',
  }

  return (
    <button type="button" onClick={onClick} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  )
}
