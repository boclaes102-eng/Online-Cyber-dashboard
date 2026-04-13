'use client'

import { useState } from 'react'
import { Fish, AlertTriangle, CheckCircle, AlertOctagon, HelpCircle, ExternalLink } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { PhishTankResult } from '@/app/api/phishtank/route'

export default function PhishTankPage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<PhishTankResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function lookup(q?: string) {
    const target = (q ?? query).trim()
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/phishtank?url=${encodeURIComponent(target)}`)
      const data: PhishTankResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  const verdict = result?.verdict

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-orange/30 flex items-center justify-center bg-cyber-orange/5 flex-none">
          <Fish size={18} className="text-cyber-orange" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">PhishTank Checker</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Check URLs against PhishTank&apos;s community-verified phishing database. Add PHISHTANK_API_KEY for higher rate limits.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Suspicious URL" label="PHISH" accent="orange">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && lookup()}
            placeholder="https://suspicious-site.example.com/login"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-orange/50"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-orange/10 border border-cyber-orange/30 text-cyber-orange font-mono text-xs rounded hover:bg-cyber-orange/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <Fish size={12} />}
            Check
          </button>
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
          {/* Verdict banner */}
          {verdict === 'phishing' && (
            <div className="flex items-start gap-4 p-5 rounded border border-red-400/30 bg-red-400/5">
              <AlertOctagon size={22} className="text-red-400 flex-none mt-0.5" />
              <div>
                <p className="font-mono text-sm font-semibold tracking-widest uppercase text-red-400">PHISHING URL CONFIRMED</p>
                <p className="font-mono text-xs text-cyber-text mt-1.5 leading-relaxed">{result.verdictDetail}</p>
              </div>
            </div>
          )}

          {verdict === 'not_found' && (
            <div className="flex items-start gap-4 p-5 rounded border border-cyber-green/30 bg-cyber-green/5">
              <CheckCircle size={22} className="text-cyber-green flex-none mt-0.5" />
              <div>
                <p className="font-mono text-sm font-semibold tracking-widest uppercase text-cyber-green">NOT IN PHISHTANK DATABASE</p>
                <p className="font-mono text-xs text-cyber-text mt-1.5 leading-relaxed">{result.verdictDetail}</p>
              </div>
            </div>
          )}

          {verdict === 'unknown' && (
            <div className="flex items-start gap-4 p-5 rounded border border-cyber-border bg-transparent">
              <HelpCircle size={22} className="text-cyber-muted flex-none mt-0.5" />
              <div>
                <p className="font-mono text-sm font-semibold tracking-widest uppercase text-cyber-muted">UNKNOWN</p>
                <p className="font-mono text-xs text-cyber-text mt-1.5 leading-relaxed">{result.verdictDetail}</p>
              </div>
            </div>
          )}

          {/* PhishTank details */}
          {result.phishtank?.inDatabase && (
            <TerminalCard title="PhishTank Report" label="PT" accent="none">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  { label: 'Phish ID',  value: result.phishtank.phishId },
                  { label: 'Verified',  value: result.phishtank.verified ? 'Yes' : 'No' },
                  { label: 'Valid',     value: result.phishtank.valid    ? 'Yes' : 'No' },
                  { label: 'Submitted', value: result.phishtank.submittedAt },
                ].filter(r => r.value !== null).map(({ label, value }) => (
                  <div key={label}>
                    <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">{label}</p>
                    <p className={`font-mono text-xs mt-0.5 ${
                      label === 'Valid' && value === 'Yes' ? 'text-red-400' :
                      label === 'Verified' && value === 'Yes' ? 'text-cyber-orange' :
                      'text-cyber-text-hi'
                    }`}>{value}</p>
                  </div>
                ))}
              </div>

              {result.phishtank.phishDetailPage && (
                <a
                  href={result.phishtank.phishDetailPage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 font-mono text-[10px] text-cyber-muted hover:text-cyber-orange transition-colors"
                >
                  <ExternalLink size={10} />
                  View on PhishTank
                </a>
              )}
            </TerminalCard>
          )}

          {/* Info note */}
          <TerminalCard title="Coverage Notes" label="INFO" accent="none">
            <div className="space-y-2">
              {[
                { src: 'PhishTank',  note: 'Community-verified phishing reports. High precision — confirmed reports only. Coverage depends on community submission volume.' },
                { src: 'Rate limits', note: 'Without PHISHTANK_API_KEY the API is heavily rate-limited. Add a free API key from phishtank.org for reliable access.' },
              ].map(({ src, note }) => (
                <div key={src} className="flex gap-3 items-start">
                  <span className="font-mono text-[9px] text-cyber-orange border border-cyber-orange/30 rounded px-1.5 py-0.5 flex-none">{src}</span>
                  <p className="font-mono text-[10px] text-cyber-muted leading-relaxed">{note}</p>
                </div>
              ))}
            </div>
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
