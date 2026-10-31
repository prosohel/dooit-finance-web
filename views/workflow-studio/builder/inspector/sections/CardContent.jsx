'use client'

import SectionLabel from '../SectionLabel'
import AddButton from '../AddButton'
import {
  BOXED_INPUT, BOXED_INPUT_SM, BOXED_SELECT_MUTED, REMOVE_X, FIELD_CAPTION,
} from '../fieldStyles'

/**
 * Card content — what the step's card shows on the canvas.
 *
 * Presentation only; nothing here changes what the workflow does. The fields
 * map one-for-one onto the card schema:
 *   inset     the highlighted line
 *   decision / reason   shown on review steps
 *   chips[]   plain strings — detail lines, no tone
 *   tagLabel  the caption above the tag row
 *   tags[]    { text, tone } — tone is warn | bad | plain
 *
 * Every tag keeps its text beside its tone, because tone alone is colour, and
 * colour is never the only thing carrying meaning on these cards.
 */
const TONE_OPTIONS = [
  { value: 'plain', label: 'Plain' },
  { value: 'warn', label: 'Warning' },
  { value: 'bad', label: 'Bad' },
]

export default function CardContent({ node, onPatch }) {
  const card = node.card || {}

  const write = (key, value) => onPatch({ card: { ...card, [key]: value } })

  const chips = card.chips || []
  const tags = card.tags || []

  const addChip = () => write('chips', [...chips, ''])
  const updateChip = (i, val) => write('chips', chips.map((c, j) => (j === i ? val : c)))
  const removeChip = (i) => write('chips', chips.filter((_, j) => j !== i))

  const addTag = () => write('tags', [...tags, { text: '', tone: 'plain' }])
  const updateTag = (i, key, val) =>
    write('tags', tags.map((t, j) => (j === i ? { ...t, [key]: val } : t)))
  const removeTag = (i) => write('tags', tags.filter((_, j) => j !== i))

  return (
    <>
      <SectionLabel>Card content</SectionLabel>

      <div className="flex flex-col gap-2">
        <div>
          <div className={FIELD_CAPTION}>Highlighted line</div>
          <input
            value={card.inset || ''}
            onChange={(e) => write('inset', e.target.value)}
            placeholder="e.g. ID document, MRZ and chip"
            aria-label="Highlighted line"
            className={BOXED_INPUT}
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <div className={FIELD_CAPTION}>Decision</div>
            <input
              value={card.decision || ''}
              onChange={(e) => write('decision', e.target.value)}
              placeholder="Manual review"
              aria-label="Decision"
              className={BOXED_INPUT}
            />
          </div>
          <div>
            <div className={FIELD_CAPTION}>Reasons</div>
            <input
              value={card.reason || ''}
              onChange={(e) => write('reason', e.target.value)}
              placeholder="Reasons shown on card"
              aria-label="Reasons"
              className={BOXED_INPUT}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="text-[11.5px] text-[var(--mute-200)]">Detail lines</div>
            <div className="ml-auto">
              <AddButton variant="inline" onClick={addChip}>Add line</AddButton>
            </div>
          </div>
          <div className="flex flex-col gap-[5px]">
            {chips.map((chip, i) => (
              <div key={i} className="grid grid-cols-[1fr_20px] items-center gap-[5px]">
                <input
                  value={chip || ''}
                  onChange={(e) => updateChip(i, e.target.value)}
                  aria-label={`Detail line ${i + 1}`}
                  className={BOXED_INPUT_SM}
                />
                <button
                  type="button"
                  onClick={() => removeChip(i)}
                  aria-label={`Remove detail line ${i + 1}`}
                  className={REMOVE_X}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="text-[11.5px] text-[var(--mute-200)]">Tags and labels</div>
            <div className="ml-auto">
              <AddButton variant="inline" onClick={addTag}>Add tag</AddButton>
            </div>
          </div>
          {/* The caption the card prints above its tag row. */}
          <input
            value={card.tagLabel || ''}
            onChange={(e) => write('tagLabel', e.target.value)}
            placeholder="Add labels to applicant"
            aria-label="Tag row caption"
            className="mb-[5px] w-full rounded-[7px] border border-[var(--wf-card-border)] bg-card px-[9px] py-1.5 font-sans text-[11.5px] text-[var(--mute-200)] focus:border-[var(--primary)] focus:outline-none"
          />
          <div className="flex flex-col gap-[5px]">
            {tags.map((tag, i) => (
              <div key={i} className="grid grid-cols-[1fr_74px_20px] items-center gap-[5px]">
                <input
                  value={tag.text || ''}
                  onChange={(e) => updateTag(i, 'text', e.target.value)}
                  aria-label={`Tag ${i + 1} text`}
                  className={`${BOXED_INPUT_SM} font-mono text-[11px]`}
                />
                <select
                  value={tag.tone || 'plain'}
                  onChange={(e) => updateTag(i, 'tone', e.target.value)}
                  aria-label={`Tag ${i + 1} tone`}
                  className={BOXED_SELECT_MUTED}
                >
                  {TONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeTag(i)}
                  aria-label={`Remove tag ${i + 1}`}
                  className={REMOVE_X}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
