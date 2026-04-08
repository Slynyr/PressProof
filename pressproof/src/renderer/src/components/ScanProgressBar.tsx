import type { PipelineState } from '../hooks/usePipeline'

interface Props {
  state: PipelineState
  onCancel: () => void
}

export function ScanProgressBar({ state, onCancel }: Props) {
  const progress = state.totalPages > 0
    ? Math.round((state.pagesCompleted / state.totalPages) * 100)
    : 0

  return (
    <div className="border-t border-border bg-surface/95 backdrop-blur-sm px-6 py-3">
      {/* Top row: info + cancel */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-accent animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium text-text-primary">
            Scanning {state.bookTitle || '...'}
          </span>
          {state.currentPageTitle && (
            <span className="text-xs text-text-muted truncate max-w-xs">
              — {state.currentPageTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Running totals */}
          <div className="flex items-center gap-3 text-xs">
            {state.summary.critical > 0 && (
              <span className="flex items-center gap-1 text-critical">
                <span className="w-1.5 h-1.5 rounded-full bg-critical" />
                {state.summary.critical}
              </span>
            )}
            {state.summary.warnings > 0 && (
              <span className="flex items-center gap-1 text-warning">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                {state.summary.warnings}
              </span>
            )}
            {state.summary.note > 0 && (
              <span className="flex items-center gap-1 text-info">
                <span className="w-1.5 h-1.5 rounded-full bg-info" />
                {state.summary.note}
              </span>
            )}
          </div>

          <span className="text-xs text-text-secondary">
            {state.pagesCompleted}/{state.totalPages} pages
          </span>
          <span className="text-xs font-semibold text-text-primary">{progress}%</span>

          <button
            onClick={onCancel}
            className="text-xs text-text-muted hover:text-red-400 transition-colors px-2 py-1 border border-border rounded hover:border-red-500/40"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
