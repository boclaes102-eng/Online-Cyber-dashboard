import { clsx } from 'clsx'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' | 'UNKNOWN'

interface SeverityBadgeProps {
  severity: Severity | string
  score?: number
  size?: 'sm' | 'md'
}

const MAP: Record<string, { cls: string; dot: string }> = {
  CRITICAL: { cls: 'severity-critical', dot: 'bg-[#ff3366]' },
  HIGH:     { cls: 'severity-high',     dot: 'bg-[#ff6633]' },
  MEDIUM:   { cls: 'severity-medium',   dot: 'bg-[#ffaa00]' },
  LOW:      { cls: 'severity-low',      dot: 'bg-[#00ff88]' },
  NONE:     { cls: 'severity-none',     dot: 'bg-[#4a6080]' },
  UNKNOWN:  { cls: 'severity-none',     dot: 'bg-[#4a6080]' },
}

export default function SeverityBadge({ severity, score, size = 'sm' }: SeverityBadgeProps) {
  const key = (severity ?? 'UNKNOWN').toUpperCase()
  const { cls, dot } = MAP[key] ?? MAP.UNKNOWN

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded px-2 font-mono font-600 uppercase tracking-wider',
        cls,
        size === 'sm' ? 'text-[9px] py-0.5' : 'text-xs py-1',
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-none', dot)} />
      {key}
      {score !== undefined && (
        <span className="opacity-70 ml-0.5">{score.toFixed(1)}</span>
      )}
    </span>
  )
}
