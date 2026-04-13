'use client'

import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, ExternalLink, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { CertResult, CertEntry } from '@/app/api/certs/route'

type Filter = '24h' | '7d' | '30d' | 'all'

function relativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function issuerCN(issuer: string): string {
  const m = issuer.match(/CN=([^,]+)/)
  return m ? m[1].trim() : issuer
}

function filterCert(cert: CertEntry, f: Filter): boolean {
  if (f === 'all') return true
  const age = Date.now() - new Date(cert.logged).getTime()
  if (f === '24h') return age < 86_400_000
  if (f === '7d')  return age < 7  * 86_400_000
  return age < 30 * 86_400_000
}

export default function CertsPage() {
  const [query, setQuery]   = useState('')
  const [result, setResult] = useState<CertResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [watching, setWatching] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const domainRef = useRef('')
  const watchRef  = useRef(false)

  async function doLookup(domain: string) {
    if (!domain) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/certs?domain=${encodeURIComponent(domain)}`)
      const data: CertResult = await res.json()
      if (data.error) { setError(data.error); setResult(null) }
      else setResult(data)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  function lookup(d?: string) {
    const domain = (d ?? query).trim()
    domainRef.current = domain
    doLookup(domain)
  }

  // Watch mode — refresh every 30 s
  useEffect(() => {
    watchRef.current = watching
    if (!watching) return
    const id = setInterval(() => {
      if (watchRef.current && domainRef.current) doLookup(domainRef.current)
    }, 30_000)
    return () => clearInterval(id)
  }, [watching])

  const filtered = result?.certs.filter(c => filterCert(c, filter)) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-cyan/30 flex items-center justify-center bg-cyber-cyan/5 flex-none">
          <ShieldCheck size={18} className="text-cyber-cyan" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Certificate Transparency</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Browse crt.sh for every SSL/TLS certificate issued for a domain. Watch mode refreshes every 30 s.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Domain Query" label="CT-LOG" accent="cyan">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="example.com"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs rounded hover:bg-cyber-cyan/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <ShieldCheck size={12} />}
            Fetch Certs
          </button>
          {result && (
            <button
              onClick={() => setWatching(w => !w)}
              className={`flex items-center gap-2 px-3 py-2 border font-mono text-xs rounded transition-all ${
                watching
                  ? 'bg-cyber-green/10 border-cyber-green/40 text-cyber-green'
                  : 'bg-transparent border-cyber-border text-cyber-muted hover:text-cyber-text'
              }`}
            >
              {watching ? <Eye size={12} /> : <EyeOff size={12} />}
              {watching ? 'Watching' : 'Watch'}
            </button>
          )}
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['github.com', 'google.com', 'cloudflare.com'].map(d => (
              <button
                key={d}
                onClick={() => { setQuery(d); lookup(d) }}
                className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-cyan hover:border-cyber-cyan/40 rounded transition-all"
              >
                {d}
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
          {/* Summary + filter */}
          <TerminalCard title="Summary" label="RESULTS" accent="green">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex gap-6">
                <div>
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Domain</p>
                  <p className="font-mono text-sm text-cyber-cyan mt-1">{result.domain}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Total</p>
                  <p className="font-mono text-sm text-cyber-text-hi mt-1">{result.total.toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Showing</p>
                  <p className="font-mono text-sm text-cyber-text-hi mt-1">{Math.min(filtered.length, 100)}</p>
                </div>
                {watching && (
                  <div>
                    <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Mode</p>
                    <p className="font-mono text-sm text-cyber-green mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse-slow inline-block" />
                      Live
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-1">
                {(['24h', '7d', '30d', 'all'] as Filter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`font-mono text-[10px] px-2 py-1 rounded transition-all ${
                      filter === f
                        ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30'
                        : 'text-cyber-muted border border-cyber-border hover:text-cyber-text'
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </TerminalCard>

          {/* Cert list */}
          <TerminalCard title="Certificate Log" label="CERTS" accent="cyan">
            <div className="divide-y divide-cyber-border/30">
              {filtered.length === 0 ? (
                <p className="font-mono text-xs text-cyber-muted py-4 text-center">No certs in this time range.</p>
              ) : filtered.slice(0, 100).map(cert => (
                <div key={cert.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs text-cyber-cyan truncate">{cert.cn}</span>
                        <a
                          href={`https://crt.sh/?id=${cert.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyber-muted hover:text-cyber-cyan transition-colors flex-none"
                        >
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cert.sans.filter(s => s !== cert.cn).slice(0, 6).map(san => (
                          <span
                            key={san}
                            className="font-mono text-[10px] text-cyber-text bg-cyber-border/20 rounded px-1.5 py-0.5"
                          >
                            {san}
                          </span>
                        ))}
                        {cert.sans.filter(s => s !== cert.cn).length > 6 && (
                          <span className="font-mono text-[10px] text-cyber-muted">
                            +{cert.sans.filter(s => s !== cert.cn).length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-none space-y-0.5">
                      <p className="font-mono text-[10px] text-cyber-text-hi">{relativeTime(cert.logged)}</p>
                      <p className="font-mono text-[10px] text-cyber-muted">{issuerCN(cert.issuer)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
