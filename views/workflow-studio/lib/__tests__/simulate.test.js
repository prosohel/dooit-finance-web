import { describe, expect, test } from 'vitest'
import { simulate } from '../simulate'

const node = (id, over = {}) => ({
  id, num: '01', type: 'level', title: `Step ${id}`,
  position: { x: 0, y: 0 }, branches: [], endOfFlow: false,
  card: {}, config: {}, ...over,
})

const cond = (id, branches) => node(id, { type: 'cond', branches })
const br = (key, label, conditions, logic = 'AND') => ({ key, label, logic, conditions })

describe('simulate', () => {
  test('walks a linear flow to its terminal step', () => {
    const r = simulate(
      {
        startNodeId: 'n1',
        nodes: [node('n1'), node('n2', { endOfFlow: true })],
        edges: [{ from: 'n1', to: 'n2', sourcePort: '' }],
      },
      {}
    )
    expect(r.steps.map((s) => s.nodeId)).toEqual(['n1', 'n2'])
    expect(r.truncated).toBe(false)
  })

  test('takes the branch whose conditions match', () => {
    const graph = {
      startNodeId: 'c1',
      nodes: [
        cond('c1', [
          br('b1', 'Branch 1', [{ field: 'applicant.type', operator: 'eq', value: 'company' }]),
          br('b2', 'Else', []),
        ]),
        node('n2', { endOfFlow: true }),
        node('n3', { endOfFlow: true }),
      ],
      edges: [
        { from: 'c1', to: 'n2', sourcePort: 'b1' },
        { from: 'c1', to: 'n3', sourcePort: 'b2' },
      ],
    }
    expect(simulate(graph, { applicant: { type: 'company' } }).steps.at(-1).nodeId).toBe('n2')
  })

  test('falls through to Else when no branch matches', () => {
    const graph = {
      startNodeId: 'c1',
      nodes: [
        cond('c1', [
          br('b1', 'Branch 1', [{ field: 'applicant.type', operator: 'eq', value: 'company' }]),
          br('b2', 'Else', []),
        ]),
        node('n2', { endOfFlow: true }),
        node('n3', { endOfFlow: true }),
      ],
      edges: [
        { from: 'c1', to: 'n2', sourcePort: 'b1' },
        { from: 'c1', to: 'n3', sourcePort: 'b2' },
      ],
    }
    expect(simulate(graph, { applicant: { type: 'individual' } }).steps.at(-1).nodeId).toBe('n3')
  })

  test('OR logic matches when any condition holds', () => {
    const graph = {
      startNodeId: 'c1',
      nodes: [
        cond('c1', [
          br('b1', 'Branch 1', [
            { field: 'a', operator: 'eq', value: 1 },
            { field: 'b', operator: 'eq', value: 2 },
          ], 'OR'),
          br('b2', 'Else', []),
        ]),
        node('hit', { endOfFlow: true }),
        node('miss', { endOfFlow: true }),
      ],
      edges: [
        { from: 'c1', to: 'hit', sourcePort: 'b1' },
        { from: 'c1', to: 'miss', sourcePort: 'b2' },
      ],
    }
    expect(simulate(graph, { a: 999, b: 2 }).steps.at(-1).nodeId).toBe('hit')
  })

  test('a cycle terminates instead of hanging', () => {
    // A minimal two-node cycle, not a reproduction of the shipped template —
    // the real seed loop is six nodes (n25→n17→n18→n31→n30→n24→n25). This
    // just proves the guard trips on the smallest possible loop. An
    // unguarded walk never returns.
    const r = simulate(
      {
        startNodeId: 'n1',
        nodes: [node('n1'), node('n2')],
        edges: [
          { from: 'n1', to: 'n2', sourcePort: '' },
          { from: 'n2', to: 'n1', sourcePort: '' },
        ],
      },
      {}
    )
    expect(r.steps.length).toBeLessThanOrEqual(3)
    expect(r.verdict).toMatch(/loop/i)
  })

  test('a self-loop terminates instead of hanging', () => {
    const r = simulate(
      {
        startNodeId: 'n1',
        nodes: [node('n1')],
        edges: [{ from: 'n1', to: 'n1', sourcePort: '' }],
      },
      {}
    )
    expect(r.steps.length).toBeLessThanOrEqual(2)
    expect(r.verdict).toMatch(/loop/i)
  })

  test('a condition branch edge back to an already-visited node terminates', () => {
    const graph = {
      startNodeId: 'c1',
      nodes: [
        cond('c1', [
          br('b1', 'Branch 1', [{ field: 'applicant.type', operator: 'eq', value: 'individual' }]),
          br('b2', 'Else', []),
        ]),
        node('n2'),
      ],
      edges: [
        { from: 'c1', to: 'n2', sourcePort: 'b1' },
        { from: 'n2', to: 'c1', sourcePort: '' },
      ],
    }
    const r = simulate(graph, { applicant: { type: 'individual' } })
    expect(r.steps.length).toBeLessThanOrEqual(3)
    expect(r.verdict).toMatch(/loop/i)
  })

  test('maxSteps caps a long flow and reports truncation', () => {
    const nodes = Array.from({ length: 20 }, (_, i) => node(`n${i}`))
    const edges = nodes.slice(0, -1).map((n, i) => ({ from: n.id, to: `n${i + 1}`, sourcePort: '' }))
    const r = simulate({ startNodeId: 'n0', nodes, edges }, {}, { maxSteps: 5 })
    expect(r.steps).toHaveLength(5)
    expect(r.truncated).toBe(true)
  })

  test('a missing start node returns an empty run rather than throwing', () => {
    const r = simulate({ startNodeId: '', nodes: [], edges: [] }, {})
    expect(r.steps).toEqual([])
    expect(r.verdict).toMatch(/no start/i)
  })
})
