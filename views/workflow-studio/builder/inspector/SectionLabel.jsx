'use client'

/**
 * The inspector's section heading, as the design canvas draws it: mono, 9.5px,
 * uppercase, widely tracked, muted. Used above every section so a long
 * inspector reads as a set of named groups rather than one undifferentiated
 * column of inputs.
 *
 * `action` takes an optional control rendered flush right on the same line —
 * the design puts "Add setting", "Add outcome" and "Add branch" there rather
 * than below their lists.
 */
export default function SectionLabel({ children, action }) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-2 first:mt-0">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--mute-200)]">
        {children}
      </div>
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  )
}
