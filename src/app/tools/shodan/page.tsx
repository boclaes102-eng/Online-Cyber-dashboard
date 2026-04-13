'use client'

import { useState } from 'react'
import { Database, AlertTriangle, ExternalLink, Shield, Server } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { ShodanResult, ShodanHost } from '@/app/api/shodan/route'

function HostCard({ host }: { host: ShodanHost }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-cyber-border/40 rounded bg-cyber-bg">
      {/* Header row */}
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-cyber-cyan/3 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <Server size={13} className="text-cyber-cyan flex-none mt-0.5" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-cyber-cyan font-semibold">{host.ip}</span>
            {host.countryCode && (
              <span className="font-mono text-[9px] text-cyber-muted border border-cyber-border/40 rounded px-1">{host.countryCode}</span>
            )}
            {host.tags.map(t => (
              <span key={t} className="font-mono text-[9px] text-cyber-purple border border-cyber-purple/30 rounded px-1">{t}</span>
            ))}
            {host.vulns.length > 0 && (
              <span className="font-mono text-[9px] text-red-400 border border-red-400/30 rounded px-1">{host.vulns.length} CVE{host.vulns.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <p className="font-mono text-[10px] text-cyber-muted mt-0.5">
            {[host.org, host.city, host.country].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Ports pill cluster */}
        <div className="flex gap-1 flex-wrap justify-end max-w-[180px]">
          {host.services.slice(0, 8).map(s => (
            <span key={`${s.port}/${s.transport}`} className="font-mono text-[9px] text-cyber-text border border-cyber-border/50 rounded px-1.5 py-0.5">
              {s.port}
            </span>
          ))}
          {host.services.length > 8 && (
            <span className="font-mono text-[9px] text-cyber-muted">+{host.services.length - 8}</span>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-cyber-border/30 p-3 space-y-3">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              { label: 'ASN',      value: host.asn },
              { label: 'ISP',      value: host.isp },
              { label: 'OS',       value: host.os },
              { label: 'Last Seen', value: host.lastSeen ? host.lastSeen.slice(0, 10) : null },
            ].filter(r => r.value).map(({ label, value }) => (
              <div key={label}>
                <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">{label}</p>
                <p className="font-mono text-xs text-cyber-text-hi mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Hostnames */}
          {host.hostnames.length > 0 && (
            <div>
              <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-1">Hostnames</p>
              <div className="flex flex-wrap gap-1.5">
                {host.hostnames.map(h => (
                  <span key={h} className="font-mono text-[10px] text-cyber-text border border-cyber-border/40 rounded px-1.5 py-0.5">{h}</span>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          <div>
            <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-1">Services</p>
            <div className="space-y-1.5">
              {host.services.map(s => (
                <div key={`${s.port}/${s.transport}`} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-cyber-cyan w-16 flex-none">{s.port}/{s.transport}</span>
                  <span className="font-mono text-[10px] text-cyber-text-hi flex-none">
                    {[s.product, s.version].filter(Boolean).join(' ') || s.module || '—'}
                  </span>
                  {s.module && (
                    <span className="font-mono text-[9px] text-cyber-muted">{s.module}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CVEs */}
          {host.vulns.length > 0 && (
            <div>
              <p className="font-mono text-[9px] text-red-400/70 uppercase tracking-widest mb-1">Vulnerabilities</p>
              <div className="flex flex-wrap gap-1.5">
                {host.vulns.map(cve => (
                  <a
                    key={cve}
                    href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] text-red-400 border border-red-400/30 rounded px-1.5 py-0.5 hover:bg-red-400/10 transition-colors flex items-center gap-1"
                  >
                    {cve}
                    <ExternalLink size={8} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ShodanPage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<ShodanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function lookup(q?: string) {
    const target = (q ?? query).trim()
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/shodan?q=${encodeURIComponent(target)}`)
      const data: ShodanResult = await res.json()
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
        <div className="w-10 h-10 rounded border border-cyber-cyan/30 flex items-center justify-center bg-cyber-cyan/5 flex-none">
          <Database size={18} className="text-cyber-cyan" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Shodan Search</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Raw Shodan query interface. Enter an IP for host lookup or a Shodan search query (requires SHODAN_API_KEY).
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Query" label="SHODAN" accent="cyan">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && lookup()}
            placeholder="8.8.8.8   or   apache port:8080   or   ssl:google.com"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs rounded hover:bg-cyber-cyan/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <Database size={12} />}
            Search
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['8.8.8.8', 'port:22 country:CN', 'product:nginx vuln:CVE-2021-41773', 'ssl:"github.com"'].map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); lookup(ex) }}
                className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-cyan hover:border-cyber-cyan/40 rounded transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 p-2 bg-cyber-bg border border-cyber-border/40 rounded">
          <Shield size={10} className="text-cyber-muted flex-none mt-0.5" />
          <p className="font-mono text-[9px] text-cyber-muted leading-relaxed">
            Requires <span className="text-cyber-cyan">SHODAN_API_KEY</span> in .env.local.
            Free API keys support host lookups (direct IP). Search queries require a paid plan.
            Get a free key at shodan.io.
          </p>
        </div>
      </TerminalCard>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded font-mono text-xs text-red-400">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-slide-up">
          <TerminalCard
            title={`Results — ${result.total.toLocaleString()} total match${result.total !== 1 ? 'es' : ''}`}
            label={result.mode.toUpperCase()}
            accent="cyan"
          >
            {result.hosts.length === 0 ? (
              <p className="font-mono text-xs text-cyber-muted">No results found for this query.</p>
            ) : (
              <div className="space-y-2">
                {result.hosts.map(h => <HostCard key={h.ip} host={h} />)}
                {result.total > result.hosts.length && (
                  <p className="font-mono text-[10px] text-cyber-muted mt-2">
                    Showing {result.hosts.length} of {result.total.toLocaleString()} results. Use Shodan&apos;s web UI for pagination.
                  </p>
                )}
              </div>
            )}
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
