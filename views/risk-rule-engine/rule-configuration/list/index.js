'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ExternalLink,
  Download, Eye, FlaskConical, Pencil, Plus, Trash2, Upload, X,
} from 'lucide-react'
import useGetUser from '@/hooks/useGetUser'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import BackTestRunner from '@/views/risk-rule-engine/back-test/BackTestRunner'
import { PageDescription, PageHeader, PageTitle } from '@/components/common'
import {
  getAllRules,
  getRuleDomains,
  deleteRule,
  toggleRuleActive,
  toggleRuleVisibility,
  exportRulesCsv,
  importRulesCsv,
} from '@/app/dashboard/client/risk-rule-engine/rule-configuration/actions'

const CustomResizableTable = dynamic(
  () => import('@/components/ui/CustomResizable'),
  { ssr: false }
)

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BASE_PATH = '/dashboard/client/risk-rule-engine/rule-configuration'
const LIMIT = 25

const CASE_TYPES = ['Fraud', 'AML', 'Compliance', 'TF']
const RISK_LABELS = ['Low', 'Medium', 'High', 'Critical', 'Info']
const STATUSES = ['draft', 'active', 'paused', 'archived']
// Evaluation subjects in scope (account was dropped from the rule engine)
const APPLIES_TO = ['transaction', 'customer']

const RISK_VARIANT = {
  Critical: 'destructive',
  High: 'destructive',
  Medium: 'secondary',
  Low: 'outline',
  Info: 'outline',
}

const SORT_FIELDS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'ruleId', label: 'Rule ID' },
  { value: 'ruleName', label: 'Name' },
  { value: 'riskScore', label: 'Risk Score' },
  { value: 'caseType', label: 'Case Type' },
  { value: 'mainDomain', label: 'Main Domain' },
  { value: 'ruleDomainSubdomain', label: 'Sub Domain' },
  { value: 'status', label: 'Status' },
]

