'use client'

import { useState } from 'react'
import { Flag, AlertTriangle, CheckCircle, HelpCircle, AlertOctagon, Shield } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { BgpHijackResult, HijackVerdict, RpkiStatus } from '@/app/api/bgphijack/route'

const VERDICT_CONFIG: Record<
  HijackVerdict,
  { label: string; color: string; border: string; bg: string; Icon: React.ElementType }
> = {
  clean:       { label: 'NO HIJACK DETECTED',  color: 'text-cyber-green',  border: 'border-cyber-green/30',  bg: 'bg-cyber-green/5',  Icon: CheckCircle    },
  suspicious:  { label: 'POTENTIAL HIJACK',     color: 'text-red-400',      border: 'border-red-400/30',      bg: 'bg-red-400/5',      Icon: AlertOctagon   },
  unverified:  { label: 'UNVERIFIED — NO RPKI', color: 'text-cyber-orange', border: 'border-cyber-orange/30', bg: 'bg-cyber-orange/5', Icon: AlertTriangle  },
  unknown:     { label: 'UNKNOWN',              color: 'text-cyber-muted',  border: 'border-cyber-border',    bg: 'bg-transparent',    Icon: HelpCircle     },
}

const RPKI_BADGE: Record<RpkiStatus, { label: string; color: string }> = {
  'valid':     { label: 'VALID',     color: 'text-cyber-green  border-cyber-green/30  bg-cyber-green/10'  },
  'invalid':   { label: 'INVALID',   color: 'text-red-400      border-red-400/30      bg-red-400/10'      },
  'not-found': { label: 'NOT FOUND', color: 'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/10' },
  'unknown':   { label: 'UNKNOWN',   color: 'text-cyber-muted  border-cyber-border    bg-transparent'     },
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">{label}</p>
      <div className="font-mono text-xs text-cyber-text-hi mt-0.5">{value}</div>
    </div>
  )
}

export default function BgpHijackPage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<BgpHijackResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function lookup(q?: string) {
    const target = (q ?? query).trim()
    if (!target) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res  = await fetch(`/api/bgphijack?q=${encodeURIComponent(target)}`)
      const data: BgpHijackResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  const vc = result ? VERDICT_CONFIG[result.verdict] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-red/30 flex items-center justify-center bg-cyber-red/5 flex-none">
          <Flag size={18} className="text-cyber-red" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">BGP Hijack Checker</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Validate route announcements against RPKI ROAs via BGPView + RIPE Stat. Detects unauthorized origin ASNs.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Target" label="BGP" accent="red">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && lookup()}
            placeholder="8.8.8.8   or   8.8.8.0/24   or   AS15169"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-red/50"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red font-mono text-xs rounded hover:bg-cyber-red/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <Flag size={12} />}
            Check
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['8.8.8.8', '1.1.1.0/24', 'AS13335'].map(ex => (
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded font-mono text-xs text-red-400">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {result && vc && (
        <div className="space-y-4 animate-slide-up">
          {/* Verdict banner */}
          <div className={`flex items-start gap-4 p-5 rounded border ${vc.border} ${vc.bg}`}>
            <vc.Icon size={22} className={`${vc.color} flex-none mt-0.5`} />
            <div>
              <p className={`font-mono text-sm font-semibold tracking-widest uppercase ${vc.color}`}>
                {vc.label}
              </p>
              <p className="font-mono text-xs text-cyber-text mt-1.5 leading-relaxed">
                {result.verdictDetail}
              </p>
            </div>
          </div>

          {/* Route details */}
          <TerminalCard title="Route Details" label="BGP" accent="none">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Row label="Input"      value={result.input} />
              <Row label="Prefix"     value={<span className="text-cyber-cyan">{result.prefix ?? '—'}</span>} />
              <Row label="Origin ASN" value={
                result.originAsn
                  ? <span>AS{result.originAsn}{result.originAsnName ? ` — ${result.originAsnName}` : ''}</span>
                  : '—'
              } />
              <Row label="Routed"     value={
                result.isRouted
                  ? <span className="text-cyber-green">Yes</span>
                  : <span className="text-cyber-muted">No</span>
              } />
            </div>
          </TerminalCard>

          {/* RPKI result */}
          <TerminalCard title="RPKI Validation" label="ROV" accent="none">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Shield size={13} className="text-cyber-muted" />
                <span className="font-mono text-xs text-cyber-muted">Route Origin Validation status:</span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${RPKI_BADGE[result.rpkiStatus].color}`}>
                  {RPKI_BADGE[result.rpkiStatus].label}
                </span>
              </div>

              {result.rpkiRoas.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-2">
                    Matching ROAs
                  </p>
                  <div className="space-y-1">
                    {result.rpkiRoas.map((roa, i) => (
                      <div key={i} className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-cyber-cyan">{roa.prefix}</span>
                        <span className="text-cyber-muted">←</span>
                        <span className="text-cyber-text-hi">AS{roa.origin}</span>
                        <span className="text-cyber-muted text-[10px]">maxLen /{roa.maxLength}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.rpkiStatus === 'not-found' && (
                <p className="font-mono text-[10px] text-cyber-muted">
                  No ROA exists for this prefix. Without RPKI coverage, anyone can announce this prefix and routers that enforce ROV will not filter it.
                </p>
              )}
            </div>
          </TerminalCard>

          {/* Upstream peers */}
          {result.upstreamPeers.length > 0 && (
            <TerminalCard title="Upstream Peers" label="PEERS" accent="none">
              <div className="grid grid-cols-2 gap-2">
                {result.upstreamPeers.map(peer => (
                  <div
                    key={peer.asn}
                    className="flex items-center gap-2 p-2 rounded border border-cyber-border/40 bg-cyber-bg"
                  >
                    <span className="font-mono text-[10px] text-cyber-cyan flex-none">AS{peer.asn}</span>
                    <span className="font-mono text-[10px] text-cyber-text truncate">{peer.name}</span>
                    {peer.countryCode && (
                      <span className="font-mono text-[9px] text-cyber-muted ml-auto flex-none">{peer.countryCode}</span>
                    )}
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
