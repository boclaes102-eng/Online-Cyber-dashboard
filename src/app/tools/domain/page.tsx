'use client'

import { useState } from 'react'
import { Search, Globe, Lock, FileText, Server, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import type { DomainResult, DnsRecord } from '@/lib/types'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

const DNS_TYPE_COLOR: Record<string, string> = {
  A:     'text-cyber-cyan',
  AAAA:  'text-cyber-cyan',
  MX:    'text-cyber-orange',
  TXT:   'text-cyber-purple',
  NS:    'text-cyber-green',
  CNAME: 'text-[#00d4ff]',
  SOA:   'text-cyber-muted',
}

function DnsTable({ records }: { records: DnsRecord[] }) {
  if (!records.length) return <p className="font-mono text-xs text-cyber-muted py-2">No records found.</p>
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-cyber-border">
          {['Type','Name','Value','TTL'].map(h => (
            <th key={h} className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest pb-2 pr-4">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {records.map((r, i) => (
          <tr key={i} className="border-b border-cyber-border/30 hover:bg-cyber-surface/30">
            <td className="py-1.5 pr-4">
              <span className={`font-mono text-[11px] font-600 ${DNS_TYPE_COLOR[r.type] ?? 'text-cyber-text'}`}>{r.type}</span>
            </td>
            <td className="py-1.5 pr-4 font-mono text-[11px] text-cyber-muted max-w-[120px] truncate">{r.name}</td>
            <td className="py-1.5 pr-4 font-mono text-[11px] text-cyber-text break-all max-w-[240px]">{r.value}</td>
            <td className="py-1.5 font-mono text-[11px] text-cyber-muted">{r.ttl}s</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function DomainPage() {
  const [query, setQuery]       = useState('')
  const [result, setResult]     = useState<DomainResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showAllCerts, setShowAllCerts] = useState(false)
  const [showAllSubs,  setShowAllSubs]  = useState(false)

  async function analyze() {
    const q = query.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
    if (!q) return
    setLoading(true); setError(''); setResult(null); setShowAllCerts(false); setShowAllSubs(false)
    try {
      const res = await fetch(`/api/domain?domain=${encodeURIComponent(q)}`)
      const data: DomainResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally { setLoading(false) }
  }

  const visibleCerts = showAllCerts ? result?.certs : result?.certs.slice(0, 6)
  const visibleSubs  = showAllSubs  ? result?.subdomains : result?.subdomains.slice(0, 15)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Search size={16} className="text-cyber-cyan" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">Domain Analyzer</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          WHOIS · DNS Records · Certificate Transparency · Subdomain Enumeration
        </p>
      </div>

      <TerminalCard title="Target" accent="cyan">
        <div className="flex gap-3">
          <input
            className="cyber-input flex-1"
            placeholder="example.com"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analyze()}
          />
          <button className="cyber-btn flex items-center gap-2" onClick={analyze} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <Search size={13} />}
            {loading ? 'Analyzing' : 'Analyze'}
          </button>
        </div>
      </TerminalCard>

      {error && (
        <div className="cyber-card-red p-3 flex items-center gap-2">
          <AlertTriangle size={13} className="text-cyber-red flex-none" />
          <span className="font-mono text-xs text-cyber-red">{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Summary banner */}
          <TerminalCard title={result.domain} accent="cyan" scanline>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { label: 'DNS Records',   value: result.dns.length },
                { label: 'Subdomains',    value: result.subdomains.length },
                { label: 'Certificates',  value: result.certs.length },
                { label: 'WHOIS',         value: result.whois ? 'Found' : 'N/A' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="font-mono text-xl font-700 text-cyber-cyan">{value}</p>
                  <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">{label}</p>
                </div>
              ))}
            </div>
          </TerminalCard>

          {/* DNS Records */}
          <TerminalCard title="DNS Records" label={`${result.dns.length} records`} accent="cyan">
            <DnsTable records={result.dns} />
          </TerminalCard>

          {/* WHOIS */}
          {result.whois && (
            <TerminalCard title="WHOIS / Registration" accent="none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                {[
                  { label: 'Registrar',    value: result.whois.registrar },
                  { label: 'Created',      value: result.whois.created ? formatDate(result.whois.created) : undefined },
                  { label: 'Updated',      value: result.whois.updated ? formatDate(result.whois.updated) : undefined },
                  { label: 'Expires',      value: result.whois.expires ? formatDate(result.whois.expires) : undefined },
                  { label: 'Status',       value: result.whois.status?.join(', ') },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="flex gap-4 py-1.5 border-b border-cyber-border/30">
                    <span className="font-mono text-[11px] text-cyber-muted w-28 flex-none uppercase tracking-wider">{label}</span>
                    <span className="font-mono text-[11px] text-cyber-text-hi break-all">{value}</span>
                  </div>
                ) : null)}
              </div>
              {result.whois.nameservers?.length ? (
                <div className="mt-3">
                  <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-1">Nameservers</p>
                  <div className="flex flex-wrap gap-2">
                    {result.whois.nameservers.map(ns => (
                      <span key={ns} className="font-mono text-[11px] text-cyber-cyan border border-cyber-cyan/20 rounded px-2 py-0.5 bg-cyber-cyan/5">{ns}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </TerminalCard>
          )}

          {/* Subdomains */}
          {result.subdomains.length > 0 && (
            <TerminalCard title="Subdomains via Cert Transparency" label={`${result.subdomains.length} found`} accent="green">
              <div className="flex flex-wrap gap-2">
                {visibleSubs?.map(sub => (
                  <span key={sub} className="font-mono text-[11px] text-cyber-green border border-cyber-green/20 rounded px-2 py-0.5 bg-cyber-green/5">
                    {sub}
                  </span>
                ))}
              </div>
              {(result.subdomains.length > 15) && (
                <button onClick={() => setShowAllSubs(v => !v)} className="mt-3 font-mono text-[11px] text-cyber-cyan hover:underline flex items-center gap-1">
                  {showAllSubs ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {showAllSubs ? 'Show less' : `Show all ${result.subdomains.length}`}
                </button>
              )}
            </TerminalCard>
          )}

          {/* Certificate transparency */}
          {result.certs.length > 0 && (
            <TerminalCard title="Certificate Transparency Log" label="crt.sh" accent="none">
              <div className="space-y-2">
                {visibleCerts?.map(cert => (
                  <div key={cert.id} className="p-3 border border-cyber-border/50 rounded bg-cyber-surface/30 hover:border-cyber-cyan/20 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-[11px] text-cyber-text-hi break-all">{cert.name}</p>
                      <a
                        href={`https://crt.sh/?id=${cert.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[9px] text-cyber-cyan hover:underline flex-none"
                      >
                        #{cert.id}
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <span className="font-mono text-[10px] text-cyber-muted">Issuer: {cert.issuerName.split(',')[0]?.replace('O=','')?.trim()}</span>
                      <span className="font-mono text-[10px] text-cyber-muted">
                        {formatDate(cert.notBefore)} → {formatDate(cert.notAfter)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {result.certs.length > 6 && (
                <button onClick={() => setShowAllCerts(v => !v)} className="mt-3 font-mono text-[11px] text-cyber-cyan hover:underline flex items-center gap-1">
                  {showAllCerts ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                  {showAllCerts ? 'Show less' : `Show all ${result.certs.length} certificates`}
                </button>
              )}
            </TerminalCard>
          )}
        </div>
      )}

      {!result && !loading && (
        <div className="flex flex-wrap gap-2">
          {['github.com', 'google.com', 'cloudflare.com'].map(d => (
            <button key={d} onClick={() => setQuery(d)} className="font-mono text-[11px] text-cyber-muted border border-cyber-border hover:border-cyber-cyan/40 hover:text-cyber-cyan px-3 py-1 rounded transition-colors">
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
