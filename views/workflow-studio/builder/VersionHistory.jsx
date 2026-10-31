'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { getWorkflowVersions } from '@/app/dashboard/client/workflow-studio/actions'

/**
 * VersionHistory displays a read-only history of workflow versions.
 * Each entry shows the version, who changed it, when, and what changed.
 * Restoring a version is not implemented, so no restore button is offered.
 */
export default function VersionHistory({ workflowId, open, onOpenChange }) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !workflowId) return

    const fetchVersions = async () => {
      setLoading(true)
      try {
        const res = await getWorkflowVersions(workflowId)
        if (res.success && res.data) {
          // Sort newest first
          const sorted = [...res.data].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
          setVersions(sorted)
        }
      } catch (err) {
        console.error('Failed to fetch versions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchVersions()
  }, [open, workflowId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:max-w-sm p-0">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="text-sm">Workflow history</SheetTitle>
        </SheetHeader>

        {/* Scrollable versions list */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <div className="text-xs text-muted-foreground text-center py-8">Loading versions...</div>
          )}

          {!loading && versions.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">No versions yet.</div>
          )}

          {!loading && versions.length > 0 && (
            <div className="space-y-3">
              {versions.map((ver, idx) => (
                <div key={`${ver.version}-${idx}`} className="border border-border rounded p-3">
                  {/* Version header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-foreground">
                      Version {ver.version}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ver.createdAt), { addSuffix: true })}
                    </div>
                  </div>

                  {/* Changed by */}
                  {ver.changedBy && (
                    <div className="text-xs text-muted-foreground mb-2">
                      by{' '}
                      {ver.changedBy.name ||
                        ver.changedBy.email ||
                        'Unknown'}
                    </div>
                  )}

                  {/* Changed paths as badges */}
                  {ver.changedPaths && ver.changedPaths.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ver.changedPaths.map((path, pidx) => (
                        <Badge key={`${path}-${pidx}`} variant="outline" className="text-[0.65rem]">
                          {path}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
