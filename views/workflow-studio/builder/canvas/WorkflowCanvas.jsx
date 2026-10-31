'use client'
import { useMemo } from 'react'
import {
  ReactFlow, Background,
  applyNodeChanges, applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import StepNode from './StepNode'
import NoteNode from './NoteNode'
import CanvasControls from './CanvasControls'

const nodeTypes = { step: StepNode, note: NoteNode }

/**
 * The React Flow canvas. This component's only job is translation: it takes
 * our workflow's plain `nodes`/`edges` arrays (the same shape the API stores)
 * and turns them into what React Flow wants, then translates React Flow's
 * callbacks back into our own vocabulary before calling the props Task 10's
 * reducer expects. React Flow's own shapes (`source`/`target`/`sourceHandle`,
 * its internal edge `id`) never leak past this file.
 */
export default function WorkflowCanvas({
  nodes, edges, selectedId, startNodeId,
  onSelect, onNodesChange, onEdgesChange, onConnect, onDeleteEdge,
}) {
  // React Flow owns position; our node object owns everything else.
  //
  // `isStart` is computed here, not stored on the node. A workflow's start is
  // named once, on `workflow.startNodeId` — duplicating that flag onto the
  // node itself would let a copy/paste or an edit drift out of sync with the
  // one true answer. StepNode only ever reads `data.isStart`.
  const rfNodes = useMemo(
    () => nodes.map((n) => ({
      id: n.id,
      type: n.type === 'note' ? 'note' : 'step',
      position: n.position,
      data: { node: n, selected: selectedId === n.id, isStart: n.id === startNodeId },
      selected: selectedId === n.id,
    })),
    [nodes, selectedId, startNodeId]
  )

  const rfEdges = useMemo(
    () => edges.map((e, i) => ({
      id: `${e.from}:${e.sourcePort || ''}:${e.to}:${i}`,
      source: e.from,
      target: e.to,
      sourceHandle: e.sourcePort || null,
      type: 'smoothstep',
      // The edge's index in our own `edges` array — not React Flow's id.
      // Task 10's reducer removes an edge by splicing this array, so
      // onDeleteEdge must be handed the index, never React Flow's own
      // synthetic id string.
      data: { index: i },
      style: {
        stroke: selectedId === e.from || selectedId === e.to
          ? 'var(--primary)' : 'var(--primary-gray)',
        strokeWidth: 1.75,
      },
    })),
    [edges, selectedId]
  )

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      // Pass the raw change list through alongside the applied result — React
      // Flow fires this for selection clicks and its mount-time dimension
      // measurement too, not only drags. The caller needs the change TYPES
      // (not just the new node array) to tell "the user moved something" apart
      // from "the user clicked something" or "the browser measured a card".
      onNodesChange={(ch) => onNodesChange(applyNodeChanges(ch, rfNodes), ch)}
      onEdgesChange={(ch) => onEdgesChange(applyEdgeChanges(ch, rfEdges))}
      // React Flow's onConnect hands back {source, target, sourceHandle,
      // targetHandle}. Our reducer speaks {from, to, sourcePort} — the same
      // shape as a stored workflow edge — so we convert right here, once,
      // instead of teaching every caller React Flow's vocabulary.
      onConnect={(c) => onConnect({ from: c.source, to: c.target, sourcePort: c.sourceHandle || '' })}
      onEdgeClick={(_, edge) => onDeleteEdge(edge.data.index)}
      onNodeClick={(_, node) => onSelect(node.id)}
      onPaneClick={() => onSelect(null)}
      minZoom={0.3}
      maxZoom={1.6}
      fitView
      proOptions={{ hideAttribution: true }}
      className="bg-[var(--sidebar-bg)]"
    >
      <Background gap={16} size={1} color="var(--primary-gray)" />
      {/* The design's own zoom stack, not React Flow's default bar, and no
          minimap — the design does not use one. */}
      <CanvasControls />
    </ReactFlow>
  )
}
