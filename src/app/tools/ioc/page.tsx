'use client'

import { useState } from 'react'
import { FileSearch, Search, ShieldAlert, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import type { IocResult, IocVerdict } from '@/lib/types'

const VERDICT_STYLE: Record<IocVerdict, { color: string; border: string; label: string }> = {
  MALICIOUS:  { color: 'text-cyber-red',   border: 'border-cyber-red/50',   label: 'MALICIOUS' },
  SUSPICIOUS: { color: 'text-cyber-orange',border: 'border-cyber-orange/40',label: 'SUSPICIOUS' },
  CLEAN:      { color: 'text-cyber-green', border: 'border-cyber-green/30', label: 'CLEAN' },
  UNKNOWN:    { color: 'text-cyber-muted', border: 'border-cyber-border',   label: 'UNKNOWN' },
}

const SOURCE_VERDICT_COLOR: Record<string, string> = {
  MALICIOUS:  'text-cyber-red',
  SUSPICIOUS: 'text-cyber-orange',
  CLEAN:      'text-cyber-green',
}

const EXAMPLES = [
  { label: 'WannaCry hash', ioc: '24d004a104d4d54034dbcffc2a4b19a11f39008a575aa614ea04703480b1022c' },
  { label: 'Mirai MD5',     ioc: 'c9a77f35b984f2fac1b8f05a4ce87f66' },
  { label: 'Abuse IP',      ioc: '185.220.101.45' },
  { label: 'Clean domain',  ioc: 'github.com' },
]

export default function IocPage() {
  const [ioc,     setIoc]     = useState('')
  const [result,  setResult]  = useState<IocResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function lookup(i?: string) {
    const target = (i ?? ioc).trim()
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/ioc?ioc=${encodeURIComponent(target)}`)
      const data: IocResult = await res.json()
      if (data.error && data.sources.length === 0) setError(data.error)
      else setResult(data)
    } catch (ex) { setError(ex instanceof Error ? ex.message : 'Request failed') }
    finally { setLoading(false) }
  }

  const r = result
  const style = r ? VERDICT_STYLE[r.verdict] : null

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileSearch size={16} className="text-cyber-orange" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">IOC Lookup</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Unified threat intel — paste any IP, domain, URL, or hash for instant multi-source reputation check
        </p>
      </div>

      <TerminalCard title="IOC Input" accent="none">
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              className="cyber-input font-mono flex-1"
              placeholder="IP address, domain, URL, MD5/SHA256 hash…"
              value={ioc}
              onChange={e => setIoc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookup()}
            />
            <button className="cyber-btn flex items-center gap-2" onClick={() => lookup()} disabled={loading || !ioc}>
              {loading ? <Spinner size="sm" /> : <Search size={13} />}
              {loading ? 'Checking' : 'Lookup'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map(ex => (
              <button key={ex.label}
                onClick={() => { setIoc(ex.ioc); lookup(ex.ioc) }}
                className="font-mono text-[10px] text-cyber-muted border border-cyber-border hover:border-cyber-orange/40 hover:text-cyber-orange rounded px-2 py-0.5 transition-colors">
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </TerminalCard>

      {error && <div className="cyber-card-red p-3 font-mono text-xs text-cyber-red">{error}</div>}

      {r && style && (
        <div className="space-y-4 animate-slide-up">
          {/* Verdict banner */}
          <div className={`cyber-card p-4 border ${style.border}`}>
            <div className="flex items-center gap-3">
              {r.verdict === 'MALICIOUS'
                ? <ShieldAlert size={20} className="text-cyber-red flex-none" />
                : r.verdict === 'SUSPICIOUS'
                  ? <AlertTriangle size={20} className="text-cyber-orange flex-none" />
                  : r.verdict === 'CLEAN'
                    ? <CheckCircle size={20} className="text-cyber-green flex-none" />
                    : <AlertTriangle size={20} className="text-cyber-muted flex-none" />}
              <div className="flex-1">
                <p className={`font-mono text-sm font-700 ${style.color}`}>{style.label}</p>
                <p className="font-mono text-[11px] text-cyber-muted mt-0.5 break-all">{r.ioc}</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] border border-cyber-border rounded px-2 py-1 text-cyber-muted">
                  {r.type}
                </span>
              </div>
            </div>
            {/* Score bar */}
            {r.score > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">Threat Score</span>
                  <span className={`font-mono text-[11px] font-600 ${style.color}`}>{r.score}/100</span>
                </div>
                <div className="h-1.5 bg-cyber-bg rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${r.verdict === 'MALICIOUS' ? 'bg-cyber-red' : r.verdict === 'SUSPICIOUS' ? 'bg-cyber-orange' : 'bg-cyber-green'}`}
                    style={{ width: `${r.score}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {r.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {r.tags.map(tag => (
                <span key={tag} className="font-mono text-[10px] border border-cyber-orange/30 text-cyber-orange bg-cyber-orange/5 rounded px-2 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Sources */}
          <TerminalCard title={`Intelligence Sources (${r.sources.length})`} accent="none">
            {r.sources.length === 0 ? (
              <p className="font-mono text-xs text-cyber-muted">
                No API keys configured. Add VT_API_KEY, ABUSEIPDB_API_KEY, or OTX_API_KEY to .env.local for richer results.
              </p>
            ) : (
              <div className="space-y-0">
                {r.sources.map((src, i) => (
                  <div key={i} className="py-2.5 border-b border-cyber-border/30 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {src.found
                          ? <ShieldAlert size={12} className="text-cyber-red" />
                          : <CheckCircle size={12} className="text-cyber-green" />}
                        <span className="font-mono text-[11px] text-cyber-text-hi">{src.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {src.verdict && (
                          <span className={`font-mono text-[10px] font-600 ${SOURCE_VERDICT_COLOR[src.verdict] ?? 'text-cyber-muted'}`}>
                            {src.verdict}
                          </span>
                        )}
                        {src.url && (
                          <a href={src.url} target="_blank" rel="noopener noreferrer"
                            className="text-cyber-muted hover:text-cyber-cyan transition-colors">
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                    {src.details && (
                      <p className="font-mono text-[10px] text-cyber-muted mt-1 ml-5">{src.details}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TerminalCard>
        </div>
      )}

      {!r && !loading && (
        <TerminalCard title="Supported IOC Types" accent="none">
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'IP Address',  desc: 'AbuseIPDB + VirusTotal + OTX', ex: '185.220.101.45' },
              { type: 'Domain',      desc: 'URLhaus + VirusTotal + OTX',   ex: 'malware.example.com' },
              { type: 'URL',         desc: 'URLhaus + VirusTotal + OTX',   ex: 'https://evil.example/payload' },
              { type: 'Hash',        desc: 'MalwareBazaar + VirusTotal + OTX', ex: 'MD5, SHA1, SHA256, SHA512' },
            ].map(({ type, desc, ex }) => (
              <div key={type} className="p-2 border border-cyber-border rounded">
                <p className="font-mono text-[11px] text-cyber-text-hi font-600">{type}</p>
                <p className="font-mono text-[10px] text-cyber-muted mt-0.5">{desc}</p>
                <p className="font-mono text-[9px] text-cyber-muted/60 mt-1">{ex}</p>
              </div>
            ))}
          </div>
          <p className="font-mono text-[9px] text-cyber-muted mt-3 pt-3 border-t border-cyber-border/30">
            Optional keys: <span className="text-cyber-cyan">VT_API_KEY</span> · <span className="text-cyber-cyan">ABUSEIPDB_API_KEY</span> · <span className="text-cyber-cyan">OTX_API_KEY</span> → add to .env.local
          </p>
        </TerminalCard>
      )}
    </div>
  )
}
