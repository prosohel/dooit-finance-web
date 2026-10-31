// Client-side workflow simulator.
//
// This walks the GRAPH. It calls nothing, verifies nothing, and screens
// nobody — it answers "given this data, which path would this workflow take?"
// The panel that renders it says so in its header, and that wording is not
// decorative: describing this as a verification sandbox would misrepresent
// what it proves.

import { operatorLabel } from './variableCatalog'
import { stepType } from './stepTypes'

/** Read a dotted path out of the subject; undefined when any hop is missing. */
const read = (subject, path) =>
  String(path || '')
    .split('.')
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), subject)

const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v])

/** Evaluate one condition leaf against the subject. */
const testLeaf = (subject, leaf) => {
  const actual = read(subject, leaf.field)
  const { operator, value, values, min, max } = leaf

  switch (operator) {
    case 'eq':         return actual === value
    case 'ne':         return actual !== value
    case 'gt':         return Number(actual) > Number(value)
    case 'gte':        return Number(actual) >= Number(value)
    case 'lt':         return Number(actual) < Number(value)
    case 'lte':        return Number(actual) <= Number(value)
    case 'in':         return asArray(values).includes(actual)
    case 'nin':        return !asArray(values).includes(actual)
    case 'between':    return Number(actual) >= Number(min) && Number(actual) <= Number(max)
    // `contains` reads both ways: a list containing a value, or a string
    // containing a substring. Both appear in the seeded template.
    case 'contains':   return Array.isArray(actual)
                          ? actual.includes(value)
                          : String(actual ?? '').includes(String(value))
    case 'startsWith': return String(actual ?? '').startsWith(String(value))
    case 'endsWith':   return String(actual ?? '').endsWith(String(value))
    case 'exists':     return actual !== undefined && actual !== null
    case 'regex':      { try { return new RegExp(String(value)).test(String(actual ?? '')) } catch { return false } }
    default:           return false
  }
}

/**
 * A branch with no conditions is an Else — it always matches, which is why it
 * must be last. Otherwise apply the branch's own AND/OR joiner.
 */
const testBranch = (subject, branch) => {
  const leaves = branch.conditions || []
  if (!leaves.length) return true
  return branch.logic === 'OR'
    ? leaves.some((l) => testLeaf(subject, l))
    : leaves.every((l) => testLeaf(subject, l))
}

const describeBranch = (branch) => {
  const leaves = branch.conditions || []
  if (!leaves.length) return 'no conditions'
  return leaves
    .map((l) => `${l.field} ${operatorLabel(l.operator)} ${l.values ?? l.value ?? `${l.min}–${l.max}`}`)
    .join(branch.logic === 'OR' ? ' or ' : ' and ')
}

/**
 * @param {{ startNodeId, nodes, edges }} graph
 * @param {object} subject          the simulated applicant / transaction
 * @param {{ maxSteps?: number }} opts
 * @returns {{ steps, verdict, note, truncated }}
 */
export const simulate = (graph, subject = {}, { maxSteps = 100 } = {}) => {
  const nodes = graph?.nodes || []
  const edges = graph?.edges || []
  const byId = new Map(nodes.map((n) => [n.id, n]))

  const start = byId.get(graph?.startNodeId)
  if (!start) {
    return { steps: [], verdict: 'No start step', note: 'Pick the step this workflow begins at.', truncated: false }
  }

  const steps = []
  const visited = new Set()
  let current = start
  let verdict = 'Completed'
  let note = 'The flow reached a terminal step.'
  let truncated = false

  while (current) {
    if (steps.length >= maxSteps) {
      truncated = true
      verdict = 'Stopped early'
      note = `The simulation stopped after ${maxSteps} steps.`
      break
    }

    // Cycle guard. The shipped template genuinely loops — risk reassessment
    // feeds back into ongoing due diligence — so revisiting a node is normal
    // behaviour to report, not an error to throw.
    if (visited.has(current.id)) {
      verdict = 'Loops back'
      note = `The flow returns to "${current.title}", which it has already run. Ongoing monitoring is expected to loop.`
      break
    }
    visited.add(current.id)

    const type = stepType(current.type)
    const step = {
      nodeId: current.id,
      title: current.title,
      typeLabel: type.label,
      answer: '',
      result: current.card?.inset || current.purpose || 'No configuration recorded',
      ms: 20 + steps.length * 7,   // illustrative only — nothing is timed
    }

    let nextId = null

    if (current.type === 'cond') {
      const branches = current.branches || []
      const hit = branches.find((b) => testBranch(subject, b))
      if (hit) {
        step.answer = hit.label
        step.result = describeBranch(hit)
        nextId = edges.find((e) => e.from === current.id && e.sourcePort === hit.key)?.to ?? null
      } else {
        // Only reachable when a condition node has no Else — which the
        // validator flags as an error before publish.
        step.answer = 'No branch matched'
        step.result = 'This condition has no Else branch.'
      }
    } else if (!current.endOfFlow) {
      nextId = edges.find((e) => e.from === current.id)?.to ?? null
    }

    steps.push(step)

    if (current.endOfFlow) {
      verdict = current.card?.decision || 'End of flow'
      note = current.card?.reason || 'This step is marked end of flow.'
      break
    }

    if (!nextId) {
      verdict = 'Stopped'
      note = `"${current.title}" has no next step.`
      break
    }

    current = byId.get(nextId) ?? null
    if (!current) {
      verdict = 'Broken connector'
      note = 'A connector points at a step that no longer exists.'
      break
    }
  }

  return { steps, verdict, note, truncated }
}
