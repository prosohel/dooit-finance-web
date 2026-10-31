'use client'

import { useReducer, useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Info, PanelLeft, PanelRight, Plus } from 'lucide-react'
import WorkflowCanvas from './canvas/WorkflowCanvas'
import StepPalette from './palette/StepPalette'
import StepInspector from './inspector/StepInspector'
import TestRunPanel from './testrun/TestRunPanel'
import VersionHistory from './VersionHistory'
import { newNode } from '../lib/stepTypes'
import { validateGraph } from '../lib/graphValidation'
import { updateWorkflow, publishWorkflow, approveWorkflow, archiveWorkflow } from '@/app/dashboard/client/workflow-studio/actions'
import { reducer, initial } from './reducer'

// Detect if viewport is above 1180px using a hook
function useIsAbove1180() {
  const [isAbove1180, setIsAbove1180] = useState(false)

  useEffect(() => {
    const checkWidth = () => setIsAbove1180(window.innerWidth >= 1180)
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  return isAbove1180
}


// ── WorkflowBuilder Component ────────────────────────────────────────────────

export default function WorkflowBuilder({ workflow }) {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, workflow, initial)
  const isAbove1180 = useIsAbove1180()
  const autosaveTimeoutRef = useRef(null)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')
  const [showPaletteSheet, setShowPaletteSheet] = useState(false)
  const [showInspectorSheet, setShowInspectorSheet] = useState(false)
  const [showTestRunPanel, setShowTestRunPanel] = useState(false)
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)

  // ── Validation ───────────────────────────────────────────────────────────
  const validation = useMemo(
    () => validateGraph({ nodes: state.nodes, edges: state.edges, startNodeId: state.startNodeId }),
    [state.nodes, state.edges, state.startNodeId]
  )

  // A workflow with no steps is not broken, it is new. The validator still
  // reports NO_START_NODE — correctly, since the API must refuse to publish an
  // empty graph — but presenting that as "1 error, must be fixed" to someone
  // who has not done anything yet is scolding them for starting. So the alerts
  // wait until there is something to be wrong about; the canvas shows guidance
  // instead, and Publish stays disabled either way.
  const hasSteps = useMemo(
    () => state.nodes.some((n) => n.type !== 'note'),
    [state.nodes]
  )

  // Shared by autosave and the manual Save button. C5: the server resets an
  // approved workflow to draft the moment its graph changes, and reports
  // that with `approvalRevoked`. That must never ride in as a quiet part of
  // the usual "Workflow saved" toast — the user needs to be told plainly
  // that their edit just undid someone's sign-off.
  const reportSaveResult = useCallback((res) => {
    if (!res.success) {
      toast.error(res.message || 'Failed to save workflow')
      return
    }
    dispatch({ type: 'saved' })
    if (res.approvalRevoked) {
      toast.warning(res.message || 'This workflow was approved. Editing its graph reset it to draft.')
      router.refresh()
    } else {
      toast.success('Workflow saved')
    }
  }, [router])

  // ── Workflow-level details ───────────────────────────────────────────────
  // Name, description and classification live here rather than in the graph
  // reducer — they are properties OF the workflow, not of its nodes, and the
  // reducer's job is the graph. Without this the header showed `workflow.name`
  // as static text and the save payload carried only the graph, so every
  // workflow a user created stayed "Untitled workflow" in category
  // `onboarding` forever, which also made the gallery's category filter
  // useless for anything they authored.
  const [meta, setMeta] = useState({
    name: workflow.name || '',
    description: workflow.description || '',
    category: workflow.category || 'onboarding',
    appliesTo: workflow.appliesTo || 'both',
  })
  const [metaDirty, setMetaDirty] = useState(false)
  const [showDetailsSheet, setShowDetailsSheet] = useState(false)

  // Mirrors the enums on api/models/Workflow.js, which is authoritative. The
  // API also serves these at /workflow/meta/catalog; kept local so opening the
  // builder does not wait on a round-trip to render a dropdown.
  const CATEGORIES = ['onboarding', 'screening', 'monitoring', 'investigation', 'reporting']
  const APPLIES_TO = ['individual', 'entity', 'both']

  const patchMeta = useCallback((patch) => {
    setMeta((m) => ({ ...m, ...patch }))
    setMetaDirty(true)
  }, [])

  // ── Autosave ─────────────────────────────────────────────────────────────
  // Debounce autosave at 1200ms, only when dirty, never auto-publish.
  // Depend on specific pieces only: nodes, edges, startNodeId, dirty. Not selectedId (that's UI state).
  useEffect(() => {
    if (!state.dirty && !metaDirty) return

    // Clear any pending autosave
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)

    autosaveTimeoutRef.current = setTimeout(async () => {
      // Only send the graph when the graph actually changed. A rename must not
      // look like a graph edit — the API revokes approval on a versioned-path
      // change, so sending unchanged nodes/edges alongside a title tweak would
      // demote an approved workflow to draft for no reason.
      const payload = { ...meta }
      if (state.dirty) {
        payload.nodes = state.nodes
        payload.edges = state.edges
        payload.startNodeId = state.startNodeId
      }
      const res = await updateWorkflow(workflow.id, payload)
      if (res?.success) setMetaDirty(false)
      reportSaveResult(res)
    }, 1200)

    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)
    }
  }, [state.nodes, state.edges, state.startNodeId, state.dirty, meta, metaDirty, workflow.id, reportSaveResult])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddNode = useCallback((typeKey) => {
    const id = `node-${Date.now()}`
    const num = state.nodes.length + 1
    // Position at viewport center (approximate, 300,200 is a reasonable default)
    const node = newNode(typeKey, { id, num, position: { x: 300, y: 200 } })
    dispatch({ type: 'addNode', node })
  }, [state.nodes.length])

  const handleNodeSelect = useCallback((id) => {
    dispatch({ type: 'select', id })
  }, [])

  const handleNodePatch = useCallback((patch) => {
    dispatch({ type: 'patchNode', id: state.selectedId, patch })
  }, [state.selectedId])

  const handleNodeRemove = useCallback(() => {
    if (state.selectedId) {
      dispatch({ type: 'removeNode', id: state.selectedId })
    }
  }, [state.selectedId])

  const handleNodesChange = useCallback((nodes, changes = []) => {
    // Only a drag (`position`) or a deletion (`remove`) is a real edit.
    // `select` fires on every click, `dimensions` fires on mount — neither
    // should mark the workflow dirty or wake the autosave debounce (I6).
    const dirty = changes.some((c) => c.type === 'position' || c.type === 'remove')
    // Don't even dispatch for the changes we store nothing from. React Flow
    // measures every card on mount and emits `dimensions`; sending that through
    // the reducer is pure churn, and churn here used to feed a re-measure loop.
    // The reducer guards this too — this is the cheaper of the two gates.
    if (!dirty && !changes.some((c) => c.type === 'position')) return
    dispatch({ type: 'positions', nodes, dirty })
  }, [])

  const handleEdgesChange = useCallback(() => {
    // React Flow's internal edge changes don't require our action
  }, [])

  const handleConnect = useCallback((connection) => {
    dispatch({ type: 'connect', ...connection })
  }, [])

  const handleDeleteEdge = useCallback((index) => {
    dispatch({ type: 'removeEdge', index })
  }, [])

  const handleClearEdges = useCallback((nodeId) => {
    dispatch({ type: 'clearEdgesFrom', id: nodeId })
  }, [])

  const handleSetStart = useCallback((nodeId) => {
    dispatch({ type: 'setStart', id: nodeId })
  }, [])

  const handlePublish = useCallback(async () => {
    if (validation.errors.length > 0) {
      toast.error('Cannot publish: fix validation errors first')
      return
    }

    const res = await publishWorkflow(workflow.id)
    if (res.success) {
      toast.success(res.message || 'Sent for approval. A second approver must activate it.')
      router.refresh() // status badge (draft → pending_approval) is server data
    } else {
      toast.error(res.message || 'Failed to publish workflow')
    }
  }, [workflow.id, validation.errors, router])

  // C2: the checker half of maker-checker. The API 403s when the approver is
  // the same person who published — that refusal is the whole point of the
  // control, so it must reach the user as its own clear message, not a
  // generic "failed" toast.
  const handleApprove = useCallback(async () => {
    const res = await approveWorkflow(workflow.id)
    if (res.success) {
      toast.success(res.message || 'Workflow activated')
      router.refresh()
    } else {
      toast.error(res.message || 'Failed to approve workflow')
    }
  }, [workflow.id, router])

  const handleArchive = useCallback((e) => {
    if (!archiveReason.trim()) {
      // Keep the dialog open: Radix's AlertDialogAction closes on click
      // unless the click handler prevents it.
      e.preventDefault()
      toast.error('Archive reason is required')
      return
    }

    archiveWorkflow(workflow.id, archiveReason).then((res) => {
      if (res.success) {
        toast.success(res.message || 'Workflow archived')
        setArchiveReason('')
        router.refresh() // status badge (→ archived) is server data
      } else {
        toast.error(res.message || 'Failed to archive workflow')
      }
    })
  }, [workflow.id, archiveReason, router])

  const handleKeyDown = useCallback((e) => {
    // Guard: only handle Delete/Backspace on non-input elements
    if (/input|textarea/i.test(e.target.tagName || '')) return

    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedId) {
      e.preventDefault()
      handleNodeRemove()
    }
  }, [state.selectedId, handleNodeRemove])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // ── Selected node ────────────────────────────────────────────────────────
  const selectedNode = state.nodes.find((n) => n.id === state.selectedId)

  // ── Render ───────────────────────────────────────────────────────────────
  const header = (
    <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Product mark and wordmark, as the design canvas opens its header.
            The mark is decorative — the wordmark beside it carries the name —
            so it is hidden from assistive tech rather than read out as "A". */}
        <div className="flex items-center gap-[9px] shrink-0">
          <div
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--wf-level)] font-mono text-[12px] font-medium text-[var(--accent)]"
          >
            A
          </div>
          <span className="text-sm font-semibold tracking-[-0.01em] whitespace-nowrap">
            Workflow Studio
          </span>
        </div>
        <span className="text-[var(--primary-gray)]">/</span>
        {/* next/link, not a bare <a>: a raw href reloads the whole dashboard
            shell to go back one level, which is slow and throws away the
            canvas state a pending autosave may not have flushed yet. */}
        <Link href="/dashboard/client/workflow-studio" className="text-sm text-muted-foreground hover:text-[var(--primary)] whitespace-nowrap">
          Workflows
        </Link>
        <span className="text-[var(--primary-gray)]">/</span>
        {/* Editable in place. A workflow you cannot name is a workflow you
            cannot find again — every one created from the gallery arrives as
            "Untitled workflow", so renaming has to be reachable here, not
            buried behind a settings screen. */}
        <Input
          value={meta.name}
          onChange={(e) => patchMeta({ name: e.target.value })}
          placeholder="Untitled workflow"
          aria-label="Workflow name"
          className="h-7 max-w-[22rem] border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none hover:border-[var(--border)] focus-visible:border-[var(--primary)]"
        />
        {/* Mono uppercase chip, per the design's flowState. Underscores in the
            status enum (`pending_approval`) read as words, not as a key. */}
        <span className="shrink-0 rounded px-[7px] py-[3px] font-mono text-[10px] uppercase tracking-[0.08em] bg-[var(--smoke-300)] text-[var(--smoke-600)]">
          {(workflow.status || 'draft').replace(/_/g, ' ')}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs text-muted-foreground"
          onClick={() => setShowDetailsSheet(true)}
        >
          Details
        </Button>
      </div>

      {(state.dirty || metaDirty) && (
        <span className="text-xs text-[var(--warning)] font-medium">
          Unsaved changes
        </span>
      )}

      <div className="flex items-center gap-2">
        {/* I7: below 1180px the palette and inspector live in Sheets with no
            way to open them. These triggers are the fix. */}
        {!isAbove1180 && (
          <>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setShowPaletteSheet(true)}
              title="Steps"
              aria-label="Open step palette"
            >
              <PanelLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setShowInspectorSheet(true)}
              title="Inspector"
              aria-label="Open step inspector"
            >
              <PanelRight className="size-4" />
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTestRunPanel(!showTestRunPanel)}
          className="text-xs"
        >
          Test run
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHistoryPanel(true)}
          className="text-xs"
        >
          History
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            updateWorkflow(workflow.id, {
              ...meta,
              nodes: state.nodes,
              edges: state.edges,
              startNodeId: state.startNodeId,
            }).then((res) => {
              if (res?.success) setMetaDirty(false)
              reportSaveResult(res)
            })
          }
          className="text-xs"
        >
          Save
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={validation.errors.length > 0}
          title={validation.errors.length > 0 ? validation.errors[0].message : ''}
          onClick={handlePublish}
          className="text-xs"
        >
          Publish
        </Button>

        {/* C2: the checker half of maker-checker. Only reachable at all when
            a publish is actually awaiting a second person's sign-off. */}
        {workflow.status === 'pending_approval' && (
          <Button
            variant="default"
            size="sm"
            onClick={handleApprove}
            className="text-xs"
          >
            Approve
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowArchiveDialog(true)}
          className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          Archive
        </Button>
      </div>
    </header>
  )

  // I5: validation is computed live but had no visible surface — a disabled
  // Publish button plus a native `title` that a disabled button's CSS
  // (`disabled:pointer-events-none`) prevents from ever showing. This panel
  // is that surface. Errors and warnings get their own icon AND their own
  // heading text, not just colour, so the distinction survives greyscale.
  const validationBanner = (validation.errors.length > 0 || validation.warnings.length > 0) && (
    <div className="border-b border-border bg-card px-4 py-2 space-y-2">
      {hasSteps && validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            {validation.errors.length} error{validation.errors.length === 1 ? '' : 's'} — must be fixed before publishing
          </AlertTitle>
          <AlertDescription>
            <ul className="max-h-24 overflow-y-auto list-disc pl-4">
              {validation.errors.map((e, i) => (
                <li key={`${e.code}-${e.nodeId ?? i}`}>{e.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {hasSteps && validation.warnings.length > 0 && (
        <Alert>
          <Info />
          <AlertTitle>
            {validation.warnings.length} warning{validation.warnings.length === 1 ? '' : 's'}
          </AlertTitle>
          <AlertDescription>
            <ul className="max-h-24 overflow-y-auto list-disc pl-4">
              {validation.warnings.map((w, i) => (
                <li key={`${w.code}-${w.nodeId ?? i}`}>{w.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )

  const canvas = (
    <div className="flex-1 relative">
      <WorkflowCanvas
        nodes={state.nodes}
        edges={state.edges}
        selectedId={state.selectedId}
        startNodeId={state.startNodeId}
        onSelect={handleNodeSelect}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onDeleteEdge={handleDeleteEdge}
      />
      {!hasSteps && (
        // An empty canvas with no guidance is its own dead end. This is where
        // the "add a step" instruction belongs — next to the empty space it
        // is talking about, not in a red banner at the top of the page.
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto max-w-sm rounded-xl border border-[var(--border)] bg-card px-6 py-5 text-center shadow-sm">
            <div className="text-sm font-semibold text-[var(--heading)]">
              This workflow has no steps yet
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--mute-200)]">
              Add one from the palette to begin. The first step you add becomes
              the start of the flow — you can change that later from any step.
            </p>
            <Button size="sm" className="mt-3 gap-1.5" onClick={() => handleAddNode('level')}>
              <Plus className="w-4 h-4" />
              Add first step
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  const palette = <StepPalette onAdd={handleAddNode} />

  const inspector = showTestRunPanel ? (
    <TestRunPanel
      graph={{ nodes: state.nodes, edges: state.edges, startNodeId: state.startNodeId }}
      onClose={() => setShowTestRunPanel(false)}
    />
  ) : (
    <StepInspector
      node={selectedNode}
      startNodeId={state.startNodeId}
      onPatch={handleNodePatch}
      onRemove={handleNodeRemove}
      onClearEdges={handleClearEdges}
      onSetStart={handleSetStart}
    />
  )

  const shell = isAbove1180 ? (
    // Desktop: flex columns of 208px, 1fr, 330px
    <div className="flex gap-0 h-full">
      <div className="w-52 flex-shrink-0 bg-card border-r border-border overflow-y-auto">
        {palette}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {header}
        {validationBanner}
        {canvas}
      </div>
      <div className="w-80 flex-shrink-0 bg-card overflow-y-auto">
        {inspector}
      </div>
    </div>
  ) : (
    // Mobile: palette and inspector in Sheets
    <div className="flex flex-col h-full">
      {header}
      {validationBanner}
      <div className="flex-1 relative min-w-0">
        {canvas}

        {/* Palette sheet trigger */}
        <Sheet open={showPaletteSheet} onOpenChange={setShowPaletteSheet}>
          <SheetContent side="left" className="w-64 p-0">
            {/* Close on add: the sheet covers the canvas, so leaving it open
                hides the very node the click just created — which reads as
                "nothing happened". */}
            <StepPalette
              onAdd={(typeKey) => {
                handleAddNode(typeKey)
                setShowPaletteSheet(false)
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Inspector sheet trigger */}
        <Sheet open={showInspectorSheet} onOpenChange={setShowInspectorSheet}>
          <SheetContent side="right" className="w-80 p-0">
            {inspector}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )

  return (
    <>
      {/* Not h-screen. This page renders INSIDE the client dashboard chrome,
          so a full 100vh box starts below that chrome and its bottom edge
          falls off the screen — taking the canvas's bottom-right zoom stack
          (+ / % / − / FIT) with it.

          The subtraction is the chrome above and below us:
            SiteHeader     4rem  (h-(--header-height) is 3rem, but py-8 adds
                                  4rem of padding, and border-box makes the
                                  larger value win — it renders 64px)
            wrapper py-4   1rem top + 1rem bottom   (mobile)
            wrapper md:py-8  2rem top + 2rem bottom (md and up)
          If app/dashboard/client/layout.js changes that padding, change it
          here too. */}
      <div className="h-[calc(100svh-6rem)] md:h-[calc(100svh-8rem)] w-full flex flex-col bg-muted">
        {shell}
      </div>

      <VersionHistory
        workflowId={workflow.id}
        open={showHistoryPanel}
        onOpenChange={setShowHistoryPanel}
      />

      {/* Workflow-level details. Classification is not decoration: `category`
          drives the gallery filter, so a workflow left on the default is one
          nobody can narrow down to later. */}
      <Sheet open={showDetailsSheet} onOpenChange={setShowDetailsSheet}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>Workflow details</SheetTitle>
            <SheetDescription>
              Saved with the rest of your changes. Editing these does not affect
              the graph or its approval.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4">
            <div>
              <label htmlFor="wf-name" className="mb-1.5 block text-xs text-[var(--mute-200)]">Name</label>
              <Input
                id="wf-name"
                value={meta.name}
                onChange={(e) => patchMeta({ name: e.target.value })}
                placeholder="Untitled workflow"
              />
            </div>

            <div>
              <label htmlFor="wf-desc" className="mb-1.5 block text-xs text-[var(--mute-200)]">Description</label>
              <Textarea
                id="wf-desc"
                rows={4}
                value={meta.description}
                onChange={(e) => patchMeta({ description: e.target.value })}
                placeholder="What this workflow is for, and when it runs."
              />
              <p className="mt-1.5 text-xs text-[var(--txt-mute)]">Shown on the workflow&apos;s gallery card.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[var(--mute-200)]">Category</label>
              <Select value={meta.category} onValueChange={(v) => patchMeta({ category: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-[var(--txt-mute)]">Drives the gallery filter.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[var(--mute-200)]">Applies to</label>
              <Select value={meta.appliesTo} onValueChange={(v) => patchMeta({ appliesTo: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPLIES_TO.map((a) => (
                    <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive workflow</AlertDialogTitle>
            <AlertDialogDescription>
              This workflow will no longer be active. A reason is required for the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            placeholder="Why is this workflow being archived?"
            value={archiveReason}
            onChange={(e) => setArchiveReason(e.target.value)}
            className="w-full p-2 border border-border rounded text-sm"
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-destructive hover:bg-destructive/90">
              Archive
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
