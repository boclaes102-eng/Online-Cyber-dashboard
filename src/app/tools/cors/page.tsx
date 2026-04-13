'use client'

import { useState } from 'react'
import { ArrowLeftRight, AlertTriangle, CheckCircle, AlertOctagon, Info } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { CorsResult, CorsTest } from '@/app/api/cors/route'

const SEVERITY_STYLE = {
  critical: { badge: 'text-red-400 border-red-400/40 bg-red-400/10',     dot: 'bg-red-400'         },
  high:     { badge: 'text-cyber-orange border-cyber-orange/40 bg-cyber-orange/10', dot: 'bg-cyber-orange' },
  medium:   { badge: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',       dot: 'bg-yellow-400'  },
  info:     { badge: 'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10',        dot: 'bg-cyber-cyan'  },
  safe:     { badge: 'text-cyber-green border-cyber-green/40 bg-cyber-green/10',     dot: 'bg-cyber-green' },
}

const VERDICT_CONFIG = {
  vulnerable:    { label: 'VULNERABLE',     color: 'text-red-400',       border: 'border-red-400/30',       bg: 'bg-red-400/5',       Icon: AlertOctagon  },
  misconfigured: { label: 'MISCONFIGURED',  color: 'text-cyber-orange',  border: 'border-cyber-orange/30',  bg: 'bg-cyber-orange/5',  Icon: AlertTriangle },
  safe:          { label: 'POLICY SAFE',    color: 'text-cyber-green',   border: 'border-cyber-green/30',   bg: 'bg-cyber-green/5',   Icon: CheckCircle   },
}

function TestRow({ t }: { t: CorsTest }) {
  const sty = SEVERITY_STYLE[t.severity]
  return (
    <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-3 items-start py-2 border-b border-cyber-border/20 last:border-0">
      {/* Origin */}
      <div>
        <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-0.5">{t.label}</p>
        <p className="font-mono text-xs text-cyber-cyan break-all">{t.origin}</p>
      </div>

      {/* ACAO */}
      <div className="text-right">
        <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-0.5">ACAO</p>
        <p className="font-mono text-xs text-cyber-text-hi">{t.acao ?? '—'}</p>
      </div>

      {/* ACAC */}
      <div className="text-right">
        <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-0.5">ACAC</p>
        <p className={`font-mono text-xs ${t.acac ? 'text-red-400' : 'text-cyber-muted'}`}>
          {t.acac ? 'true' : 'false'}
        </p>
      </div>

      {/* Finding */}
      <div>
        <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-0.5">Finding</p>
        <div className="flex items-start gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-none mt-1.5 ${sty.dot}`} />
          <p className="font-mono text-xs text-cyber-text leading-relaxed">{t.finding}</p>
        </div>
      </div>
    </div>
  )
}

export default function CorsPage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<CorsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function lookup(q?: string) {
    const target = (q ?? query).trim()
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/cors?url=${encodeURIComponent(target)}`)
      const data: CorsResult = await res.json()
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
        <div className="w-10 h-10 rounded border border-cyber-purple/30 flex items-center justify-center bg-cyber-purple/5 flex-none">
          <ArrowLeftRight size={18} className="text-cyber-purple" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">CORS Checker</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Test if a URL reflects arbitrary origins in Access-Control-Allow-Origin. Detects credential-leaking misconfigurations.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Target URL" label="CORS" accent="cyan">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && lookup()}
            placeholder="https://api.example.com   or   example.com"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-purple/50"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple font-mono text-xs rounded hover:bg-cyber-purple/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <ArrowLeftRight size={12} />}
            Test
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['https://httpbin.org', 'https://api.github.com', 'https://jsonplaceholder.typicode.com'].map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); lookup(ex) }}
                className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-purple hover:border-cyber-purple/40 rounded transition-all"
              >
                {ex.replace('https://', '')}
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

      {result && vc && (
        <div className="space-y-4 animate-slide-up">
          {/* Verdict */}
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

          {/* Test results */}
          <TerminalCard title="Origin Tests" label="CORS" accent="none">
            <div className="space-y-0">
              {result.tests.map(t => <TestRow key={t.origin} t={t} />)}
            </div>
          </TerminalCard>

          {/* Legend */}
          <TerminalCard title="CORS Concepts" label="INFO" accent="none">
            <div className="grid grid-cols-1 gap-2">
              {[
                { term: 'ACAO',  def: 'Access-Control-Allow-Origin — the origin the server allows cross-origin access from'      },
                { term: 'ACAC',  def: 'Access-Control-Allow-Credentials — if true, cookies/tokens are sent with cross-origin requests' },
                { term: 'ACAM',  def: 'Access-Control-Allow-Methods — HTTP methods permitted for cross-origin preflight requests'  },
              ].map(({ term, def }) => (
                <div key={term} className="flex gap-3 items-start">
                  <span className="font-mono text-[10px] text-cyber-purple border border-cyber-purple/30 rounded px-1.5 py-0.5 flex-none">{term}</span>
                  <p className="font-mono text-[10px] text-cyber-muted leading-relaxed">{def}</p>
                </div>
              ))}
            </div>
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