const EMPTY_FILTERS = {
  search: '',
  caseType: '',
  riskLabel: '',
  status: '',
  appliesTo: '',
  mainDomain: '',
  ruleDomainSubdomain: '',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const buildQS = (ruleType, f, sort, order, page) => {
  const p = new URLSearchParams()
  p.set('ruleType', ruleType)
  if (f.search) p.set('search', f.search)
  if (f.caseType) p.set('caseType', f.caseType)
  if (f.riskLabel) p.set('riskLabel', f.riskLabel)
  if (f.status) p.set('status', f.status)
  if (f.appliesTo) p.set('appliesTo', f.appliesTo)
  if (f.mainDomain) p.set('mainDomain', f.mainDomain)
  if (f.ruleDomainSubdomain) p.set('ruleDomainSubdomain', f.ruleDomainSubdomain)
  p.set('sort', sort)
  p.set('order', order)
  p.set('page', page)
  p.set('limit', LIMIT)
  return p.toString()
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function RuleConfigurationList() {
  const router = useRouter()
  const { loggedInUser } = useGetUser()
  const isDooit = loggedInUser?.userType === 'dooit'

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('system')

  // ── Data ──────────────────────────────────────────────────────────────────
  const [data, setData] = useState([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  // ── Domain options ────────────────────────────────────────────────────────
  const [mainDomainOptions, setMainDomainOptions] = useState([])
  const [subDomainOptions, setSubDomainOptions] = useState([])

  // ── Filter / sort / page ──────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [sort, setSort] = useState('createdAt')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [pendingDelete, setPendingDelete] = useState(null)
  const [backtestTarget, setBacktestTarget] = useState(null) // row shown in the back-test modal
  const importInputRef = useRef(null)
  const searchTimer = useRef(null)

  // ── Access flags ──────────────────────────────────────────────────────────
  // Who may edit/delete/toggle in the active tab?
  //   dooit  in "system" tab → can write system rules
  //   client in "client" tab → can write own rules
  const canWrite = (activeTab === 'system' && isDooit) || (activeTab === 'client' && !isDooit)

  // ── Load domain options ───────────────────────────────────────────────────
  const refreshDomains = useCallback(() => {
    getRuleDomains().then(res => {
      if (res?.success) {
        setMainDomainOptions(res.mainDomains ?? [])
        setSubDomainOptions(res.subDomains ?? [])
      }
    })
  }, [])

  useEffect(() => { refreshDomains() }, [refreshDomains])

  // ── Fetch rules ───────────────────────────────────────────────────────────
  const loadRules = useCallback(async (tab, f, s, o, p) => {
    setLoading(true)
    try {
      const res = await getAllRules(buildQS(tab, f, s, o, p))
      if (!res?.success) { toast.error(res?.message || 'Failed to load rules'); return }
      setData(Array.isArray(res.data) ? res.data : [])
      setTotalRecords(res.totalRecords ?? 0)
      setTotalPages(res.totalPages ?? 1)
    } catch (e) {
      toast.error(e?.message || 'Failed to load rules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRules(activeTab, filters, sort, order, page)
  }, [activeTab, sort, order, page]) // eslint-disable-line

  // ── Tab change ────────────────────────────────────────────────────────────
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setFilters(EMPTY_FILTERS)
    setPage(1)
    // loadRules triggered by the useEffect above via activeTab change
  }

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value }
    if (key === 'mainDomain') next.ruleDomainSubdomain = ''
    setFilters(next)
    if (key === 'search') {
      clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(
        () => { setPage(1); loadRules(activeTab, next, sort, order, 1) },
        400
      )
    } else {
      setPage(1); loadRules(activeTab, next, sort, order, 1)
    }
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
    loadRules(activeTab, EMPTY_FILTERS, sort, order, 1)
  }

  const hasFilters = Object.values(filters).some(Boolean)

  // ── Sort ──────────────────────────────────────────────────────────────────
  const applySort = (field, dir) => { setSort(field); setOrder(dir); setPage(1) }

  // ── Row actions ───────────────────────────────────────────────────────────
  const handleToggleActive = async (row, next) => {
    const newStatus = next ? 'active' : 'paused'
    setData(prev => prev.map(r => r._id === row._id ? { ...r, status: newStatus } : r))
    const res = await toggleRuleActive(row._id, next)
    if (!res?.success) {
      toast.error(res?.message || 'Update failed')
      setData(prev => prev.map(r => r._id === row._id ? { ...r, status: row.status } : r))
    }
  }

  const handleToggleVisibility = async (row, next) => {
    setData(prev => prev.map(r => r._id === row._id ? { ...r, visibleToClients: next } : r))
    const res = await toggleRuleVisibility(row._id)
    if (!res?.success) {
      toast.error(res?.message || 'Update failed')
      setData(prev => prev.map(r => r._id === row._id ? { ...r, visibleToClients: !next } : r))
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete?._id) return
    const res = await deleteRule(pendingDelete._id)
    if (res?.success) {
      toast.success(`Deleted ${pendingDelete.ruleId || 'rule'}`)
      loadRules(activeTab, filters, sort, order, page)
    } else {
      toast.error(res?.message || 'Delete failed')
    }
    setPendingDelete(null)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    const res = await exportRulesCsv()
    if (!res?.success) { toast.error(res?.message || 'Export failed'); return }
    const bytes = Uint8Array.from(atob(res.data), c => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = res.filename || 'rule-engine.csv'
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImportChange = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    const fd = new FormData(); fd.append('file', file)
    const res = await importRulesCsv(fd)
    if (res?.success) {
      toast.success(
        `Import: ${res.inserted} added, ${res.updated} updated` +
        (res.skipped ? `, ${res.skipped} skipped` : '') +
        (res.autoFilled ? `, ${res.autoFilled} auto-filled` : '')
      )
      refreshDomains()
      setPage(1); loadRules(activeTab, filters, sort, order, 1)
    } else {
      toast.error(res?.message || 'Import failed')
    }
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  // Columns are rebuilt whenever the tab or user role changes.
  const columns = useMemo(() => {
    const cols = []

    // Actions column — view + back test always; edit/delete only when canWrite
    cols.push({
      id: 'actions', header: 'Actions', size: canWrite ? 170 : 120,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" title="View"
            onClick={() => router.push(`${BASE_PATH}/${row.original._id}`)}>
            <Eye className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm"
            disabled={row.original.evaluable === false}
            title={row.original.evaluable === false
              ? 'No structured logic — cannot be backtested'
              : 'Back Test'}
            onClick={() => setBacktestTarget(row.original)}>
            <FlaskConical className="w-3 h-3" />
          </Button>
          {canWrite && (
            <>
              <Button variant="outline" size="sm" title="Edit"
                onClick={() => router.push(`${BASE_PATH}/${row.original._id}/edit`)}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="sm" title="Delete"
                onClick={() => setPendingDelete(row.original)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      ),
    })

    // Rule ID
    cols.push({
      id: 'ruleId', header: 'ID', accessorKey: 'ruleId', size: 110,
      cell: ({ row }) => (
        <button className="text-left font-mono text-xs hover:underline"
          onClick={() => router.push(`${BASE_PATH}/${row.original._id}`)}>
          {row.original.ruleId}
        </button>
      ),
    })

    // Name + description
    cols.push({
      id: 'name', header: 'Name', accessorKey: 'ruleName',
      cell: ({ row }) => (
        <button className="text-left space-y-0.5 hover:underline"
          onClick={() => router.push(`${BASE_PATH}/${row.original._id}`)}>
          <p className="font-semibold text-sm">{row.original.ruleName}</p>
          {row.original.descriptiveExplanation && (
            <p className="text-xs text-muted-foreground max-w-[360px] truncate">
              {row.original.descriptiveExplanation}
            </p>
          )}
        </button>
      ),
    })

    // Condition
    cols.push({
      id: 'condition', header: 'Condition', accessorKey: 'ruleCondition',
      cell: ({ row }) => (
        <p className="text-xs text-muted-foreground max-w-[280px] truncate">
          {row.original.ruleCondition}
        </p>
      ),
    })

    // Case type
    cols.push({ id: 'caseType', header: 'Case', accessorKey: 'caseType', size: 90 })

    // Applies to — which subject the rule evaluates (transaction / customer)
    cols.push({
      id: 'appliesTo', header: 'Applies To', accessorKey: 'appliesTo', size: 110,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs capitalize">
          {row.original.appliesTo || 'transaction'}
        </Badge>
      ),
    })

    // Risk label + score
    cols.push({
      id: 'riskLabel', header: 'Risk', accessorKey: 'riskLabel', size: 130,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant={RISK_VARIANT[row.original.riskLabel] || 'outline'}>
            {row.original.riskLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">{row.original.riskScore}</span>
        </div>
      ),
    })

    // Domain + sub-domain
    cols.push({
      id: 'mainDomain', header: 'Domain', accessorKey: 'mainDomain',
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="text-xs">{row.original.mainDomain || '—'}</p>
          {row.original.ruleDomainSubdomain && (
            <p className="text-xs text-muted-foreground">{row.original.ruleDomainSubdomain}</p>
          )}
        </div>
      ),
    })

    // Status
    cols.push({
      id: 'status', header: 'Status', accessorKey: 'status', size: 90,
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}
          className="text-xs capitalize">
          {row.original.status}
        </Badge>
      ),
    })

    // Client name — only visible to dooit on the "Client Rules" tab
    if (isDooit && activeTab === 'client') {
      cols.push({
        id: 'client', header: 'Client', accessorKey: 'client', size: 140,
        cell: ({ row }) => (
          <span className="text-xs">{row.original.client?.name || '—'}</span>
        ),
      })
    }

    // Visible to clients toggle — only dooit on the "System Rules" tab
    if (isDooit && activeTab === 'system') {
      cols.push({
        id: 'visibleToClients', header: 'Visible to Clients', size: 140,
        cell: ({ row }) => (
          <Switch
            checked={!!row.original.visibleToClients}
            onCheckedChange={v => handleToggleVisibility(row.original, v)}
            title={row.original.visibleToClients ? 'Published to clients' : 'Hidden from clients'}
          />
        ),
      })
    }

    // Active toggle — on = status:'active', off = status:'paused'
    cols.push({
      id: 'active-toggle', header: 'Active', size: 80,
      cell: ({ row }) => (
        <Switch
          checked={row.original.status === 'active'}
          disabled={!canWrite}
          title={canWrite ? undefined : 'Read only'}
          onCheckedChange={v => handleToggleActive(row.original, v)}
        />
      ),
    })

    return cols
  }, [activeTab, isDooit, canWrite]) // eslint-disable-line

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader>
        <PageTitle>Rule Configuration</PageTitle>
        <PageDescription>Manage and track risk rules</PageDescription>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">

        {/* ── Tab switcher ──────────────────────────────────────────────── */}
        <TabsList>
          <TabsTrigger value="system">
            System Rules
            {activeTab === 'system' && totalRecords > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                {totalRecords}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="client">
            Client Rules
            {activeTab === 'client' && totalRecords > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                {totalRecords}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Both tabs share the same toolbar + table layout */}
        {['system', 'client'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-3 mt-0">

            {/* ── Toolbar row 1: filters ─────────────────────────────────── */}
            <div className="flex flex-wrap gap-2 items-center">

              <div className="relative">
                <Input
                  placeholder="Search ID, name, condition…"
                  value={filters.search}
                  onChange={e => handleFilterChange('search', e.target.value)}
                  className="w-[220px] sm:w-[260px] pr-7"
                />
                {filters.search && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => handleFilterChange('search', '')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <Select value={filters.mainDomain}
                onValueChange={v => handleFilterChange('mainDomain', v === '__all' ? '' : v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Main Domain" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto max-w-[280px]">
                  <SelectItem value="__all" className="text-muted-foreground">All domains</SelectItem>
                  {mainDomainOptions.map(d => (
                    <SelectItem key={d} value={d}>
                      <span className="block truncate max-w-[240px]">{d}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.ruleDomainSubdomain}
                onValueChange={v => handleFilterChange('ruleDomainSubdomain', v === '__all' ? '' : v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sub Domain" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto max-w-[280px]">
                  <SelectItem value="__all" className="text-muted-foreground">All sub-domains</SelectItem>
                  {subDomainOptions.map(d => (
                    <SelectItem key={d} value={d}>
                      <span className="block truncate max-w-[240px]">{d}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.caseType}
                onValueChange={v => handleFilterChange('caseType', v === '__all' ? '' : v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Case Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all" className="text-muted-foreground">All types</SelectItem>
                  {CASE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.riskLabel}
                onValueChange={v => handleFilterChange('riskLabel', v === '__all' ? '' : v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Risk Label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all" className="text-muted-foreground">All labels</SelectItem>
                  {RISK_LABELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.status}
                onValueChange={v => handleFilterChange('status', v === '__all' ? '' : v)}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all" className="text-muted-foreground">All statuses</SelectItem>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.appliesTo}
                onValueChange={v => handleFilterChange('appliesTo', v === '__all' ? '' : v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Applies To" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all" className="text-muted-foreground">All subjects</SelectItem>
                  {APPLIES_TO.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" size="sm" className="gap-1 shrink-0" onClick={clearFilters}>
                  <X className="w-3.5 h-3.5" /> Clear
                </Button>
              )}
            </div>

            {/* ── Toolbar row 2: sort + actions ──────────────────────────── */}
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={sort} onValueChange={v => applySort(v, order)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_FIELDS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" className="w-9 h-9 shrink-0"
                title={order === 'desc' ? 'Descending — click for ascending' : 'Ascending — click for descending'}
                onClick={() => applySort(sort, order === 'desc' ? 'asc' : 'desc')}>
                <ArrowUpDown className="w-4 h-4" />
              </Button>

              <div className="flex-1" />

              {/* Import — only for rule owners */}
              {canWrite && (
                <>
                  <Button variant="outline" size="sm" className="gap-1 shrink-0"
                    onClick={() => importInputRef.current?.click()}>
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Import CSV</span>
                  </Button>
                  <input ref={importInputRef} type="file" accept=".csv,text/csv"
                    className="hidden" onChange={handleImportChange} />
                </>
              )}

              {/* Export — always visible */}
              <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={handleExport}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>

              {/* New Rule — only for rule owners */}
              {canWrite && (
                <Button size="sm" className="gap-1 shrink-0"
                  onClick={() => router.push(`${BASE_PATH}/create`)}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Rule</span>
                </Button>
              )}
            </div>

            {/* ── Record count ───────────────────────────────────────────── */}
            <p className="text-xs text-muted-foreground">
              {loading
                ? 'Loading…'
                : `${totalRecords} rule${totalRecords !== 1 ? 's' : ''}${totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}`
              }
            </p>

            {/* ── Responsive table ───────────────────────────────────────── */}
            <div className="w-full overflow-x-auto rounded-md border">
              <div className="min-w-[800px]">
                <CustomResizableTable
                  columns={columns}
                  data={data}
                  loading={loading}
                  tableId={`rule-configuration-${tab}-table`}
                  mainClass={`rule-configuration-${tab}-table-id`}
                />
              </div>
            </div>

            {/* ── Pagination ─────────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-1 mt-3 flex-wrap">
                <Button variant="outline" size="icon" className="h-8 w-8"
                  disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                  .reduce((acc, n, i, arr) => {
                    if (i > 0 && n - arr[i - 1] > 1) acc.push('…')
                    acc.push(n)
                    return acc
                  }, [])
                  .map((n, i) =>
                    n === '…' ? (
                      <span key={`e${i}`} className="px-2 text-sm text-muted-foreground">…</span>
                    ) : (
                      <Button key={n}
                        variant={n === page ? 'default' : 'outline'}
                        size="icon" className="h-8 w-8 text-xs"
                        onClick={() => setPage(n)} disabled={loading}>
                        {n}
                      </Button>
                    )
                  )}

                <Button variant="outline" size="icon" className="h-8 w-8"
                  disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

          </TabsContent>
        ))}
      </Tabs>

      {/* ── Back-test modal — auto-runs the selected rule in place ──────────── */}
      <Dialog open={!!backtestTarget} onOpenChange={o => !o && setBacktestTarget(null)}>
        <DialogContent className="!max-w-[min(1100px,95vw)] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <FlaskConical className="w-4 h-4 shrink-0" />
              <span className="font-mono text-sm">{backtestTarget?.ruleId}</span>
              <span className="truncate">{backtestTarget?.ruleName}</span>
              <Button variant="ghost" size="sm" className="ml-auto gap-1 text-xs font-normal"
                onClick={() =>
                  router.push(`/dashboard/client/risk-rule-engine/back-test?rule=${backtestTarget?._id}`)}>
                <ExternalLink className="w-3.5 h-3.5" /> Open full page
              </Button>
            </DialogTitle>
            <DialogDescription>
              Replaying the last 90 days of transactions — read-only, no alerts are created.
            </DialogDescription>
          </DialogHeader>
          {backtestTarget && <BackTestRunner rule={backtestTarget} autoRun />}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────────────────────── */}
      <AlertDialog open={!!pendingDelete} onOpenChange={o => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.ruleId ? `${pendingDelete.ruleId} — ${pendingDelete.ruleName}` : ''}
              <br />
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
