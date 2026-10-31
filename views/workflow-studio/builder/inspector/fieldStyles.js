/**
 * The inspector's field boxes, taken from the design canvas.
 *
 * These are plain class strings rather than components because the design uses
 * native <input>, <textarea> and <select> throughout this panel, and the
 * shadcn wrappers bring their own height, ring and padding scale that would
 * have to be overridden away field by field.
 *
 * Two families:
 *   BOXED    — a visible hairline box on white (values, selects)
 *   SEAMLESS — no border until hover/focus (titles, labels, owner/SLA),
 *              so a dense panel reads as text until you go to edit it
 */

// Shared focus treatment: the design rings in --primary, never the browser default.
const FOCUS = 'focus:border-[var(--primary)] focus:outline-none'

export const BOXED_INPUT =
  `w-full rounded-[7px] border border-[var(--wf-card-border)] bg-card px-[10px] py-2 font-sans text-[12.5px] text-[var(--heading)] ${FOCUS}`

// The smaller boxed input used inside lists (detail lines, branch values).
export const BOXED_INPUT_SM =
  `w-full rounded-[7px] border border-[var(--wf-card-border)] bg-card px-[9px] py-[7px] font-sans text-[12px] text-[var(--heading)] ${FOCUS}`

export const BOXED_SELECT =
  `w-full rounded-[7px] border border-[var(--wf-card-border)] bg-card px-[10px] py-2 font-sans text-[12.5px] text-[var(--heading)] ${FOCUS}`

// Selects that sit beside an input read as secondary — the design grounds
// them on --sidebar-bg so the editable value stays the brighter of the two.
export const BOXED_SELECT_MUTED =
  `rounded-[7px] border border-[var(--wf-card-border)] bg-[var(--sidebar-bg)] px-1 py-[7px] font-sans text-[11px] text-[var(--mute-200)] ${FOCUS}`

export const SEAMLESS_INPUT =
  `w-full rounded-[6px] border border-transparent bg-transparent px-[5px] py-[3px] font-sans text-[11.5px] text-[var(--mute-200)] hover:border-[var(--wf-card-border)] ${FOCUS}`

// The small × that removes a row. Muted until hovered, then destructive.
export const REMOVE_X =
  'border-0 bg-transparent p-0 font-sans text-[13px] text-[var(--primary-gray)] hover:text-[var(--danger)] transition-colors'

// A field's own small caption ("Highlighted line", "Decision", "Next step").
export const FIELD_CAPTION = 'mb-1 text-[11.5px] text-[var(--mute-200)]'
