import { describe, expect, test } from 'vitest'
import { reducer, initial } from '../reducer'
import { validateGraph } from '../../lib/graphValidation'

const node = (id, over = {}) => ({
  id, num: '01', type: 'level', title: `Step ${id}`,
  position: { x: 0, y: 0 }, branches: [], endOfFlow: false,
  card: {}, config: {}, ...over,
})

const emptyWorkflow = { nodes: [], edges: [], startNodeId: '' }

describe('a new or stub workflow can be made valid from the UI alone', () => {
  // The bug: seeded gallery stubs and anything from "New workflow" arrive with
  // no nodes and no startNodeId, so validateGraph reports NO_START_NODE. Adding
  // a step did not clear it, because addNode never assigned a start — leaving
  // the user in an error state with no obvious way out.

  test('an empty workflow starts in a NO_START_NODE error state', () => {
    const s = initial(emptyWorkflow)
    const { errors } = validateGraph(s)
    expect(errors.map((e) => e.code)).toContain('NO_START_NODE')
  })

  test('adding the first step makes it the start and clears the error', () => {
    const s = reducer(initial(emptyWorkflow), { type: 'addNode', node: node('n1') })
    expect(s.startNodeId).toBe('n1')
    const { errors } = validateGraph(s)
    expect(errors.map((e) => e.code)).not.toContain('NO_START_NODE')
  })

  test('the second step does not steal the start from the first', () => {
    let s = reducer(initial(emptyWorkflow), { type: 'addNode', node: node('n1') })
    s = reducer(s, { type: 'addNode', node: node('n2') })
    expect(s.startNodeId).toBe('n1')
  })

  test('a note is never adopted as the start', () => {
    // A note cannot be the start step — the validator rejects it with
    // START_NODE_IS_NOTE, so adopting one would swap one error for another.
    const s = reducer(initial(emptyWorkflow), {
      type: 'addNode',
      node: node('note1', { type: 'note' }),
    })
    expect(s.startNodeId).toBe('')
  })

  test('deleting the start node, then adding a step, re-establishes a start', () => {
    let s = reducer(initial(emptyWorkflow), { type: 'addNode', node: node('n1') })
    s = reducer(s, { type: 'removeNode', id: 'n1' })
    expect(s.startNodeId).toBe('')
    s = reducer(s, { type: 'addNode', node: node('n2') })
    expect(s.startNodeId).toBe('n2')
  })

  test('an explicit start choice survives later additions', () => {
    let s = reducer(initial(emptyWorkflow), { type: 'addNode', node: node('n1') })
    s = reducer(s, { type: 'addNode', node: node('n2') })
    s = reducer(s, { type: 'setStart', id: 'n2' })
    s = reducer(s, { type: 'addNode', node: node('n3') })
    expect(s.startNodeId).toBe('n2')
  })
})

describe('a positions dispatch that moved nothing must not churn identity', () => {
  // React Flow fires onNodesChange for selection clicks and for the dimension
  // measurement it does on mount, not only for drags. If the reducer rebuilds
  // state.nodes every time, the canvas's useMemo recomputes, React Flow gets
  // brand-new node objects with no `measured` data, measures them again, and
  // fires another dimensions change — an infinite render loop that leaves the
  // canvas blank the moment the first node is added.

  const twoNodes = {
    nodes: [node('n1'), node('n2', { position: { x: 300, y: 0 } })],
    edges: [],
    startNodeId: 'n1',
  }

  test('identical positions return the SAME state object', () => {
    const s = initial(twoNodes)
    const next = reducer(s, {
      type: 'positions',
      nodes: [
        { id: 'n1', position: { x: 0, y: 0 } },
        { id: 'n2', position: { x: 300, y: 0 } },
      ],
      dirty: false,
    })
    expect(next).toBe(s)
  })

  test('a real move returns new state and preserves unmoved node identity', () => {
    const s = initial(twoNodes)
    const next = reducer(s, {
      type: 'positions',
      nodes: [
        { id: 'n1', position: { x: 99, y: 42 } },
        { id: 'n2', position: { x: 300, y: 0 } },
      ],
      dirty: true,
    })
    expect(next).not.toBe(s)
    expect(next.nodes[0].position).toEqual({ x: 99, y: 42 })
    // The node that did not move keeps its identity, so React can skip it.
    expect(next.nodes[1]).toBe(s.nodes[1])
    expect(next.dirty).toBe(true)
  })
})

describe('the empty-graph message tells the user something they can act on', () => {
  test('with no steps, it says to add one rather than to pick one', () => {
    const { errors } = validateGraph(emptyWorkflow)
    const e = errors.find((x) => x.code === 'NO_START_NODE')
    expect(e.message).toMatch(/no steps yet/i)
    expect(e.message).not.toMatch(/pick the step/i)
  })

  test('with steps but no start chosen, it says to mark one', () => {
    const { errors } = validateGraph({
      nodes: [node('n1'), node('n2')], edges: [], startNodeId: '',
    })
    const e = errors.find((x) => x.code === 'NO_START_NODE')
    expect(e.message).toMatch(/mark it as the start/i)
  })
})
