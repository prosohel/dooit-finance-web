'use client'

// Template gallery — the landing page of Workflow Studio.
//
// Data flow: `page.js` (a server component) fetches the list and hands it
// down as props. This component never fetches on its own — filter changes
// push a new URL, which re-renders the server component with new
// searchParams and refetches there. See the project's server-first
// convention notes; a client useEffect fetch loop here would fight that.

import { useCallback, useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import moment from 'moment'
import { toast } from 'sonner'
import { Plus, Copy, X, Loader2, AlertCircle } from 'lucide-react'

import { PageHeader, PageTitle, PageDescription } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import { stepType, STEP_TYPE_ORDER } from '../lib/stepTypes'
import {
  duplicateWorkflow,
  createWorkflow,
} from '@/app/dashboard/client/workflow-studio/actions'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BASE_PATH = '/dashboard/client/workflow-studio'

const CATEGORIES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'screening', label: 'Screening' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'reporting', label: 'Reporting' },
]

// Badge variant carries colour; `label` always carries the same information
// as text, so status is never colour-only.
const STATUSES = [
  { value: 'draft', label: 'Draft', variant: 'outline' },
  { value: 'pending_approval', label: 'Pending approval', variant: 'warning' },
  { value: 'active', label: 'Active', variant: 'success' },
  { value: 'paused', label: 'Paused', variant: 'secondary' },
  { value: 'archived', label: 'Archived', variant: 'muted' },
]

const statusMeta = (status) =>
  STATUSES.find((s) => s.value === status) ||
  { value: status, label: status || 'Unknown', variant: 'outline' }

// ─────────────────────────────────────────────────────────────────────────────
// Preview strip — decorative only. The list endpoint never sends node types,
// only nodeCount/conditionCount, so this cannot (and must not pretend to)
// reflect the real graph. Colours are pulled from the same step-type
// registry the builder uses, never invented locally.
// ─────────────────────────────────────────────────────────────────────────────

const PREVIEW_COLORS = STEP_TYPE_ORDER.map((k) => stepType(k).colorVar)
const BAR_HEIGHTS = [26, 42, 32, 48, 22, 38, 28, 44]

