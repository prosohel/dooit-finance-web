'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OPERATORS } from '../../../lib/variableCatalog'
import SectionLabel from '../SectionLabel'
import AddButton from '../AddButton'

/**
 * Branches section: condition nodes only.
 * Each branch has:
 * - label
 * - condition rows (field + operator + value)
 * - "Add condition" button
 * - remove button (disabled on Else)
 *
 * There is no "Then" target-node field here: WorkflowBranchSchema has no
 * `then` field, so one used to be shown but silently stripped on every save
 * (I1). Branch routing is a real edge — from this branch's handle on the
 * canvas — not a select in this panel. Drag a connector from the branch's
 * source handle (rendered on the card, see StepNode.jsx) to route it.
 */
export default function Branches({ node, onPatch }) {
  const branches = node.branches || []

  const handleAddBranch = () => {
    // Keep Else last: a trailing Else is what COND_NO_ELSE checks for, and an
    // unconditional branch anywhere but last swallows the branches after it.
    const elseIdx = branches.findIndex((b) => (b.label || '').trim().toLowerCase() === 'else')
    const insertAt = elseIdx === -1 ? branches.length : elseIdx
    // Keys must stay unique even after removals, so derive from the max in use.
    const used = branches.map((b) => Number(String(b.key).replace(/^b/, '')) || 0)
    const nextKey = `b${Math.max(0, ...used) + 1}`
    const fresh = {
      key: nextKey,
      label: `Branch ${insertAt + 1}`,
      logic: 'AND',
      // Never empty: an unconditional non-last branch is a validation error.
      conditions: [{ field: 'applicant.type', operator: 'eq', value: 'individual' }],
    }
    const next = [...branches.slice(0, insertAt), fresh, ...branches.slice(insertAt)]
    onPatch({ branches: next })
  }

  const handleUpdateBranch = (index, key, val) => {
    const newBranches = branches.map((b, i) =>
      i === index ? { ...b, [key]: val } : b
    )
    onPatch({ branches: newBranches })
  }

  const handleRemoveBranch = (index) => {
    // Cannot remove Else branch (last one)
    if (index === branches.length - 1) return
    const newBranches = branches.filter((_, i) => i !== index)
    onPatch({ branches: newBranches })
  }

  const handleAddCondition = (branchIndex) => {
    const newBranches = branches.map((b, i) =>
      i === branchIndex
        ? { ...b, conditions: [...(b.conditions || []), { field: '', operator: 'eq', value: '' }] }
        : b
    )
    onPatch({ branches: newBranches })
  }

  const handleUpdateCondition = (branchIndex, condIndex, key, val) => {
    const newBranches = branches.map((b, i) =>
      i === branchIndex
        ? {
            ...b,
            conditions: (b.conditions || []).map((c, j) =>
              j === condIndex ? { ...c, [key]: val } : c
            ),
          }
        : b
    )
    onPatch({ branches: newBranches })
  }

  const handleRemoveCondition = (branchIndex, condIndex) => {
    const newBranches = branches.map((b, i) =>
      i === branchIndex
        ? {
            ...b,
            conditions: (b.conditions || []).filter((_, j) => j !== condIndex),
          }
        : b
    )
    onPatch({ branches: newBranches })
  }

  const isElse = (label) => (label || '').trim().toLowerCase() === 'else'

  return (
    <>
      {/* The design puts "Add branch" flush right on the heading row, not
          below the list — with several branch cards stacked up, a button at
          the bottom is a long way from the thing it adds to. */}
      <SectionLabel action={<AddButton onClick={handleAddBranch}>Add branch</AddButton>}>
        Branches
      </SectionLabel>

      {branches.map((branch, branchIdx) => (
        <div
          key={branch.key}
          className="mb-2 space-y-3 rounded-[9px] border border-[var(--wf-card-border)] bg-card p-[10px_11px]"
        >
          <div className="flex items-center gap-2">
            <Input
              placeholder="Branch label"
              value={branch.label || ''}
              onChange={(e) => handleUpdateBranch(branchIdx, 'label', e.target.value)}
              className="flex-1 text-sm"
              disabled={isElse(branch.label)}
            />
            {!isElse(branch.label) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveBranch(branchIdx)}
                className="px-2 text-muted-foreground hover:text-destructive"
              >
                ×
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {(branch.conditions || []).map((cond, condIdx) => (
              <div key={condIdx} className="flex gap-2 items-center">
                <Input
                  placeholder="Field (e.g., applicant.type)"
                  value={cond.field || ''}
                  onChange={(e) => handleUpdateCondition(branchIdx, condIdx, 'field', e.target.value)}
                  className="flex-1 text-xs"
                />
                <Select value={cond.operator || 'eq'} onValueChange={(v) => handleUpdateCondition(branchIdx, condIdx, 'operator', v)}>
                  <SelectTrigger className="w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Value"
                  value={cond.value || ''}
                  onChange={(e) => handleUpdateCondition(branchIdx, condIdx, 'value', e.target.value)}
                  className="flex-1 text-xs"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCondition(branchIdx, condIdx)}
                  className="px-2 text-muted-foreground hover:text-destructive"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddCondition(branchIdx)}
            className="text-xs w-full"
          >
            Add condition
          </Button>
        </div>
      ))}

    </>
  )
}
