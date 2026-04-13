'use client'
import { useState } from 'react'
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { clsx } from 'clsx'

interface DkimResult { selector: string; found: boolean; value?: string }
interface EmailSecResult {
  domain: string
  spf: { record: string | null; exists: boolean; strictness: string; spoofable: boolean }
  dmarc: { record: string | null; policy: string; pct: number; spoofable: boolean }
  dkim: { found: boolean; selectors: DkimResult[] }
  mtaSts: { found: boolean; record: string | null }
  bimi: { found: boolean }
  spoofable: boolean
  riskScore: number
  verdict: 'PROTECTED' | 'PARTIAL' | 'VULNERABLE'
}

const VERDICT_STYLE: Record<string, string> = {
  PROTECTED: 'bg-green-500/10 border-green-500/30 text-green-400',
  PARTIAL:   'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  VULNERABLE:'bg-red-500/10   border-red-500/30   text-red-400',
}

export default function EmailSecPage() {
  const [input, setInput]   = useState('')
  const [loading, setLoad]  = useState(false)
  const [result, setResult] = useState<EmailSecResult | null>(null)
  const [error, setError]   = useState('')

  async function scan() {
    const domain = input.trim().replace(/^https?:\/\//, '').replace(/^.*@/, '').split('/')[0]
    if (!domain) return
    setLoad(true); setError(''); setResult(null)
    try {
      const res = await fetch(`/api/emailsec?domain=${encodeURIComponent(domain)}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch { setError('Request failed') } finally { setLoad(false) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">Email Security (SPF / DKIM / DMARC)</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Analyze a domain's email security posture and spoofability risk</p>
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && scan()}
          placeholder="example.com or user@example.com"
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
          {/* Verdict */}
          <div className={clsx('flex items-center gap-3 px-4 py-3 rounded-lg border', VERDICT_STYLE[result.verdict])}>
            {result.verdict === 'PROTECTED' ? <ShieldCheck size={20} /> : result.verdict === 'PARTIAL' ? <ShieldAlert size={20} /> : <ShieldX size={20} />}
            <div className="flex-1">
              <p className="font-mono text-sm font-bold">{result.verdict} — {result.spoofable ? 'Domain can be spoofed' : 'Spoofing prevented'}</p>
              <p className="font-mono text-[10px] opacity-70">Risk score: {result.riskScore}/100</p>
            </div>
            <div className="w-24 h-1.5 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-current transition-all" style={{ width: `${result.riskScore}%` }} />
            </div>
          </div>

          {/* SPF */}
          <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-cyber-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.spf.exists ? <CheckCircle size={13} className="text-green-400" /> : <XCircle size={13} className="text-red-400" />}
                <p className="font-mono text-xs text-cyber-text-hi">SPF Record</p>
              </div>
              <span className={clsx('font-mono text-[9px] px-2 py-0.5 rounded border',
                result.spf.strictness === 'strict' ? 'text-green-400 border-green-500/30 bg-green-500/10'
                : result.spf.strictness === 'soft-fail' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                : 'text-red-400 border-red-500/30 bg-red-500/10')}>
                {result.spf.strictness.toUpperCase()}
              </span>
            </div>
            <div className="px-4 py-3">
              {result.spf.record
                ? <p className="font-mono text-xs text-cyber-text break-all">{result.spf.record}</p>
                : <p className="font-mono text-xs text-red-400">No SPF record found — anyone can spoof this domain</p>}
            </div>
          </div>

          {/* DMARC */}
          <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-cyber-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.dmarc.record ? <CheckCircle size={13} className="text-green-400" /> : <XCircle size={13} className="text-red-400" />}
                <p className="font-mono text-xs text-cyber-text-hi">DMARC Policy</p>
              </div>
              {result.dmarc.record && (
                <div className="flex items-center gap-2">
                  <span className={clsx('font-mono text-[9px] px-2 py-0.5 rounded border',
                    result.dmarc.policy === 'reject' ? 'text-green-400 border-green-500/30 bg-green-500/10'
                    : result.dmarc.policy === 'quarantine' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                    : 'text-red-400 border-red-500/30 bg-red-500/10')}>
                    p={result.dmarc.policy}
                  </span>
                  <span className="font-mono text-[9px] text-cyber-muted">pct={result.dmarc.pct}%</span>
                </div>
              )}
            </div>
            <div className="px-4 py-3">
              {result.dmarc.record
                ? <p className="font-mono text-xs text-cyber-text break-all">{result.dmarc.record}</p>
                : <p className="font-mono text-xs text-red-400">No DMARC record — emails not authenticated, phishing risk HIGH</p>}
            </div>
          </div>

          {/* DKIM */}
          <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-cyber-border flex items-center gap-2">
              {result.dkim.found ? <CheckCircle size={13} className="text-green-400" /> : <XCircle size={13} className="text-red-400" />}
              <p className="font-mono text-xs text-cyber-text-hi">DKIM Keys</p>
              <span className="font-mono text-[10px] text-cyber-muted ml-auto">
                {result.dkim.found ? `${result.dkim.selectors.length} selector(s) found` : 'No known selectors found'}
              </span>
            </div>
            {result.dkim.selectors.length > 0 && (
              <div className="divide-y divide-cyber-border">
                {result.dkim.selectors.map(s => (
                  <div key={s.selector} className="px-4 py-2 flex items-start gap-3">
                    <span className="font-mono text-[10px] text-cyber-cyan w-20 flex-none mt-0.5">{s.selector}</span>
                    <p className="font-mono text-[10px] text-cyber-muted truncate">{s.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extra */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'MTA-STS', found: result.mtaSts.found, note: 'Encrypts mail in transit' },
              { label: 'BIMI',    found: result.bimi.found,   note: 'Brand logo in email clients' },
            ].map(({ label, found, note }) => (
              <div key={label} className="bg-cyber-surface border border-cyber-border rounded-lg px-4 py-3 flex items-center gap-3">
                {found ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-cyber-muted" />}
                <div>
                  <p className="font-mono text-xs text-cyber-text-hi">{label}</p>
                  <p className="font-mono text-[10px] text-cyber-muted">{found ? 'Configured' : `Not set — ${note}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
