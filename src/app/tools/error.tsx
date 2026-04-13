'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Next.js 14 error boundary for the /tools/* segment.
 * Shown when a client-side unhandled error occurs inside a tool page.
 */
export default function ToolsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to your error-reporting service here if needed
    console.error('[ToolsError]', error)
  }, [error])

  return (
    <div className="p-6 flex items-start justify-center min-h-[60vh]">
      <div className="max-w-md w-full bg-cyber-surface border border-red-500/30 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <AlertTriangle size={14} className="text-red-400 flex-none" />
          <span className="font-mono text-xs text-red-400 tracking-widest uppercase">
            Unhandled Error
          </span>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="font-mono text-sm text-cyber-text-hi">
            Something went wrong rendering this tool.
          </p>

          {error.message && (
            <pre className="bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-[11px] text-red-300 whitespace-pre-wrap break-all">
              {error.message}
            </pre>
          )}

          {error.digest && (
            <p className="font-mono text-[10px] text-cyber-muted">
              Error ID: <span className="text-cyber-text">{error.digest}</span>
            </p>
          )}

          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs rounded hover:bg-cyber-cyan/20 transition-all"
          >
            <RefreshCw size={12} />
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
