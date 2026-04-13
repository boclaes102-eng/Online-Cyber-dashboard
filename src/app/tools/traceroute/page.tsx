'use client'

import { useState } from 'react'
import { Route, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { TraceResult, TraceHop } from '@/app/api/traceroute/route'

const PRIVATE_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.)/

function isPrivateIp(ip: string) {
  return PRIVATE_RE.test(ip)
}

function rttColor(ms: number): string {
  if (ms < 10)  return 'bg-cyber-green'
  if (ms < 50)  return 'bg-cyber-cyan'
  if (ms < 150) return 'bg-cyber-orange'
  return 'bg-cyber-red'
}

function HopCard({
  hop,
  maxAvg,
  prevAs,
  isLast,
}: {
  hop: TraceHop
  maxAvg: number
  prevAs: string | undefined
  isLast: boolean
}) {
  const isNewAs  = !!hop.as && hop.as !== prevAs
  const pct      = hop.avg && maxAvg > 0 ? Math.min((hop.avg / maxAvg) * 100, 100) : 0
  const isLocal  = hop.ip ? isPrivateIp(hop.ip) : false

  let borderClass = 'border-cyber-border/40'
  if (hop.timeout)    borderClass = 'border-cyber-border/20 opacity-50'
  else if (isLast)    borderClass = 'border-cyber-green/30'
  else if (isNewAs)   borderClass = 'border-cyber-cyan/25'

  return (
    <div className="relative pl-4">
      {/* Vertical connector */}
      <div className="absolute left-[0.9rem] top-0 bottom-0 w-px bg-cyber-border/30" />
      {/* Node dot */}
      <div className={`absolute left-[0.6rem] top-4 w-1.5 h-1.5 rounded-full ${
        hop.timeout ? 'bg-cyber-border' : isLast ? 'bg-cyber-green' : 'bg-cyber-cyan'
      }`} />

      <div className={`ml-4 mb-2 p-3 rounded border ${borderClass} bg-cyber-card`}>
        <div className="flex items-start justify-between gap-2">
          {/* Left: hop info */}
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <span className="font-mono text-[10px] text-cyber-muted w-5 flex-none pt-0.5">
              {hop.num.toString().padStart(2, '0')}
            </span>

            {hop.timeout ? (
              <div>
                <p className="font-mono text-xs text-cyber-muted">* * *  — no response</p>
                <p className="font-mono text-[10px] text-cyber-muted">{hop.loss}% packet loss</p>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                {/* IP + hostname */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-mono text-xs ${isLocal ? 'text-cyber-text' : 'text-cyber-cyan'}`}>
                    {hop.ip ?? hop.hostname ?? '—'}
                  </span>
                  {hop.hostname && hop.hostname !== hop.ip && (
                    <span className="font-mono text-[10px] text-cyber-muted truncate">
                      {hop.hostname}
                    </span>
                  )}
                  {hop.countryCode && (
                    <span className="font-mono text-[9px] text-cyber-muted border border-cyber-border/40 rounded px-1">
                      {hop.countryCode}
                    </span>
                  )}
                  {isLocal && (
                    <span className="font-mono text-[9px] text-cyber-muted">LOCAL</span>
                  )}
                </div>

                {/* RTT bar */}
                {hop.avg !== null && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-20 h-1.5 bg-cyber-border/30 rounded-full overflow-hidden flex-none">
                      <div
                        className={`h-full rounded-full ${rttColor(hop.avg)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-cyber-text-hi">{hop.avg.toFixed(1)} ms avg</span>
                    {hop.worst !== null && hop.worst > hop.avg * 2 && (
                      <span className="font-mono text-[10px] text-cyber-orange">peak {hop.worst.toFixed(0)} ms</span>
                    )}
                    {hop.loss > 0 && (
                      <span className="font-mono text-[10px] text-red-400">{hop.loss}% loss</span>
                    )}
                  </div>
                )}

                {/* ASN / org */}
                {hop.as && (
                  <p className="font-mono text-[10px] text-cyber-purple mt-0.5">{hop.as}</p>
                )}
              </div>
            )}
          </div>

          {/* Right: AS boundary badge */}
          {isNewAs && !hop.timeout && (
            <span className="font-mono text-[8px] text-cyber-cyan border border-cyber-cyan/30 rounded px-1.5 py-0.5 flex-none whitespace-nowrap">
              AS BOUNDARY
            </span>
          )}
          {isLast && !hop.timeout && (
            <CheckCircle size={12} className="text-cyber-green flex-none mt-0.5" />
          )}
        </div>
      </div>
    </div>
  )
}

export default function TraceroutePage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<TraceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function lookup(t?: string) {
    const target = (t ?? query).trim()
    if (!target) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res  = await fetch(`/api/traceroute?target=${encodeURIComponent(target)}`)
      const data: TraceResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  const maxAvg = Math.max(...(result?.hops.map(h => h.avg ?? 0) ?? [1]))
  const asList = result?.hops.map(h => h.as) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-cyan/30 flex items-center justify-center bg-cyber-cyan/5 flex-none">
          <Route size={18} className="text-cyber-cyan" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Traceroute</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            MTR path trace with per-hop ASN/org enrichment. Highlights AS boundary crossings. May take up to 30 s.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Target" label="MTR" accent="cyan">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && lookup()}
            placeholder="google.com  or  8.8.8.8"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs rounded hover:bg-cyber-cyan/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <Route size={12} />}
            {loading ? 'Tracing…' : 'Trace'}
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['8.8.8.8', '1.1.1.1', 'github.com'].map(t => (
              <button
                key={t}
                onClick={() => { setQuery(t); lookup(t) }}
                className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-cyan hover:border-cyber-cyan/40 rounded transition-all"
              >
                {t}
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
          {/* Summary */}
          <TerminalCard title="Path Summary" label="TRACE" accent="cyan">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Target</p>
                <p className="font-mono text-sm text-cyber-cyan mt-1">{result.target}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Hops</p>
                <p className="font-mono text-sm text-cyber-text-hi mt-1">{result.hopCount}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">AS Crossings</p>
                <p className="font-mono text-sm text-cyber-text-hi mt-1">
                  {new Set(result.hops.map(h => h.as).filter(Boolean)).size}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Reached</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {result.reachedTarget
                    ? <><CheckCircle size={13} className="text-cyber-green" /><span className="font-mono text-sm text-cyber-green">Yes</span></>
                    : <><XCircle    size={13} className="text-red-400"     /><span className="font-mono text-sm text-red-400">No</span></>
                  }
                </div>
              </div>
            </div>
          </TerminalCard>

          {/* Hop path */}
          <TerminalCard title="Hop Path" label="PATH" accent="none">
            <div className="pt-1">
              {result.hops.map((hop, i) => (
                <HopCard
                  key={hop.num}
                  hop={hop}
                  maxAvg={maxAvg}
                  prevAs={asList[i - 1] ?? undefined}
                  isLast={i === result.hops.length - 1 && !hop.timeout}
                />
              ))}
            </div>
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
