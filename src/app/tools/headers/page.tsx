'use client'
import { useState } from 'react'
import { ShieldCheck, ShieldX, Loader2, ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'

interface Check { label: string; value: string | null; pass: boolean; points: number; maxPoints: number; note: string }
interface Result { url: string; status: number; finalUrl: string; score: number; grade: string; checks: Check[] }

const GRADE_STYLE: Record<string, string> = {
  'A+': 'text-green-400 border-green-500/40 bg-green-500/10',
  'A':  'text-green-400 border-green-500/40 bg-green-500/10',
  'B':  'text-cyan-400  border-cyan-500/40  bg-cyan-500/10',
  'C':  'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
  'D':  'text-orange-400 border-orange-500/40 bg-orange-500/10',
  'F':  'text-red-400   border-red-500/40   bg-red-500/10',
}

export default function HeadersPage() {
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<Result | null>(null)
  const [error, setError]     = useState('')

  async function scan() {
    if (!input.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`/api/headers?url=${encodeURIComponent(input.trim())}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch { setError('Request failed') } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">HTTP Security Headers</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Grade a website's security headers — CSP, HSTS, X-Frame-Options and more</p>
      </div>

      <div className="flex gap-2">
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && scan()}
          placeholder="https://example.com"
          className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
        />
        <button onClick={scan} disabled={loading || !input.trim()}
          className="px-4 py-2 bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 rounded font-mono text-xs text-cyber-cyan disabled:opacity-40 transition-all">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Analyze'}
        </button>
      </div>

      {error && <p className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</p>}

      {result && (
        <div className="space-y-4">
          {/* Grade card */}
          <div className="flex items-center gap-6 bg-cyber-surface border border-cyber-border rounded-lg p-4">
            <div className={clsx('w-20 h-20 rounded-lg border-2 flex items-center justify-center font-mono text-4xl font-bold', GRADE_STYLE[result.grade] ?? 'text-cyber-muted border-cyber-border')}>
              {result.grade}
            </div>
            <div>
              <p className="font-mono text-xs text-cyber-muted">Score</p>
              <p className="font-mono text-2xl font-bold text-cyber-text-hi">{result.score}<span className="text-sm text-cyber-muted">/100</span></p>
              <div className="w-48 h-1.5 bg-cyber-bg rounded-full mt-2 overflow-hidden">
                <div className={clsx('h-full rounded-full transition-all', result.score >= 80 ? 'bg-green-500' : result.score >= 50 ? 'bg-yellow-500' : 'bg-red-500')}
                  style={{ width: `${result.score}%` }} />
              </div>
              <a href={result.finalUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-[10px] text-cyber-cyan hover:underline mt-1">
                {result.finalUrl} <ExternalLink size={9} />
              </a>
            </div>
          </div>

          {/* Checks */}
          <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-cyber-border">
              <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">Header Checks</p>
            </div>
            <div className="divide-y divide-cyber-border">
              {result.checks.map(c => (
                <div key={c.label} className="flex items-start gap-3 px-4 py-3">
                  {c.pass
                    ? <ShieldCheck size={14} className="text-green-400 flex-none mt-0.5" />
                    : <ShieldX    size={14} className="text-red-400   flex-none mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs text-cyber-text-hi">{c.label}</p>
                      <span className="font-mono text-[10px] text-cyber-muted flex-none">{c.points}/{c.maxPoints} pts</span>
                    </div>
                    <p className="font-mono text-[10px] text-cyber-muted mt-0.5">{c.note}</p>
                    {c.value && !c.pass && (
                      <p className="font-mono text-[10px] text-orange-400 mt-0.5 truncate">Current: {c.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
