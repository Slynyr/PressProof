import { useState, useMemo, useCallback } from 'react'
import type { ScanResult, ProofreadingIssue } from '@shared/types'
import type { PipelineState } from '../hooks/usePipeline'
import { SeverityBadge } from './SeverityBadge'
import { IssueDetailPanel } from './IssueDetailPanel'
import { BulkActionBar } from './BulkActionBar'
import { ScanProgressBar } from './ScanProgressBar'

interface Props {
  scan: ScanResult | null
  pipelineState: PipelineState
  onNewScan: () => void
  onExport: (id: string, format: 'json' | 'csv') => void
  onUpdateIssues: (issueIds: string[], status: 'open' | 'ignored' | 'resolved') => void
  onCancelScan: () => void
  onRetryFailed: () => void
}

type CategoryFilter = 'All' | ProofreadingIssue['category']
type SortField = 'severity' | 'status' | null
type SortDir = 'asc' | 'desc'

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, note: 2 }
const STATUS_ORDER: Record<string, number> = { open: 0, resolved: 1, ignored: 2 }

function cycleStatus(current: ProofreadingIssue['status']): ProofreadingIssue['status'] {
  if (current === 'open') return 'resolved'
  if (current === 'resolved') return 'ignored'
  return 'open'
}

export function AuditConsole({ scan, pipelineState, onNewScan, onExport, onUpdateIssues, onCancelScan, onRetryFailed }: Props) {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All')
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'note'>('all')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(field: SortField) {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortField(null); setSortDir('asc') }  // third click clears
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const isScanning = pipelineState.isRunning

  // Use finalized scan issues if available, otherwise live pipeline issues
  const issues = scan?.issues ?? pipelineState.issues
  const summary = scan?.summary ?? pipelineState.summary
  const bookTitle = scan?.bookTitle ?? (pipelineState.bookTitle || 'Scanning...')

  const filteredIssues = useMemo(() => {
    let filtered = issues
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(i => i.category === categoryFilter)
    }
    if (severityFilter !== 'all') {
      filtered = filtered.filter(i => i.severity === severityFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(i =>
        i.description.toLowerCase().includes(q) ||
        i.originalText.toLowerCase().includes(q) ||
        i.chapter.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      )
    }
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const orderMap = sortField === 'severity' ? SEVERITY_ORDER : STATUS_ORDER
        const diff = (orderMap[a[sortField]] ?? 99) - (orderMap[b[sortField]] ?? 99)
        return sortDir === 'asc' ? diff : -diff
      })
    }
    return filtered
  }, [issues, categoryFilter, severityFilter, searchQuery, sortField, sortDir])

  const selectedIssue = selectedIssueId
    ? issues.find(i => i.id === selectedIssueId) ?? null
    : null

  const allSelected = filteredIssues.length > 0 && filteredIssues.every(i => selectedIds.has(i.id))

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredIssues.map(i => i.id)))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkAction(status: 'ignored' | 'resolved') {
    onUpdateIssues(Array.from(selectedIds), status)
    setSelectedIds(new Set())
  }

  function handleCycleStatus(issue: ProofreadingIssue) {
    const next = cycleStatus(issue.status)
    onUpdateIssues([issue.id], next)
  }

  const categories: CategoryFilter[] = ['All', 'Spelling', 'Grammar', 'Formatting', 'Consistency', 'Reference', 'Other']

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex flex-col gap-5 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Audit Console</h1>
              <p className="text-xs text-text-secondary">{bookTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {scan && (
              <button
                onClick={() => onExport(scan.id, 'json')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Audit
              </button>
            )}
            <button
              onClick={onNewScan}
              className="px-4 py-1.5 text-sm font-semibold bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
            >
              Run New Scan
            </button>
          </div>
        </div>

        {/* Stats + filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-surface">
              <span className="text-text-muted">Total</span>
              <span className="font-bold text-white">{summary.total.toLocaleString()}</span>
            </div>
            <button
              onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${severityFilter === 'critical' ? 'bg-critical/20 border-critical/40 text-critical' : 'border-border text-critical/80 hover:bg-critical/10'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-critical" />
              {summary.critical} Critical
            </button>
            <button
              onClick={() => setSeverityFilter(severityFilter === 'warning' ? 'all' : 'warning')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${severityFilter === 'warning' ? 'bg-warning/20 border-warning/40 text-warning' : 'border-border text-warning/80 hover:bg-warning/10'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              {summary.warnings} Warnings
            </button>
            <button
              onClick={() => setSeverityFilter(severityFilter === 'note' ? 'all' : 'note')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${severityFilter === 'note' ? 'bg-info/20 border-info/40 text-info' : 'border-border text-info/80 hover:bg-info/10'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-info" />
              {summary.note} Notes
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter book errors..."
                className="bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors w-56"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}
              className="appearance-none bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error / warning banner */}
      {!isScanning && <ScanErrorBanner scan={scan} pipelineErrors={pipelineState.errors} onRetryFailed={onRetryFailed} />}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Issue table */}
        <div className="flex-1 overflow-y-auto">
          {/* Table header */}
          <div className="sticky top-0 bg-background border-b border-border px-6 py-3 flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-text-muted z-10">
            <div className="w-8 flex-shrink-0">
              <Checkbox checked={allSelected} onChange={toggleSelectAll} />
            </div>
            <button onClick={() => toggleSort('status')} className="w-20 flex-shrink-0 flex items-center gap-1 hover:text-text-secondary transition-colors cursor-pointer">
              Status
              <SortArrow field="status" activeField={sortField} dir={sortDir} />
            </button>
            <button onClick={() => toggleSort('severity')} className="w-24 flex-shrink-0 flex items-center gap-1 hover:text-text-secondary transition-colors cursor-pointer">
              Severity
              <SortArrow field="severity" activeField={sortField} dir={sortDir} />
            </button>
            <div className="flex-1">Error Description</div>
            <div className="w-28 flex-shrink-0">Category</div>
            <div className="w-40 flex-shrink-0">Chapter</div>
          </div>

          {/* Issue rows */}
          {filteredIssues.map(issue => (
            <IssueRow
              key={issue.id}
              issue={issue}
              isSelected={selectedIds.has(issue.id)}
              isActive={selectedIssueId === issue.id}
              onToggleSelect={() => toggleSelect(issue.id)}
              onClick={() => setSelectedIssueId(issue.id)}
              onCycleStatus={() => handleCycleStatus(issue)}
            />
          ))}

          {filteredIssues.length === 0 && (
            <div className="flex items-center justify-center h-40 text-text-muted text-sm">
              {isScanning
                ? 'Waiting for issues to be discovered...'
                : searchQuery || categoryFilter !== 'All' || severityFilter !== 'all'
                  ? 'No issues match the current filters.'
                  : scan?.status === 'error'
                    ? 'Scan failed before any issues could be detected. Check the errors above.'
                    : scan?.status === 'incomplete'
                      ? 'Some pages could not be scanned. Results may be incomplete.'
                      : 'No issues found in this scan.'}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedIssue && (
          <IssueDetailPanel
            issue={selectedIssue}
            issueNumber={issues.indexOf(selectedIssue) + 1}
            onClose={() => setSelectedIssueId(null)}
            onUpdateStatus={(status) => onUpdateIssues([selectedIssue.id], status)}
          />
        )}
      </div>

      {/* Scan progress bar overlay (bottom) */}
      {isScanning && (
        <ScanProgressBar state={pipelineState} onCancel={onCancelScan} />
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && !isScanning && (
        <BulkActionBar
          count={selectedIds.size}
          onBulkIgnore={() => handleBulkAction('ignored')}
          onResolveSelected={() => handleBulkAction('resolved')}
          onDismiss={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  )
}

function StatusIndicator({ status, onClick }: { status: ProofreadingIssue['status']; onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className="w-5 h-5 flex items-center justify-center rounded-full transition-colors"
      title={`${status} — click to change`}
    >
      {status === 'open' && (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-text-muted" />
      )}
      {status === 'resolved' && (
        <svg className="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {status === 'ignored' && (
        <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      )}
    </button>
  )
}

function IssueRow({ issue, isSelected, isActive, onToggleSelect, onClick, onCycleStatus }: {
  issue: ProofreadingIssue
  isSelected: boolean
  isActive: boolean
  onToggleSelect: () => void
  onClick: () => void
  onCycleStatus: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-6 py-3.5 border-b border-border/50 cursor-pointer transition-colors hover:bg-surface/50 ${isActive ? 'bg-surface/70 border-l-2 border-l-accent' : ''} ${issue.status !== 'open' ? 'opacity-40' : ''}`}
    >
      <div className="w-8 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onChange={onToggleSelect} />
      </div>
      <div className="w-20 flex-shrink-0">
        <StatusIndicator status={issue.status} onClick={onCycleStatus} />
      </div>
      <div className="w-24 flex-shrink-0">
        <SeverityBadge severity={issue.severity} />
      </div>
      <div className="flex-1 text-sm text-text-primary truncate">
        {issue.description}
      </div>
      <div className="w-28 flex-shrink-0 text-xs text-text-muted">
        {issue.category}
      </div>
      <div className="w-40 flex-shrink-0 text-xs text-text-muted truncate">
        {issue.chapter}
      </div>
    </div>
  )
}

function ScanErrorBanner({ scan, pipelineErrors, onRetryFailed }: { scan: ScanResult | null; pipelineErrors: string[]; onRetryFailed: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const toggle = useCallback(() => setExpanded(v => !v), [])

  // Use persisted errors from scan result, fall back to live pipeline errors
  const errors = scan?.errors?.length ? scan.errors : pipelineErrors
  const status = scan?.status
  const failedCount = scan?.failedPages?.length ?? 0

  if (errors.length === 0 && status !== 'error' && status !== 'incomplete') return null

  const isFatal = status === 'error'
  const pagesScanned = scan?.pagesScanned ?? 0
  const totalPages = scan?.totalPages ?? 0
  const skippedPages = totalPages - pagesScanned

  return (
    <div className={`border-b px-6 py-3 ${isFatal ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`mt-0.5 flex-shrink-0 ${isFatal ? 'text-red-400' : 'text-amber-400'}`}>
          {isFatal ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isFatal ? 'text-red-300' : 'text-amber-300'}`}>
            {isFatal
              ? 'Scan failed — results may be missing or incomplete'
              : `Scan completed with issues — ${skippedPages} of ${totalPages} page${skippedPages !== 1 ? 's' : ''} could not be scanned`}
          </p>

          <div className="flex items-center gap-3 mt-1">
            {errors.length > 0 && (
              <button
                onClick={toggle}
                className={`text-xs underline underline-offset-2 ${isFatal ? 'text-red-400/70 hover:text-red-400' : 'text-amber-400/70 hover:text-amber-400'} transition-colors`}
              >
                {expanded ? 'Hide details' : `Show ${errors.length} error${errors.length !== 1 ? 's' : ''}`}
              </button>
            )}

            {failedCount > 0 && (
              <button
                onClick={onRetryFailed}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry {failedCount} failed page{failedCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>

          {expanded && (
            <ul className="mt-2 space-y-1">
              {errors.map((err, i) => (
                <li key={i} className={`text-xs ${isFatal ? 'text-red-400/80' : 'text-amber-400/80'}`}>
                  {err}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-150 ${
        checked
          ? 'bg-accent shadow-[0_0_8px_rgba(124,58,237,0.3)]'
          : 'border-2 border-border hover:border-text-muted bg-transparent'
      }`}
    >
      {checked && (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  )
}

function SortArrow({ field, activeField, dir }: { field: SortField; activeField: SortField; dir: SortDir }) {
  if (activeField !== field) {
    // Subtle neutral arrows when inactive
    return (
      <svg className="w-3 h-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  }
  return dir === 'asc' ? (
    <svg className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
