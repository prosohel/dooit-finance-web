'use client'

import SectionLabel from '../SectionLabel'
import AddButton from '../AddButton'
import { BOXED_INPUT, SEAMLESS_INPUT, REMOVE_X } from '../fieldStyles'

/**
 * Settings — the step's auditable substance, as free-form label/value pairs.
 *
 * The design stacks each pair vertically: the label sits above its value,
 * borderless and muted, so a column of settings reads as "name: value" prose
 * rather than a grid of equal-weight boxes. This is also where the seeded
 * template's jurisdiction-specific figures live (thresholds, ownership tests,
 * the "(pending validation)" markers) — they are editable data, never
 * constants in code.
 */
export default function Settings({ node, onPatch }) {
  const fields = node.config?.fields || []

  const write = (next) => onPatch({ config: { ...node.config, fields: next } })

  const addField = () => write([...fields, { label: '', value: '' }])

  const updateField = (index, key, val) =>
    write(fields.map((f, i) => (i === index ? { ...f, [key]: val } : f)))

  const removeField = (index) => write(fields.filter((_, i) => i !== index))

  return (
    <>
      <SectionLabel action={<AddButton onClick={addField}>Add setting</AddButton>}>
        Settings
      </SectionLabel>

      <div className="flex flex-col gap-2">
        {fields.map((field, i) => (
          <div key={i} className="grid grid-cols-[1fr_20px] items-start gap-[5px]">
            <div className="flex min-w-0 flex-col gap-1">
              <input
                value={field.label || ''}
                onChange={(e) => updateField(i, 'label', e.target.value)}
                placeholder="Setting name"
                aria-label={`Setting ${i + 1} name`}
                className={`-ml-[5px] ${SEAMLESS_INPUT}`}
              />
              <input
                value={field.value || ''}
                onChange={(e) => updateField(i, 'value', e.target.value)}
                placeholder="Value"
                aria-label={`Setting ${i + 1} value`}
                className={BOXED_INPUT}
              />
            </div>
            {/* Nudged down so the × lines up with the value box, not the
                label above it — the design anchors it to the taller field. */}
            <button
              type="button"
              onClick={() => removeField(i)}
              aria-label={`Remove setting ${i + 1}`}
              className={`mt-[22px] ${REMOVE_X}`}
            >
              &times;
            </button>
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-[11.5px] text-[var(--txt-mute)]">
            No settings recorded for this step.
          </p>
        )}
      </div>
    </>
  )
}
