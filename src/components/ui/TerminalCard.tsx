import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface TerminalCardProps {
  title?: string
  label?: string
  accent?: 'cyan' | 'green' | 'red' | 'orange' | 'none'
  children: ReactNode
  className?: string
  scanline?: boolean
}

const ACCENT_CLASSES = {
  cyan:   'border-cyber-cyan/30 shadow-cyan',
  green:  'border-cyber-green/30 shadow-green',
  red:    'border-cyber-red/30 shadow-red',
  orange: 'border-cyber-orange/30 shadow-orange',
  none:   'border-cyber-border',
}

const ACCENT_TITLE = {
  cyan:   'text-cyber-cyan',
  green:  'text-cyber-green',
  red:    'text-cyber-red',
  orange: 'text-cyber-orange',
  none:   'text-cyber-text',
}

export default function TerminalCard({
  title,
  label,
  accent = 'none',
  children,
  className,
  scanline = false,
}: TerminalCardProps) {
  return (
    <div
      className={clsx(
        'bg-cyber-card border rounded-md overflow-hidden',
        ACCENT_CLASSES[accent],
        scanline && 'scanline-overlay',
        className,
      )}
    >
      {(title || label) && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-cyber-border/60 bg-cyber-surface/50">
          <div className="flex items-center gap-2">
            {/* Traffic lights */}
            <span className="w-2 h-2 rounded-full bg-cyber-red/60" />
            <span className="w-2 h-2 rounded-full bg-cyber-orange/60" />
            <span className="w-2 h-2 rounded-full bg-cyber-green/60" />
            {title && (
              <span className={clsx('font-mono text-[10px] font-600 tracking-widest uppercase ml-2', ACCENT_TITLE[accent])}>
                {title}
              </span>
            )}
          </div>
          {label && (
            <span className="font-mono text-[9px] text-cyber-muted tracking-widest uppercase">
              {label}
            </span>
          )}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
