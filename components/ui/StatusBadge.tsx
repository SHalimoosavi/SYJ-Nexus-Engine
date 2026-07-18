interface StatusBadgeProps {
  status: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

const TONE_CLASSES: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  neutral: 'border-nexus-border bg-nexus-surface text-nexus-muted',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  danger: 'border-red-500/40 bg-red-500/10 text-red-400'
}

/** Small pill used across the dashboard to render a lead stage, compliance status, or transaction status. */
export function StatusBadge({ status, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={`mono inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${TONE_CLASSES[tone]}`}
    >
      {status}
    </span>
  )
}

/** Maps common domain statuses to a sensible tone automatically. */
export function toneForStatus(status: string): StatusBadgeProps['tone'] {
  const positive = new Set(['won', 'completed', 'passed', 'active'])
  const negative = new Set(['lost', 'failed', 'expired', 'revoked'])
  const cautionary = new Set(['pending', 'tentative'])

  if (positive.has(status)) return 'success'
  if (negative.has(status)) return 'danger'
  if (cautionary.has(status)) return 'warning'
  return 'neutral'
}
