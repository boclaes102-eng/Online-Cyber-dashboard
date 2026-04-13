'use client'

import { useState } from 'react'
import { Wifi, Search, ChevronDown, ChevronUp } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import type { DnsResolveResult, DnsRecord } from '@/lib/types'

const RECORD_TYPES = ['A','AAAA','MX','TXT','NS','CNAME','SOA','PTR','CAA','SRV'] as const
type RecordType = typeof RECORD_TYPES[number]

const TYPE_COLORS: Record<string, string> = {
  A:     'text-cyber-green  border-cyber-green/30  bg-cyber-green/5',
  AAAA:  'text-cyber-cyan   border-cyber-cyan/30   bg-cyber-cyan/5',
  MX:    'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5',
  TXT:   'text-cyber-text-hi border-cyber-border   bg-cyber-surface',
  NS:    'text-cyber-cyan   border-cyber-cyan/30   bg-cyber-cyan/5',
  CNAME: 'text-cyber-green  border-cyber-green/30  bg-cyber-green/5',
  SOA:   'text-cyber-muted  border-cyber-border    bg-cyber-surface',
  PTR:   'text-cyber-green  border-cyber-green/30  bg-cyber-green/5',
  CAA:   'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5',
  SRV:   'text-cyber-cyan   border-cyber-cyan/30   bg-cyber-cyan/5',
}

const QUICK_EXAMPLES = [
  { label: 'google.com A',     q: 'google.com',       t: 'A'   },
  { label: 'github.com MX',    q: 'github.com',       t: 'MX'  },
  { label: 'cloudflare TXT',   q: 'cloudflare.com',   t: 'TXT' },
  { label: '8.8.8.8 PTR',      q: '8.8.8.8',          t: 'PTR' },
  { label: '_dmarc google',    q: '_dmarc.google.com',t: 'TXT' },
]

export default function DnsPage() {
  const [query,   setQuery]   = useState('')
  const [type,    setType]    = useState<RecordType>('A')
  const [result,  setResult]  = useState<DnsResolveResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [showRaw, setShowRaw] = useState(false)

  async function resolve(q?: string, t?: RecordType) {
    const name = (q ?? query).trim()
    const rtype = t ?? type
    if (!name) return
    setLoading(true); setError(''); setResult(null); setShowRaw(false)
    try {
      const res  = await fetch(`/api/dns?name=${encodeURIComponent(name)}&type=${rtype}`)
      const data: DnsResolveResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed') }
    finally { setLoading(false) }
  }

  function formatTtl(ttl?: number): string {
    if (!ttl) return ''
    if (ttl < 60)   return `${ttl}s`
    if (ttl < 3600) return `${Math.round(ttl / 60)}m`
    return `${Math.round(ttl / 3600)}h`
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Wifi size={16} className="text-cyber-cyan" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">DNS Resolver</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Query any DNS record type via Google, Cloudflare, and Quad9 DoH resolvers
        </p>
      </div>

      <TerminalCard title="Query" accent="cyan">
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              className="cyber-input font-mono flex-1"
              placeholder="hostname, domain, or IP (for PTR)…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && resolve()}
            />
            <select
              className="cyber-input font-mono w-24"
              value={type}
              onChange={e => setType(e.target.value as RecordType)}
            >
              {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="cyber-btn flex items-center gap-2" onClick={() => resolve()} disabled={loading}>
              {loading ? <Spinner size="sm" /> : <Search size={13} />}
              {loading ? 'Querying' : 'Resolve'}
            </button>
          </div>

          {/* Quick examples */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_EXAMPLES.map(ex => (
              <button
                key={ex.label}
                onClick={() => { setQuery(ex.q); setType(ex.t as RecordType); resolve(ex.q, ex.t as RecordType) }}
                className="font-mono text-[10px] text-cyber-muted border border-cyber-border hover:border-cyber-cyan/40 hover:text-cyber-cyan rounded px-2 py-0.5 transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </TerminalCard>

      {error && (
        <div className="cyber-card-red p-3 font-mono text-xs text-cyber-red">{error}</div>
      )}

      {result && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`font-mono text-[10px] border rounded px-2 py-0.5 ${TYPE_COLORS[result.type] ?? 'text-cyber-muted border-cyber-border'}`}>
                {result.type}
              </span>
              <span className="font-mono text-xs text-cyber-text-hi">{result.query}</span>
            </div>
            <span className="font-mono text-[10px] text-cyber-muted">{result.records.length} record(s)</span>
          </div>

          {result.records.length === 0 ? (
            <div className="cyber-card p-4 text-center">
              <p className="font-mono text-xs text-cyber-muted">No {result.type} records found for {result.query}</p>
            </div>
          ) : (
            <TerminalCard title="Records" accent="cyan">
              <div className="space-y-0">
                {result.records.map((rec, i) => (
                  <RecordRow key={i} rec={rec} formatTtl={formatTtl} />
                ))}
              </div>
            </TerminalCard>
          )}

          {/* Raw JSON toggle */}
          <div>
            <button
              className="flex items-center gap-1 font-mono text-[10px] text-cyber-muted hover:text-cyber-text transition-colors"
              onClick={() => setShowRaw(p => !p)}
            >
              {showRaw ? <ChevronUp size={10} /> : <ChevronDown size={10} />} Raw response
            </button>
            {showRaw && (
              <div className="mt-2 relative">
                <pre className="font-mono text-[10px] text-cyber-muted bg-cyber-bg border border-cyber-border rounded p-3 overflow-x-auto max-h-60">
                  {JSON.stringify(result, null, 2)}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={JSON.stringify(result, null, 2)} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RecordRow({ rec, formatTtl }: { rec: DnsRecord; formatTtl: (ttl?: number) => string }) {
  const [exp, setExp] = useState(false)
  const long = rec.value.length > 80

  return (
    <div className="py-2 border-b border-cyber-border/30 last:border-0">
      <div className="flex items-start gap-3">
        <span className={`font-mono text-[9px] border rounded px-1.5 py-px flex-none mt-0.5 ${TYPE_COLORS[rec.type] ?? 'text-cyber-muted border-cyber-border'}`}>
          {rec.type}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-cyber-muted truncate">{rec.name}</span>
            {rec.ttl && (
              <span className="font-mono text-[9px] text-cyber-muted flex-none">TTL {formatTtl(rec.ttl)}</span>
            )}
          </div>
          <p className={`font-mono text-[11px] text-cyber-text-hi mt-0.5 ${long && !exp ? 'truncate' : 'break-all'}`}>
            {rec.value}
          </p>
          {long && (
            <button className="font-mono text-[9px] text-cyber-cyan hover:underline mt-0.5"
              onClick={() => setExp(p => !p)}>
              {exp ? 'show less' : 'show full'}
            </button>
          )}
        </div>
        <CopyButton text={rec.value} />
      </div>
    </div>
  )
}
