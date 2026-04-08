interface Props {
  status: 'running' | 'success' | 'incomplete' | 'error'
}

const styles: Record<string, string> = {
  running: 'text-blue-400',
  success: 'text-green-400',
  incomplete: 'text-yellow-400',
  error: 'text-red-400'
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`text-xs font-bold uppercase tracking-wider ${styles[status] ?? 'text-text-muted'}`}>
      {status}
    </span>
  )
}
