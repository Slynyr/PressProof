import { useState, useEffect, useMemo } from 'react'
// Icon is rendered inline as SVG (matching AuditConsole style)
import type { ScanConfig, ScanMeta } from '@shared/types'
import { StatusBadge } from './StatusBadge'
import { ApiKeyModal } from './ApiKeyModal'

interface Props {
  onStartAudit: (config: ScanConfig) => void
  onImport: () => void
  onLoadAudit: (id: string) => void
  onToggleStar: (id: string, starred: boolean) => void
  onDeleteAudit: (id: string) => void
  audits: ScanMeta[]
}

const LLM_MODELS = [
  { value: 'claude:claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude:claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { value: 'openai:gpt-4o', label: 'GPT-4o' },
  { value: 'openai:gpt-4o-mini', label: 'GPT-4o Mini' },
]

export function HomeScreen({ onStartAudit, onImport, onLoadAudit, onToggleStar, onDeleteAudit, audits }: Props) {
  const [url, setUrl] = useState(() => localStorage.getItem('pressproof:url') ?? '')
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('pressproof:model') ?? LLM_MODELS[0].value)
  const [scanMode, setScanMode] = useState<'full' | 'range'>(() => (localStorage.getItem('pressproof:scanMode') as 'full' | 'range') || 'full')
  const [pageFrom, setPageFrom] = useState(() => Number(localStorage.getItem('pressproof:pageFrom')) || 1)
  const [pageTo, setPageTo] = useState(() => Number(localStorage.getItem('pressproof:pageTo')) || 10)
  const [customInstructions, setCustomInstructions] = useState(() => localStorage.getItem('pressproof:customInstructions') ?? '')
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [showKeyModal, setShowKeyModal] = useState(false)

  const [provider, model] = selectedModel.split(':')

  // Load saved API keys on mount and when modal closes
  useEffect(() => {
    window.api.loadApiKeys().then(setApiKeys)
  }, [showKeyModal])

  const activeKey = apiKeys[provider] ?? ''
  const canStart = url.trim() && activeKey.trim()

  function persist(key: string, value: string) {
    localStorage.setItem(`pressproof:${key}`, value)
  }

  function handleUrl(v: string) { setUrl(v); persist('url', v) }
  function handleModel(v: string) { setSelectedModel(v); persist('model', v) }
  function handleScanMode(v: 'full' | 'range') { setScanMode(v); persist('scanMode', v) }
  function handlePageFrom(v: number) { setPageFrom(v); persist('pageFrom', String(v)) }
  function handlePageTo(v: number) { setPageTo(v); persist('pageTo', String(v)) }
  function handleCustomInstructions(v: string) { setCustomInstructions(v); persist('customInstructions', v) }

  function handleStart() {
    if (!canStart) return
    onStartAudit({
      url: url.trim(),
      provider: provider as 'openai' | 'claude',
      apiKey: activeKey.trim(),
      model,
      scanMode,
      pageFrom: scanMode === 'range' ? pageFrom : undefined,
      pageTo: scanMode === 'range' ? pageTo : undefined,
      customInstructions: customInstructions.trim() || undefined,
    })
  }

  const starredAudits = audits.filter(a => a.starred)

  // Group non-starred audits by book
  const groupedAudits = useMemo(() => {
    const unstarred = audits.filter(a => !a.starred)
    const groups = new Map<string, ScanMeta[]>()
    for (const audit of unstarred) {
      const key = audit.bookUrl || audit.bookTitle
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(audit)
    }
    return Array.from(groups.entries())
  }, [audits])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left column — New Audit form */}
      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-3" style={{ marginBottom: '12px' }}>
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <span className="text-2xl font-semibold text-text-primary">PressProof Auditor</span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">New Audit</h1>
          <p className="text-text-secondary" style={{ marginBottom: '12px' }}>
            Initiate a comprehensive scan of your Pressbook. Define your parameters,
            choose your model, and let the auditor identify errors and inconsistencies.
          </p>

          {/* Form — flex column with guaranteed spacing */}
          <div className="flex flex-col" style={{ gap: '28px' }}>
            {/* URL Input */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary block" style={{ marginBottom: '10px' }}>
                Pressbook URL or Webhook
              </span>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                  </svg>
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={e => handleUrl(e.target.value)}
                  placeholder="https://pressbooks.directory/your-book-url"
                  className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Model + Scan Depth row */}
            <div className="flex gap-4">
              <div className="flex-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary block" style={{ marginBottom: '10px' }}>
                  LLM Model
                </span>
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={e => handleModel(e.target.value)}
                    className="w-full appearance-none bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
                  >
                    {LLM_MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary block" style={{ marginBottom: '10px' }}>
                  Scan Depth
                </span>
                <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => handleScanMode('full')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${scanMode === 'full' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    Full Scan
                  </button>
                  <button
                    onClick={() => handleScanMode('range')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${scanMode === 'range' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    Page Range
                  </button>
                </div>
              </div>
            </div>

            {/* API Keys + Page Range row */}
            <div className="flex gap-4">
              <div className="flex-1">
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Manage API Keys
                  {activeKey ? (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-info">
                      <span className="w-1.5 h-1.5 rounded-full bg-info" />
                      Configured
                    </span>
                  ) : (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-warning">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                      Not set
                    </span>
                  )}
                </button>
              </div>

              <div className="flex-1 flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min={1}
                    value={pageFrom}
                    onChange={e => handlePageFrom(Number(e.target.value))}
                    disabled={scanMode !== 'range'}
                    placeholder="FROM"
                    className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-40"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    min={1}
                    value={pageTo}
                    onChange={e => handlePageTo(Number(e.target.value))}
                    disabled={scanMode !== 'range'}
                    placeholder="TO"
                    className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-40"
                  />
                </div>
              </div>
            </div>

            {/* Custom Instructions */}
            <div>
              <div className="flex justify-between" style={{ marginBottom: '10px' }}>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Custom Instructions
                </span>
                <span className="text-xs text-text-muted">Optional</span>
              </div>
              <textarea
                value={customInstructions}
                onChange={e => handleCustomInstructions(e.target.value)}
                placeholder="e.g. Check for consistent use of Oxford commas. Ensure all math is in LaTeX..."
                rows={4}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
              />
            </div>

            {/* Start button */}
            <button
              onClick={handleStart}
              disabled={!canStart}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Start Audit
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Right column — Audits sidebar */}
      <div className="w-80 border-l border-border bg-surface/30 overflow-y-auto" style={{ padding: '24px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <h2 className="text-lg font-semibold text-white">Audits</h2>
        </div>

        {/* Import button */}
        <button
          onClick={onImport}
          className="w-full border border-border rounded-lg px-4 py-3 text-text-secondary hover:text-accent hover:border-accent/50 transition-colors flex items-center justify-center gap-2"
          style={{ marginBottom: '24px' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Import Log File
        </button>

        {/* Starred audits */}
        {starredAudits.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5" style={{ marginBottom: '14px' }}>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Starred Audits
            </h3>
            <div className="flex flex-col" style={{ gap: '12px' }}>
              {starredAudits.map(audit => (
                <AuditCard key={audit.id} audit={audit} onClick={() => onLoadAudit(audit.id)} onToggleStar={() => onToggleStar(audit.id, !audit.starred)} onDelete={() => onDeleteAudit(audit.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Audits grouped by book */}
        {groupedAudits.map(([bookUrl, bookAudits]) => {
          const bookTitle = bookAudits[0].bookTitle
          const hostName = (() => {
            try { return new URL(bookUrl).hostname } catch { return bookUrl }
          })()

          return (
            <div key={bookUrl} style={{ marginBottom: '24px' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5 truncate" style={{ marginBottom: '14px' }}>
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="truncate" title={`${bookTitle} — ${hostName}`}>{bookTitle || hostName}</span>
              </h3>
              <div className="flex flex-col" style={{ gap: '12px' }}>
                {bookAudits.map(audit => (
                  <AuditCard key={audit.id} audit={audit} onClick={() => onLoadAudit(audit.id)} onToggleStar={() => onToggleStar(audit.id, !audit.starred)} onDelete={() => onDeleteAudit(audit.id)} />
                ))}
              </div>
            </div>
          )
        })}

        {audits.length === 0 && (
          <p className="text-sm text-text-muted text-center" style={{ marginTop: '32px' }}>No previous audits found.</p>
        )}
      </div>

      {/* API Key Modal */}
      <ApiKeyModal open={showKeyModal} onClose={() => setShowKeyModal(false)} />
    </div>
  )
}

function AuditCard({ audit, onClick, onToggleStar, onDelete }: { audit: ScanMeta; onClick: () => void; onToggleStar: () => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const timeAgo = getTimeAgo(audit.completedAt ?? audit.startedAt)

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete()
    } else {
      setConfirmDelete(true)
      // Auto-dismiss after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div
      onClick={onClick}
      className="bg-surface border border-border rounded-lg p-4 cursor-pointer hover:bg-surface-hover transition-colors group"
    >
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={audit.status} />
          {audit.importedAt && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/15 text-accent">
              Imported
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">{timeAgo}</span>
          <button
            onClick={e => { e.stopPropagation(); onToggleStar() }}
            className="text-text-muted hover:text-yellow-400 transition-colors"
          >
            <svg className={`w-4 h-4 ${audit.starred ? 'text-yellow-400 fill-yellow-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className={`transition-colors ${confirmDelete ? 'text-red-400' : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400'}`}
            title={confirmDelete ? 'Click again to confirm' : 'Delete audit'}
          >
            {confirmDelete ? (
              <span className="text-[10px] font-medium">Delete?</span>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <h4 className="text-sm font-semibold text-white mb-0.5 truncate">{audit.scanName || audit.bookTitle}</h4>
      <div className="flex items-center gap-3 text-xs text-text-muted">
        {audit.summary.critical > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-critical" />
            {audit.summary.critical}
          </span>
        )}
        {audit.summary.warnings > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            {audit.summary.warnings}
          </span>
        )}
      </div>
    </div>
  )
}

function getTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}
