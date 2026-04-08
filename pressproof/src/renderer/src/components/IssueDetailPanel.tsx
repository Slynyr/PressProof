import type { ProofreadingIssue } from '@shared/types'
import { SeverityBadge } from './SeverityBadge'

interface Props {
  issue: ProofreadingIssue
  issueNumber: number
  onClose: () => void
  onUpdateStatus: (status: 'open' | 'ignored' | 'resolved') => void
}

export function IssueDetailPanel({ issue, issueNumber, onClose, onUpdateStatus }: Props) {
  const timeAgo = getTimeAgo(issue.detectedAt)

  function handleEditInPressbooks() {
    window.open(issue.pageUrl, '_blank')
  }

  function handleCopySnippet() {
    navigator.clipboard.writeText(issue.suggestedFix)
  }

  return (
    <div className="w-[420px] flex-shrink-0 border-l border-border bg-surface/30 overflow-y-auto">
      <div className="p-6 flex flex-col" style={{ gap: '24px' }}>
        {/* Header */}
        <div>
          <div className="flex items-start justify-between" style={{ marginBottom: '12px' }}>
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-xs text-text-muted uppercase tracking-wider" style={{ marginBottom: '6px' }}>
                Issue Details — #{issueNumber.toLocaleString()}
              </p>
              <h2 className="text-xl font-bold text-white leading-tight">{categoryTitle(issue)}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary p-1 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <SeverityBadge severity={issue.severity} />
        </div>

        {/* AI Analysis */}
        <section>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted" style={{ marginBottom: '10px' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Analysis
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            {issue.explanation}
          </p>
        </section>

        {/* Suggested Fix */}
        <section>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted" style={{ marginBottom: '10px' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Suggested Fix
          </h3>

          {/* Source location */}
          {issue.sourceLocation && (
            <div className="flex items-center justify-between bg-surface rounded-t-lg border border-border px-4 py-2.5">
              <span className="text-xs font-mono text-text-muted">{issue.sourceLocation}</span>
              <button
                onClick={handleCopySnippet}
                className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
              >
                COPY SNIPPET
              </button>
            </div>
          )}

          {/* Current text */}
          <div className={`bg-red-500/5 border border-red-500/20 px-4 py-3.5 ${issue.sourceLocation ? '' : 'rounded-t-lg'}`}>
            <div className="flex justify-between items-start gap-3">
              <code className="text-sm font-mono text-red-300 break-all leading-relaxed">{issue.originalText}</code>
              <span className="text-[10px] font-bold text-red-400 flex-shrink-0 mt-0.5">CURRENT</span>
            </div>
          </div>

          {/* Recommended text */}
          <div className="bg-green-500/5 border border-green-500/20 border-t-0 rounded-b-lg px-4 py-3.5">
            <div className="flex justify-between items-start gap-3">
              <code className="text-sm font-mono text-green-300 break-all leading-relaxed">{issue.suggestedFix}</code>
              <span className="text-[10px] font-bold text-green-400 flex-shrink-0 mt-0.5">RECOMMENDED</span>
            </div>
          </div>
        </section>

        {/* Confidence + Detected */}
        <div className="flex" style={{ gap: '12px' }}>
          <div className="flex-1 bg-surface border border-border rounded-lg p-4">
            <span className="text-xs text-text-muted uppercase tracking-wider block" style={{ marginBottom: '6px' }}>Confidence</span>
            <span className="text-lg font-bold text-accent">{issue.confidence.toFixed(1)}%</span>
          </div>
          <div className="flex-1 bg-surface border border-border rounded-lg p-4">
            <span className="text-xs text-text-muted uppercase tracking-wider block" style={{ marginBottom: '6px' }}>Detected</span>
            <span className="text-lg font-bold text-white">{timeAgo}</span>
          </div>
        </div>

        {/* Chapter info */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-xs text-text-muted uppercase tracking-wider block" style={{ marginBottom: '6px' }}>Chapter</span>
          <span className="text-sm text-text-primary">{issue.chapter}</span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col" style={{ gap: '12px' }}>
          <button
            onClick={handleEditInPressbooks}
            className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Edit in Pressbooks
          </button>

          <div className="flex" style={{ gap: '12px' }}>
            {issue.status === 'ignored' ? (
              <button
                onClick={() => onUpdateStatus('open')}
                className="flex-1 border border-border rounded-lg py-2.5 text-sm text-text-secondary hover:text-text-primary hover:border-border-light transition-colors"
              >
                Reopen Issue
              </button>
            ) : (
              <button
                onClick={() => onUpdateStatus('ignored')}
                className="flex-1 border border-border rounded-lg py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
              >
                Ignore Issue
              </button>
            )}
            {issue.status === 'resolved' ? (
              <button
                onClick={() => onUpdateStatus('open')}
                className="flex-1 border border-info/40 rounded-lg py-2.5 text-sm font-semibold text-info hover:bg-info/10 transition-colors"
              >
                Reopen
              </button>
            ) : (
              <button
                onClick={() => onUpdateStatus('resolved')}
                className="flex-1 bg-surface border border-border rounded-lg py-2.5 text-sm font-semibold text-white hover:bg-surface-hover transition-colors"
              >
                Mark Resolved
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function categoryTitle(issue: ProofreadingIssue): string {
  const desc = issue.description
  if (desc.length <= 50) return desc
  return desc.slice(0, 50) + '...'
}

function getTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} mins ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}
