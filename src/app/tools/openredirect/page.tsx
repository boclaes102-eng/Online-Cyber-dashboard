'use client'

import { useState } from 'react'
import { CornerDownRight, AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { OpenRedirectResult, RedirectTest } from '@/app/api/openredirect/route'

function ParamRow({ t }: { t: RedirectTest }) {
  return (
    <div className={`grid grid-cols-[auto_auto_1fr] gap-3 items-start py-2 border-b border-cyber-border/20 last:border-0 ${t.vulnerable ? 'bg-red-400/5 -mx-3 px-3 rounded' : ''}`}>
      {/* Param name */}
      <span className={`font-mono text-xs font-semibold flex-none ${t.vulnerable ? 'text-red-400' : 'text-cyber-text-hi'}`}>
        ?{t.param}=
      </span>

      {/* Status */}
      <span className={`font-mono text-[10px] flex-none ${
        t.vulnerable ? 'text-red-400' :
        t.status === null ? 'text-cyber-muted' :
        [301,302,303,307,308].includes(t.status ?? 0) ? 'text-cyber-orange' : 'text-cyber-muted'
      }`}>
        {t.status ?? '—'}
      </span>

      {/* Finding */}
      <span className={`font-mono text-[10px] leading-relaxed ${t.vulnerable ? 'text-red-400 font-semibold' : 'text-cyber-muted'}`}>
        {t.finding}
      </span>
    </div>
  )
}

export default function OpenRedirectPage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<OpenRedirectResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showAll, setShowAll] = useState(false)

  async function lookup(q?: string) {
    const target = (q ?? query).trim()
    if (!target) return
    setLoading(true); setError(''); setResult(null); setShowAll(false)
    try {
      const res  = await fetch(`/api/openredirect?url=${encodeURIComponent(target)}`)
      const data: OpenRedirectResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  const vulnTests  = result?.tests.filter(t => t.vulnerable) ?? []
  const otherTests = result?.tests.filter(t => !t.vulnerable) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-orange/30 flex items-center justify-center bg-cyber-orange/5 flex-none">
          <CornerDownRight size={18} className="text-cyber-orange" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Open Redirect Tester</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Fuzz common redirect parameters with a canary URL. Detects reflected open redirects via 3xx Location header analysis.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Target URL" label="FUZZ" accent="orange">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && lookup()}
            placeholder="https://example.com/login   or   example.com"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-orange/50"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-orange/10 border border-cyber-orange/30 text-cyber-orange font-mono text-xs rounded hover:bg-cyber-orange/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <CornerDownRight size={12} />}
            {loading ? 'Fuzzing…' : 'Fuzz'}
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['https://accounts.google.com', 'https://github.com/login', 'https://httpbin.org/redirect-to'].map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); lookup(ex) }}
                className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-orange hover:border-cyber-orange/40 rounded transition-all"
              >
                {ex.replace('https://', '')}
              </button>
            ))}
          </div>
        )}

        <p className="font-mono text-[9px] text-cyber-muted mt-3">
          Tests {26} parameters: redirect, url, next, to, return, returnUrl, destination, goto, continue, and more.
          Uses IANA-reserved .invalid canary — no real external requests follow.
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
          {/* Verdict */}
          {result.vulnerable ? (
            <div className="flex items-start gap-4 p-5 rounded border border-red-400/30 bg-red-400/5">
              <AlertOctagon size={22} className="text-red-400 flex-none mt-0.5" />
              <div>
                <p className="font-mono text-sm font-semibold tracking-widest uppercase text-red-400">
                  OPEN REDIRECT DETECTED
                </p>
                <p className="font-mono text-xs text-cyber-text mt-1.5 leading-relaxed">
                  The following parameters redirect to arbitrary URLs:{' '}
                  <span className="text-red-400">{result.vulnerableParams.map(p => `?${p}=`).join(', ')}</span>
                  . This can be used for phishing via trusted domain links.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 p-5 rounded border border-cyber-green/30 bg-cyber-green/5">
              <CheckCircle size={22} className="text-cyber-green flex-none mt-0.5" />
              <div>
                <p className="font-mono text-sm font-semibold tracking-widest uppercase text-cyber-green">
                  NO OPEN REDIRECT FOUND
                </p>
                <p className="font-mono text-xs text-cyber-text mt-1.5 leading-relaxed">
                  None of the tested parameters reflected the canary host in a Location header.
                  Server-side validation or lack of redirect logic in place.
                </p>
              </div>
            </div>
          )}

          {/* Vulnerable params (shown first, always) */}
          {vulnTests.length > 0 && (
            <TerminalCard title={`Vulnerable Parameters (${vulnTests.length})`} label="HIT" accent="none">
              <div className="space-y-0">
                {vulnTests.map(t => <ParamRow key={t.param} t={t} />)}
              </div>
            </TerminalCard>
          )}

          {/* All results */}
          <TerminalCard title={`All Parameter Tests (${result.tests.length})`} label="FUZZ" accent="none">
            <div className="space-y-0">
              {(showAll ? result.tests : otherTests.slice(0, 10)).map(t => <ParamRow key={t.param} t={t} />)}
            </div>
            {!showAll && otherTests.length > 10 && (
              <button
                onClick={() => setShowAll(true)}
                className="mt-3 font-mono text-[10px] text-cyber-muted hover:text-cyber-text transition-colors"
              >
                Show {otherTests.length - 10} more…
              </button>
            )}
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
