// One reducer over the whole graph. React Flow reports changes; this decides
// what they mean. Keeping it in one place makes autosave, undo and validation
// tractable.
//
// It lives in its own module, with no React or Next imports, so it can be
// tested directly — see __tests__/reducer.test.js.

export const initial = (workflow) => ({
  nodes: workflow.nodes || [],
  edges: workflow.edges || [],
  startNodeId: workflow.startNodeId || '',
  selectedId: workflow.nodes?.[0]?.id ?? null,
  dirty: false,
})

export function reducer(state, action) {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id }

    case 'positions': {
      // React Flow moved nodes — position only, never content. `action.dirty`
      // is computed by the caller from the raw change types: React Flow also
      // fires this callback for a plain selection click and for the
      // dimension measurement it does on mount, and neither of those is an
      // edit worth autosaving — only `position`/`remove` changes are.
      //
      // Identity matters here, not just value. React Flow fires this on mount
      // (measuring each card) and on every selection click. If we rebuilt
      // `nodes` each time, the canvas's useMemo would recompute, React Flow
      // would receive brand-new node objects carrying no `measured` data,
      // measure them again, and fire another dimensions change — an infinite
      // render loop that leaves the canvas blank as soon as a node exists.
      // So: return the same state when nothing actually moved, and keep the
      // identity of every node that did not move.
      let moved = false
      const nodes = state.nodes.map((n) => {
        const next = action.nodes.find((r) => r.id === n.id)
        if (!next || !next.position) return n
        if (next.position.x === n.position?.x && next.position.y === n.position?.y) return n
        moved = true
        return { ...n, position: next.position }
      })
      const dirty = state.dirty || !!action.dirty
      if (!moved && dirty === state.dirty) return state
      return { ...state, nodes: moved ? nodes : state.nodes, dirty }
    }

    case 'addNode': {
      // The first real step added to a graph with no resolvable start becomes
      // the start. Without this, a new or stub workflow sits in a permanent
      // NO_START_NODE error that adding steps does not clear — the user has to
      // discover a toggle in the inspector to escape it.
      //
      // This also self-heals a dangling start: `removeNode` clears
      // `startNodeId` when the start is deleted, so the next step added takes
      // over. A note can never be the start (START_NODE_IS_NOTE), so notes are
      // excluded from the adoption.
      const startResolves = state.nodes.some((n) => n.id === state.startNodeId)
      const canBeStart = action.node.type !== 'note'
      return {
        ...state,
        nodes: [...state.nodes, action.node],
        startNodeId: !startResolves && canBeStart ? action.node.id : state.startNodeId,
        selectedId: action.node.id,
        dirty: true,
      }
    }

    case 'patchNode':
      return {
        ...state,
        nodes: state.nodes.map((n) => (n.id === action.id ? { ...n, ...action.patch } : n)),
        dirty: true,
      }

    case 'removeNode':
      return {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== action.id),
        edges: state.edges.filter((e) => e.from !== action.id && e.to !== action.id),
        selectedId: null,
        // Clear startNodeId if removing the start node
        startNodeId: state.startNodeId === action.id ? '' : state.startNodeId,
        dirty: true,
      }

    case 'connect': {
      const { from, to, sourcePort } = action
      // One edge per (node, port): connecting a port that already leads
      // somewhere replaces the old target rather than silently forking.
      const kept = state.edges.filter((e) => !(e.from === from && (e.sourcePort || '') === (sourcePort || '')))
      return { ...state, edges: [...kept, { from, to, sourcePort: sourcePort || '' }], dirty: true }
    }

    case 'removeEdge':
      return { ...state, edges: state.edges.filter((_, i) => i !== action.index), dirty: true }

    case 'clearEdgesFrom':
      // Remove all outgoing edges from a node (used when marking endOfFlow)
      return { ...state, edges: state.edges.filter((e) => e.from !== action.id), dirty: true }

    case 'setStart':
      return { ...state, startNodeId: action.id, dirty: true }

    case 'saved':
      return { ...state, dirty: false }

    default:
      return state
  }
}
