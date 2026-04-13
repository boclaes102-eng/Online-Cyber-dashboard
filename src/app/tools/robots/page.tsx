'use client'

import { useState } from 'react'
import { Bot, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, ShieldAlert } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { RobotsResult } from '@/app/api/robots/route'

const REASON_COLOR: Record<string, string> = {
  'Admin panel':           'text-red-400    border-red-400/30    bg-red-400/5',
  'API / docs endpoint':   'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5',
  'Backup / export':       'text-red-400    border-red-400/30    bg-red-400/5',
  'Auth endpoint':         'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5',
  'Configuration':         'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  'Internal / staging':    'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  'Database interface':    'text-red-400    border-red-400/30    bg-red-400/5',
  'Sensitive file/dir':    'text-red-400    border-red-400/30    bg-red-400/5',
  'File upload/storage':   'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/5',
  'Debug / health':        'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5',
  'CGI script dir':        'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5',
  'Temp / log directory':  'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
}

export default function RobotsPage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<RobotsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showRaw, setShowRaw] = useState(false)

  async function lookup(d?: string) {
    const domain = (d ?? query).trim()
    if (!domain) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/robots?domain=${encodeURIComponent(domain)}`)
      const data: RobotsResult = await res.json()
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
        <div className="w-10 h-10 rounded border border-cyber-green/30 flex items-center justify-center bg-cyber-green/5 flex-none">
          <Bot size={18} className="text-cyber-green" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Robots.txt / Sitemap Parser</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Fetch and parse robots.txt — extract hidden paths from Disallow rules, sitemap URLs, and flagged sensitive directories.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Domain" label="ROBOTS" accent="green">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && lookup()}
            placeholder="example.com"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-green/50"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-green/10 border border-cyber-green/30 text-cyber-green font-mono text-xs rounded hover:bg-cyber-green/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <Bot size={12} />}
            Parse
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['github.com', 'reddit.com', 'wikipedia.org'].map(d => (
              <button
                key={d}
                onClick={() => { setQuery(d); lookup(d) }}
                className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-green hover:border-cyber-green/40 rounded transition-all"
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </TerminalCard>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded font-mono text-xs text-red-400">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Interesting paths */}
          {result.interestingPaths.length > 0 && (
            <TerminalCard title="Flagged Paths" label="RECON" accent="green">
              <div className="space-y-2">
                {result.interestingPaths.map(({ path, reason }) => {
                  const cls = REASON_COLOR[reason] ?? 'text-cyber-muted border-cyber-border bg-transparent'
                  return (
                    <div key={path} className="flex items-center gap-3">
                      <ShieldAlert size={11} className={cls.split(' ')[0]} />
                      <span className="font-mono text-xs text-cyber-text-hi flex-1">{path}</span>
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${cls}`}>
                        {reason}
                      </span>
                    </div>
                  )
                })}
              </div>
            </TerminalCard>
          )}

          {result.interestingPaths.length === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-cyber-green/5 border border-cyber-green/20 rounded font-mono text-xs text-cyber-green">
              <Bot size={13} />
              No obviously sensitive paths found in Disallow rules
            </div>
          )}

          {/* All rules */}
          <TerminalCard title={`Crawl Rules (${result.rules.length} user-agent block${result.rules.length !== 1 ? 's' : ''})`} label="RULES" accent="none">
            <div className="space-y-4">
              {result.rules.map((rule, i) => (
                <div key={i}>
                  <p className="font-mono text-[10px] text-cyber-cyan border-b border-cyber-border/30 pb-1 mb-2">
                    User-Agent: {rule.userAgent}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {rule.disallow.length > 0 && (
                      <div>
                        <p className="font-mono text-[9px] text-red-400/70 uppercase tracking-widest mb-1">Disallow ({rule.disallow.length})</p>
                        <div className="space-y-0.5 max-h-40 overflow-y-auto">
                          {rule.disallow.map(p => (
                            <p key={p} className="font-mono text-[10px] text-cyber-text truncate">{p}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {rule.allow.length > 0 && (
                      <div>
                        <p className="font-mono text-[9px] text-cyber-green/70 uppercase tracking-widest mb-1">Allow ({rule.allow.length})</p>
                        <div className="space-y-0.5 max-h-40 overflow-y-auto">
                          {rule.allow.map(p => (
                            <p key={p} className="font-mono text-[10px] text-cyber-text truncate">{p}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TerminalCard>

          {/* Sitemaps */}
          {result.sitemapUrls.length > 0 && (
            <TerminalCard title="Sitemaps" label="XML" accent="none">
              <div className="space-y-2 mb-4">
                {result.sitemapUrls.map(s => (
                  <a
                    key={s}
                    href={s}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-mono text-xs text-cyber-cyan hover:text-cyber-text-hi transition-colors"
                  >
                    <ExternalLink size={10} />
                    {s}
                  </a>
                ))}
              </div>

              {result.sitemapEntries.length > 0 && (
                <>
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-2">
                    First {result.sitemapEntries.length} URLs from {result.sitemapUrls[0]}
                  </p>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {result.sitemapEntries.map((e, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-cyber-text truncate flex-1">{e.loc}</span>
                        {e.lastmod && <span className="font-mono text-[9px] text-cyber-muted flex-none">{e.lastmod.slice(0, 10)}</span>}
                        {e.priority && <span className="font-mono text-[9px] text-cyber-muted flex-none">{e.priority}</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TerminalCard>
          )}

          {/* Raw robots.txt */}
          <TerminalCard title="Raw robots.txt" label="TEXT" accent="none">
            <button
              onClick={() => setShowRaw(r => !r)}
              className="flex items-center gap-2 font-mono text-xs text-cyber-muted hover:text-cyber-text transition-colors mb-3"
            >
              {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showRaw ? 'Collapse' : 'Show raw content'}
            </button>
            {showRaw && (
              <pre className="font-mono text-[10px] text-cyber-text bg-cyber-bg border border-cyber-border/40 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {result.rawText}
              </pre>
            )}
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
