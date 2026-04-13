'use client'

import { useState } from 'react'
import { FlaskConical, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { ThreatFoxResult, ThreatFoxIoc } from '@/app/api/threatfox/route'

function confidenceColor(n: number): string {
  if (n >= 75) return 'text-red-400'
  if (n >= 50) return 'text-cyber-orange'
  if (n >= 25) return 'text-yellow-400'
  return 'text-cyber-muted'
}

function IocCard({ ioc }: { ioc: ThreatFoxIoc }) {
  return (
    <div className="p-3 rounded border border-cyber-border/40 bg-cyber-bg space-y-2">
      {/* IOC value */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-cyber-cyan break-all">{ioc.ioc}</span>
        <span className="font-mono text-[9px] text-cyber-muted border border-cyber-border/40 rounded px-1.5 py-0.5 flex-none">
          {ioc.iocType}
        </span>
      </div>

      {/* Malware + threat */}
      <div className="flex items-center gap-3 flex-wrap">
        {ioc.malwarePrintable && (
          <span className="font-mono text-[10px] text-red-400 border border-red-400/30 rounded px-1.5 py-0.5">
            {ioc.malwarePrintable}
          </span>
        )}
        {ioc.threatTypeDesc && (
          <span className="font-mono text-[10px] text-cyber-orange border border-cyber-orange/30 rounded px-1.5 py-0.5">
            {ioc.threatTypeDesc}
          </span>
        )}
        {ioc.tags?.map(t => (
          <span key={t} className="font-mono text-[9px] text-cyber-cyan border border-cyber-cyan/30 rounded px-1">{t}</span>
        ))}
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-[10px] font-mono flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-cyber-muted">Reporter: <span className="text-cyber-text">{ioc.reporter}</span></span>
          {ioc.firstSeen && (
            <span className="text-cyber-muted">Since: <span className="text-cyber-text">{ioc.firstSeen.slice(0, 10)}</span></span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`${confidenceColor(ioc.confidence)} font-semibold`}>{ioc.confidence}%</span>
          <span className="text-cyber-muted">confidence</span>
          {ioc.malwareMwmpUrl && (
            <a href={ioc.malwareMwmpUrl} target="_blank" rel="noopener noreferrer" className="text-cyber-muted hover:text-cyber-red transition-colors">
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ThreatFoxPage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<ThreatFoxResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function lookup(q?: string) {
    const target = (q ?? query).trim()
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/threatfox?q=${encodeURIComponent(target)}`)
      const data: ThreatFoxResult = await res.json()
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
        <div className="w-10 h-10 rounded border border-cyber-red/30 flex items-center justify-center bg-cyber-red/5 flex-none">
          <FlaskConical size={18} className="text-cyber-red" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">ThreatFox IOC Lookup</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Search abuse.ch&apos;s ThreatFox IOC database — IPs, domains, URLs, file hashes with malware family context.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="IOC Query" label="THREATFOX" accent="red">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && lookup()}
            placeholder="IP, domain, URL, MD5, SHA256…"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-red/50"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red font-mono text-xs rounded hover:bg-cyber-red/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <FlaskConical size={12} />}
            Search
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['185.220.101.45', 'cobalt-strike.biz', '44d88612fea8a8f36de82e1278abb02f'].map(ex => (
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

        <p className="font-mono text-[9px] text-cyber-muted mt-3">
          Supported: IP addresses, IP:port, domains, full URLs, MD5 / SHA256 hashes. Powered by abuse.ch ThreatFox — no API key required.
        </p>
      </TerminalCard>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded font-mono text-xs text-red-400">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Verdict summary */}
          {result.iocs.length === 0 ? (
            <div className="flex items-start gap-4 p-5 rounded border border-cyber-green/30 bg-cyber-green/5">
              <CheckCircle size={22} className="text-cyber-green flex-none mt-0.5" />
              <div>
                <p className="font-mono text-sm font-semibold tracking-widest uppercase text-cyber-green">
                  NOT IN THREATFOX
                </p>
                <p className="font-mono text-xs text-cyber-text mt-1.5 leading-relaxed">
                  No IOC records found for <span className="text-cyber-cyan">{result.query}</span> in ThreatFox.
                  Absence does not guarantee the indicator is safe.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 p-5 rounded border border-red-400/30 bg-red-400/5">
              <FlaskConical size={22} className="text-red-400 flex-none mt-0.5" />
              <div>
                <p className="font-mono text-sm font-semibold tracking-widest uppercase text-red-400">
                  {result.total} IOC RECORD{result.total !== 1 ? 'S' : ''} FOUND
                </p>
                <p className="font-mono text-xs text-cyber-text mt-1.5 leading-relaxed">
                  This indicator appears in ThreatFox. Review the malware families and confidence levels below.
                </p>
              </div>
            </div>
          )}

          {/* IOC cards */}
          {result.iocs.length > 0 && (
            <TerminalCard title={`IOC Records (${result.iocs.length})`} label="IOC" accent="none">
              <div className="space-y-2">
                {result.iocs.map(ioc => <IocCard key={ioc.id} ioc={ioc} />)}
              </div>
            </TerminalCard>
          )}
        </div>
      )}
    </div>
  )
}
