'use client'

import { useState } from 'react'
import { Archive, ExternalLink, Clock, AlertTriangle } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { WaybackResult } from '@/app/api/wayback/route'

const STATUS_COLOR: Record<string, string> = {
  '200': 'text-cyber-green',
  '301': 'text-cyber-orange',
  '302': 'text-cyber-orange',
  '304': 'text-cyber-orange',
  '404': 'text-red-400',
  '500': 'text-red-400',
  '503': 'text-red-400',
}

export default function WaybackPage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<WaybackResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function lookup(u?: string) {
    const url = (u ?? query).trim()
    if (!url) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res  = await fetch(`/api/wayback?url=${encodeURIComponent(url)}`)
      const data: WaybackResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-orange/30 flex items-center justify-center bg-cyber-orange/5 flex-none">
          <Archive size={18} className="text-cyber-orange" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Wayback Machine</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Fetch archived snapshots of any URL from the Internet Archive. Useful for finding removed content and historical configs.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="URL Lookup" label="ARCHIVE" accent="orange">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="https://example.com/robots.txt"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-orange/60"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-orange/10 border border-cyber-orange/30 text-cyber-orange font-mono text-xs rounded hover:bg-cyber-orange/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <Archive size={12} />}
            Search Archive
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['https://example.com', 'https://github.com', 'https://google.com'].map(u => (
              <button
                key={u}
                onClick={() => { setQuery(u); lookup(u) }}
                className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-orange hover:border-cyber-orange/40 rounded transition-all"
              >
                {u}
              </button>
            ))}
          </div>
        )}
      </TerminalCard>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded font-mono text-xs text-red-400">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {/* Results */}
      {result && !error && (
        <div className="space-y-4 animate-slide-up">
          {/* Info card */}
          <TerminalCard title="Archive Info" label="WAYBACK" accent="orange">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
              <div>
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">URL</p>
                <p className="font-mono text-xs text-cyber-text-hi mt-1 break-all">{result.url}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Snapshots Found</p>
                <p className="font-mono text-sm text-cyber-orange mt-1">{result.total}</p>
              </div>
              {result.earliest && (
                <div>
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Earliest</p>
                  <p className="font-mono text-xs text-cyber-text mt-1">{result.earliest}</p>
                </div>
              )}
              {result.latest && (
                <div>
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Latest</p>
                  <p className="font-mono text-xs text-cyber-text mt-1">{result.latest}</p>
                </div>
              )}
            </div>

            {result.latestArchiveUrl && (
              <a
                href={result.latestArchiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-cyber-orange/10 border border-cyber-orange/20 text-cyber-orange font-mono text-xs rounded hover:bg-cyber-orange/20 transition-all"
              >
                <ExternalLink size={11} />
                View Latest Snapshot
              </a>
            )}

            {result.total === 0 && (
              <p className="font-mono text-xs text-cyber-muted">
                No snapshots found. This URL may never have been crawled.
              </p>
            )}
          </TerminalCard>

          {/* Snapshot history */}
          {result.snapshots.length > 0 && (
            <TerminalCard title="Snapshot History" label="HISTORY" accent="none">
              <div className="divide-y divide-cyber-border/30">
                {result.snapshots.map((snap, i) => (
                  <div key={i} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock size={11} className="text-cyber-muted flex-none" />
                      <span className="font-mono text-xs text-cyber-text-hi whitespace-nowrap">{snap.date}</span>
                      <span className={`font-mono text-[10px] ${STATUS_COLOR[snap.status] ?? 'text-cyber-muted'}`}>
                        {snap.status}
                      </span>
                      <span className="font-mono text-[10px] text-cyber-muted truncate">{snap.mime}</span>
                    </div>
                    <a
                      href={snap.archiveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyber-muted hover:text-cyber-orange transition-colors flex-none"
                    >
                      <ExternalLink size={11} />
                    </a>
                  </div>
                ))}
              </div>
            </TerminalCard>
          )}
        </div>
      )}
    </div>
  )
}
