interface Props {
  severity: 'critical' | 'warning' | 'note'
  className?: string
}

const styles = {
  critical: 'bg-critical/15 text-critical',
  warning: 'bg-warning/15 text-warning',
  note: 'bg-info/15 text-info'
}

export function SeverityBadge({ severity, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${styles[severity]} ${className}`}>
      {severity}
    </span>
  )
}