function PreviewStrip({ nodeCount }) {
  const hasNodes = nodeCount > 0
  const count = hasNodes ? Math.min(nodeCount, 8) : 3
  return (
    <div className="h-[92px] rounded-lg border bg-muted/40 flex items-center gap-1.5 px-3 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${BAR_HEIGHTS[i % BAR_HEIGHTS.length]}px`,
            background: hasNodes ? `var(${PREVIEW_COLORS[i % PREVIEW_COLORS.length]})` : 'var(--border)',
            opacity: hasNodes ? 0.85 : 0.6,
          }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function WorkflowGallery({ workflows = [], total = 0, error = null }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [duplicatingId, setDuplicatingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const searchTimer = useRef(null)

  const category = searchParams.get('category') || ''
  const status = searchParams.get('status') || ''
  const hasFilters = Boolean(search || category || status)

  // Push a patched query string. This is a navigation (router.replace), so
  // page.js re-runs on the server with the new searchParams — filtering
  // happens there, never client-side.
  const pushQuery = useCallback((patch) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(patch).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearch(value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => pushQuery({ search: value }), 400)
  }

  const clearFilters = () => {
    setSearch('')
    router.replace(pathname, { scroll: false })
  }

  // ── "Use this template" — duplicate, then open the copy ──────────────────
  const handleUseTemplate = async (e, workflow) => {
    e.stopPropagation() // the card itself navigates on click; this button must not also do that
    setDuplicatingId(workflow._id)
    try {
      const res = await duplicateWorkflow(workflow._id)
      if (res?.success) {
        router.push(`${BASE_PATH}/${res.data._id}`)
      } else {
        toast.error(res?.message || 'Could not create a copy of this template')
        setDuplicatingId(null)
      }
    } catch {
      toast.error('Could not create a copy of this template')
      setDuplicatingId(null)
    }
  }

  // ── New workflow — create a blank draft, then open it ─────────────────────
  const handleNewWorkflow = async () => {
    setCreating(true)
    try {
      const res = await createWorkflow({ name: 'Untitled workflow' })
      if (res?.success) {
        router.push(`${BASE_PATH}/${res.data._id}`)
      } else {
        toast.error(res?.message || 'Could not create a new workflow')
        setCreating(false)
      }
    } catch {
      toast.error('Could not create a new workflow')
      setCreating(false)
    }
  }

  return (
    <div>
      <PageHeader className="flex-row items-start justify-between flex-wrap gap-3">
        <div>
          <PageTitle>Workflow Studio</PageTitle>
          <PageDescription>
            Templates for the AML/CTF lifecycle — onboarding through case closure. Open one to
            edit its steps, conditions and reviewer routing.
          </PageDescription>
        </div>
        <Button className="gap-1.5 shrink-0" onClick={handleNewWorkflow} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          New workflow
        </Button>
      </PageHeader>

      {/* ── Error state — an API failure never renders as a silent empty grid ── */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t load workflows</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && (
        <>
          {/* ── Filters — all drive the URL query; the server refetches ────── */}
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <div className="relative">
              <Input
                placeholder="Search name, ID, description…"
                value={search}
                onChange={handleSearchChange}
                className="w-[220px] sm:w-[260px] pr-7"
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => { setSearch(''); pushQuery({ search: '' }) }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Select value={category} onValueChange={(v) => pushQuery({ category: v === '__all' ? '' : v })}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all" className="text-muted-foreground">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => pushQuery({ status: v === '__all' ? '' : v })}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all" className="text-muted-foreground">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="gap-1 shrink-0" onClick={clearFilters}>
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}

            <p className="text-xs text-muted-foreground ml-auto">
              {total} workflow{total !== 1 ? 's' : ''}
            </p>
          </div>

          {/* ── Empty state ─────────────────────────────────────────────────── */}
          {workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border rounded-lg bg-muted/20">
              <h3 className="text-base font-semibold">
                {hasFilters ? 'No workflows match these filters' : 'No workflows yet'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {hasFilters
                  ? 'Try a different search term, category or status — or clear the filters to see everything again.'
                  : 'Create your first workflow, or open a system template below and use it as a starting point.'}
              </p>
              <div className="flex gap-2">
                {hasFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
                )}
                <Button size="sm" className="gap-1.5" onClick={handleNewWorkflow} disabled={creating}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  New workflow
                </Button>
              </div>
            </div>
          ) : (
            /* ── Card grid ─────────────────────────────────────────────────── */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '14px',
              }}
            >
              {workflows.map((w) => {
                // A workflow with no client is a dooit-authored system template.
                // Provenance is labelled below, never left for the reader to infer.
                const isSystem = w.client === null
                const meta = statusMeta(w.status)
                return (
                  <Card
                    key={w._id}
                    className="p-4 gap-3 cursor-pointer hover:border-primary hover:shadow-md transition-shadow"
                    onClick={() => router.push(`${BASE_PATH}/${w._id}`)}
                  >
                    <PreviewStrip nodeCount={w.nodeCount} />

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate">{w.name}</span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {isSystem && <Badge variant="info">System template</Badge>}
                    </div>

                    {w.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{w.description}</p>
                    )}

                    <p className="font-mono text-[10px] tracking-wide uppercase text-muted-foreground">
                      {w.nodeCount ?? 0} steps · {w.conditionCount ?? 0} conditions · edited {moment(w.updatedAt).fromNow()}
                    </p>

                    {isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 w-full"
                        disabled={duplicatingId === w._id}
                        onClick={(e) => handleUseTemplate(e, w)}
                      >
                        {duplicatingId === w._id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Copy className="w-3.5 h-3.5" />}
                        Use this template
                      </Button>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
