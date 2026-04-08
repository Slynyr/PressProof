import type { PipelineState } from '../hooks/usePipeline'

interface Props {
  state: PipelineState
  onCancel: () => void
}

export function ProgressScreen({ state, onCancel }: Props) {
  const progress = state.totalPages > 0
    ? Math.round((state.pagesCompleted / state.totalPages) * 100)
    : 0

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-full max-w-xl p-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Scanning in Progress</h1>
            {state.bookTitle && (
              <p className="text-sm text-text-secondary">{state.bookTitle}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-secondary">
              Page {state.pagesCompleted} of {state.totalPages}
            </span>
            <span className="text-text-primary font-semibold">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current page */}
        {state.currentPageTitle && (
          <div className="bg-surface border border-border rounded-lg px-4 py-3 mb-4">
            <span className="text-xs text-text-muted uppercase tracking-wider">Currently scanning</span>
            <p className="text-sm text-text-primary truncate mt-0.5">{state.currentPageTitle}</p>
          </div>
        )}

        {/* Running totals */}
        <div className="flex gap-3 mb-6">
          <StatPill label="Critical" count={state.summary.critical} color="bg-critical/20 text-critical" />
          <StatPill label="Warnings" count={state.summary.warnings} color="bg-warning/20 text-warning" />
          <StatPill label="Notes" count={state.summary.note} color="bg-info/20 text-info" />
        </div>

        {/* Live log */}
        <div className="bg-surface border border-border rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Activity Log</h3>
          {state.log.length === 0 && (
            <p className="text-sm text-text-muted">Waiting for events...</p>
          )}
          {state.log.slice().reverse().map((evt, i) => (
            <LogEntry key={i} event={evt} />
          ))}
        </div>

        {/* Errors */}
        {state.errors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">Errors</h3>
            {state.errors.map((err, i) => (
              <p key={i} className="text-sm text-red-300 mb-1">{err}</p>
            ))}
          </div>
        )}

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="w-full border border-border rounded-lg px-4 py-3 text-text-secondary hover:text-text-primary hover:border-red-500/50 transition-colors"
        >
          Cancel Scan
        </button>
      </div>
    </div>
  )
}

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${color}`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      {count} {label}
    </div>
  )
}

function LogEntry({ event }: { event: import('@shared/types').PipelineEvent }) {
  switch (event.type) {
    case 'discovery':
      return <p className="text-xs text-text-secondary mb-1">Discovered {event.totalPages} pages in "{event.bookTitle}"</p>
    case 'page_start':
      return <p className="text-xs text-text-secondary mb-1">Scanning page {event.page}: {event.title}</p>
    case 'page_complete':
      return <p className="text-xs text-text-secondary mb-1">Page {event.page} complete — {event.issuesFound} issue(s)</p>
    case 'issue_found':
      return (
        <p className="text-xs mb-1">
          <span className={event.issue.severity === 'critical' ? 'text-critical' : event.issue.severity === 'warning' ? 'text-warning' : 'text-note'}>
            [{event.issue.severity.toUpperCase()}]
          </span>
          <span className="text-text-secondary ml-1">{event.issue.description}</span>
        </p>
      )
    case 'error':
      return <p className="text-xs text-red-400 mb-1">{event.message}</p>
    case 'complete':
      return <p className="text-xs text-green-400 mb-1">Scan complete! {event.summary.total} issue(s) found.</p>
    default:
      return null
  }
}
