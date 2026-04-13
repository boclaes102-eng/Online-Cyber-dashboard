'use client'

import { useState } from 'react'
import { Unlink, AlertTriangle, CheckCircle, AlertOctagon, ExternalLink } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { UrlhausResult } from '@/app/api/urlhaus/route'

const STATUS_STYLE = {
  online:  { label: 'ONLINE',  color: 'text-red-400',      border: 'border-red-400/30',      bg: 'bg-red-400/5'      },
  offline: { label: 'OFFLINE', color: 'text-cyber-muted',  border: 'border-cyber-border',    bg: 'bg-transparent'    },
  unknown: { label: 'UNKNOWN', color: 'text-cyber-orange', border: 'border-cyber-orange/30', bg: 'bg-cyber-orange/5' },
}

const THREAT_COLOR: Record<string, string> = {
  malware_download: 'text-red-400 border-red-400/30 bg-red-400/10',
  phishing:         'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/10',
  botnet_cc:        'text-red-400 border-red-400/30 bg-red-400/10',
  spam:             'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
}

export default function UrlhausPage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<UrlhausResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function lookup(q?: string) {
    const target = (q ?? query).trim()
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/urlhaus?q=${encodeURIComponent(target)}`)
      const data: UrlhausResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  const statusSty = result?.urlStatus ? STATUS_STYLE[result.urlStatus] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-red/30 flex items-center justify-center bg-cyber-red/5 flex-none">
          <Unlink size={18} className="text-cyber-red" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">URLhaus Lookup</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Check URLs and hosts against abuse.ch&apos;s malware URL database. No API key required.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Target" label="URLHAUS" accent="red">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && lookup()}
            placeholder="https://evil.com/malware.exe   or   evil.com   or   1.2.3.4"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-red/50"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red font-mono text-xs rounded hover:bg-cyber-red/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <Unlink size={12} />}
            Check
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['bazaar.abuse.ch', 'urlhaus.abuse.ch', 'feodotracker.abuse.ch'].map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); lookup(ex) }}
                className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-red hover:border-cyber-red/40 rounded transition-all"
              >
                {ex}
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
          {/* Verdict */}
          {result.found ? (
            <div className="flex items-start gap-4 p-5 rounded border border-red-400/30 bg-red-400/5">
              <AlertOctagon size={22} className="text-red-400 flex-none mt-0.5" />
              <div>
                <p className="font-mono text-sm font-semibold tracking-widest uppercase text-red-400">
                  MALICIOUS — IN URLHAUS DATABASE
                </p>
                <p className="font-mono text-xs text-cyber-text mt-1.5 leading-relaxed">
                  {result.queryType === 'url'
                    ? `This URL has been reported as malicious${result.threat ? ` (${result.threat.replace(/_/g, ' ')})` : ''}.`
                    : `This host has ${result.urls.length} malicious URL${result.urls.length !== 1 ? 's' : ''} on record in URLhaus.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 p-5 rounded border border-cyber-green/30 bg-cyber-green/5">
              <CheckCircle size={22} className="text-cyber-green flex-none mt-0.5" />
              <div>
                <p className="font-mono text-sm font-semibold tracking-widest uppercase text-cyber-green">
                  NOT IN URLHAUS DATABASE
                </p>
                <p className="font-mono text-xs text-cyber-text mt-1.5 leading-relaxed">
                  No malware reports found for this {result.queryType}. Absence does not guarantee safety.
                </p>
              </div>
            </div>
          )}

          {/* URL details (single URL lookup) */}
          {result.found && result.queryType === 'url' && (
            <TerminalCard title="URL Details" label="URLHAUS" accent="none">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  { label: 'Threat',    value: result.threat?.replace(/_/g, ' ') },
                  { label: 'Reporter',  value: result.reporter },
                  { label: 'First Seen', value: result.dateAdded },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label}>
                    <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">{label}</p>
                    <p className="font-mono text-xs text-cyber-text-hi mt-0.5">{value}</p>
                  </div>
                ))}

                {statusSty && (
                  <div>
                    <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Status</p>
                    <span className={`inline-block mt-1 font-mono text-[10px] px-2 py-0.5 rounded border ${statusSty.border} ${statusSty.bg} ${statusSty.color}`}>
                      {statusSty.label}
                    </span>
                  </div>
                )}
              </div>

              {result.tags && result.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.tags.map(t => (
                    <span key={t} className="font-mono text-[9px] text-cyber-orange border border-cyber-orange/30 rounded px-1.5 py-0.5">{t}</span>
                  ))}
                </div>
              )}

              {result.blacklists && (
                <div className="mt-3 space-y-1">
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-1.5">Blacklists</p>
                  {[
                    { label: 'Spamhaus DBL', value: result.blacklists.spamhausDbl },
                    { label: 'SURBL',        value: result.blacklists.surbl },
                  ].filter(b => b.value).map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-cyber-muted w-28">{label}</span>
                      <span className={`font-mono text-[10px] ${value === 'not listed' ? 'text-cyber-green' : 'text-red-400'}`}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.reference && (
                <a
                  href={result.reference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 font-mono text-[10px] text-cyber-muted hover:text-cyber-red transition-colors"
                >
                  <ExternalLink size={10} />
                  View on URLhaus
                </a>
              )}
            </TerminalCard>
          )}

          {/* Host URLs (host query) */}
          {result.found && result.queryType === 'host' && result.urls.length > 0 && (
            <TerminalCard title={`Associated URLs (${result.urls.length})`} label="URLS" accent="none">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {result.urls.map(u => {
                  const sty = STATUS_STYLE[u.urlStatus]
                  const tc  = THREAT_COLOR[u.threat] ?? 'text-cyber-muted border-cyber-border bg-transparent'
                  return (
                    <div key={u.id} className="flex items-start gap-2 p-2 rounded border border-cyber-border/30 bg-cyber-bg">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[10px] text-cyber-cyan truncate">{u.url}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${sty.border} ${sty.bg} ${sty.color}`}>{sty.label}</span>
                          {u.threat && (
                            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${tc}`}>{u.threat.replace(/_/g, ' ')}</span>
                          )}
                          {u.tags?.map(t => (
                            <span key={t} className="font-mono text-[9px] text-cyber-orange border border-cyber-orange/30 rounded px-1">{t}</span>
                          ))}
                        </div>
                      </div>
                      <a
                        href={u.reference}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyber-muted hover:text-cyber-red transition-colors flex-none"
                      >
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )
                })}
              </div>
            </TerminalCard>
          )}
        </div>
      )}
    </div>
  )
}
