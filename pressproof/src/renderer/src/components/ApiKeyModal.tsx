import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

const PROVIDERS = [
  { key: 'claude', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
  { key: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
]

export function ApiKeyModal({ open, onClose }: Props) {
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      window.api.loadApiKeys().then(k => setKeys(k))
      setSaved(false)
    }
  }, [open])

  if (!open) return null

  function setKey(provider: string, value: string) {
    setKeys(prev => ({ ...prev, [provider]: value }))
  }

  async function handleSave() {
    setSaving(true)
    // Strip empty keys
    const cleaned: Record<string, string> = {}
    for (const [k, v] of Object.entries(keys)) {
      if (v.trim()) cleaned[k] = v.trim()
    }
    await window.api.saveApiKeys(cleaned)
    setSaving(false)
    setSaved(true)
    setTimeout(() => onClose(), 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">API Keys</h2>
              <p className="text-xs text-text-secondary">Keys are stored locally on your machine.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Provider fields */}
        <div className="flex flex-col" style={{ gap: '10px', marginTop: '10px', marginBottom: '10px' }}>
          {PROVIDERS.map(p => (
            <label key={p.key} className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5 block">
                {p.label}
              </span>
              <input
                type="password"
                value={keys[p.key] ?? ''}
                onChange={e => setKey(p.key, e.target.value)}
                placeholder={p.placeholder}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors font-mono text-sm"
              />
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3" style={{ marginTop: '10px' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {saved ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </>
            ) : saving ? 'Saving...' : 'Save Keys'}
          </button>
        </div>
      </div>
    </div>
  )
}
