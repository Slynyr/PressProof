interface Props {
  count: number
  onBulkIgnore: () => void
  onResolveSelected: () => void
  onDismiss: () => void
}

export function BulkActionBar({ count, onBulkIgnore, onResolveSelected, onDismiss }: Props) {
  return (
    <div className="border-t border-border bg-surface px-6 py-3 flex items-center gap-4">
      <div className="bg-accent/20 text-accent font-bold px-3 py-1.5 rounded-lg text-sm">
        {count} Selected
      </div>
      <span className="text-sm text-text-secondary">Batch process detected errors</span>
      <div className="flex-1" />
      <button
        onClick={onBulkIgnore}
        className="px-4 py-2 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
      >
        Bulk Ignore
      </button>
      <button
        onClick={onResolveSelected}
        className="px-4 py-2 text-sm bg-surface border border-border rounded-lg font-semibold text-white hover:bg-surface-hover transition-colors"
      >
        Resolve Selected
      </button>
      <button
        onClick={onDismiss}
        className="text-text-muted hover:text-text-primary p-1 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
