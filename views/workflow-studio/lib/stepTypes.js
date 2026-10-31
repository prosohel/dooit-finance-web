// The step-type registry. One source of truth for what a step type is called,
// what colour it carries, and what a fresh one of it looks like.
//
// Colours are CSS variable names, never hex. The design canvas was authored
// against app/globals.css — #005964 IS --primary — so referencing the token
// keeps the builder correct if the palette ever moves.

export const STEP_TYPES = {
  // `label` is what the CARD shows; `paletteName` is what the palette row
  // shows. They differ for `mon` in the source design — the card reads
  // "Monitoring", the palette reads "Ongoing monitoring" — so both are kept
  // rather than picking one and losing the distinction.
  level:  { key: 'level',  label: 'Level step',    iconLetter: 'L', colorVar: '--wf-level',  hint: 'Document, selfie, AML' },
  quest:  { key: 'quest',  label: 'Questionnaire', iconLetter: 'Q', colorVar: '--wf-quest',  hint: 'Structured applicant data' },
  cond:   { key: 'cond',   label: 'Condition',     iconLetter: 'C', colorVar: '--wf-cond',   hint: 'Branch on data or labels' },
  action: { key: 'action', label: 'Action',        iconLetter: 'A', colorVar: '--wf-action', hint: 'Tags and risk labels' },
  review: { key: 'review', label: 'Review step',   iconLetter: 'R', colorVar: '--wf-review', hint: 'Approve or reject' },
  deleg:  { key: 'deleg',  label: 'Delegation',    iconLetter: 'D', colorVar: '--wf-deleg',  hint: 'Route to a team' },
  hook:   { key: 'hook',   label: 'Webhook',       iconLetter: 'H', colorVar: '--wf-hook',   hint: 'Notify an external system' },
  wait:   { key: 'wait',   label: 'Wait',          iconLetter: 'T', colorVar: '--wf-wait',   hint: 'Hold for a period' },
  mon:    { key: 'mon',    label: 'Monitoring',    iconLetter: 'M', colorVar: '--wf-mon',    hint: 'Continuous checks', paletteName: 'Ongoing monitoring' },
  report: { key: 'report', label: 'Report',        iconLetter: 'S', colorVar: '--wf-report', hint: 'SMR or threshold report' },
  note:   { key: 'note',   label: 'Note',          iconLetter: 'N', colorVar: '--wf-level',  hint: 'Annotation, not a step' },
}

/** Palette order. `note` is excluded — notes are added from the canvas menu. */
export const STEP_TYPE_ORDER = [
  'level', 'quest', 'cond', 'action', 'review',
  'deleg', 'hook', 'wait', 'mon', 'report',
]

export const stepType = (key) => STEP_TYPES[key] ?? STEP_TYPES.level

/** A fresh node of the given type, positioned by the caller. */
export const newNode = (type, { id, num, position }) => ({
  id,
  num,
  type,
  title: stepType(type).label,
  purpose: '',
  position,
  card: { inset: '', chips: ['Not configured'], tagLabel: '', tags: [], decision: '', reason: '' },
  config: { fields: [], outcomes: [], owner: '', sla: '' },
  branches: type === 'cond'
    ? [
        { key: 'b1', label: 'Branch 1', logic: 'AND', conditions: [{ field: 'applicant.type', operator: 'eq', value: 'individual' }] },
        { key: 'b2', label: 'Else', logic: 'AND', conditions: [] },
      ]
    : [],
  endOfFlow: false,
})
