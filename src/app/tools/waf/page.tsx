'use client'
import { useState } from 'react'
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface WafResult {
  url: string; hostname: string; protected: boolean
  detected: string[]; cnames: string[]; relevantHeaders: Record<string, string>; error?: string
}

const WAF_COLORS: Record<string, string> = {
  Cloudflare:        'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'AWS CloudFront':  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  Akamai:            'bg-blue-500/20   text-blue-300   border-blue-500/30',
  Fastly:            'bg-red-500/20    text-red-300    border-red-500/30',
  'Imperva / Incapsula': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Sucuri:            'bg-green-500/20  text-green-300  border-green-500/30',
  'F5 BIG-IP ASM':   'bg-cyan-500/20   text-cyan-300   border-cyan-500/30',
}

export default function WafPage() {
  const [input, setInput]   = useState('')
  const [loading, setLoad]  = useState(false)
  const [result, setResult] = useState<WafResult | null>(null)
  const [error, setError]   = useState('')

  async function scan() {
    if (!input.trim()) return
    setLoad(true); setError(''); setResult(null)
    try {
      const res = await fetch(`/api/waf?url=${encodeURIComponent(input.trim())}`)
      const data = await res.json()
      if (data.error && !data.detected) { setError(data.error); return }
      setResult(data)
    } catch { setError('Request failed') } finally { setLoad(false) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">WAF / Firewall Detector</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Detect Cloudflare, Akamai, AWS WAF, Fastly, Imperva and other CDNs/WAFs via headers and DNS</p>
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && scan()}
          placeholder="https://example.com"
          className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
        />
        <button onClick={scan} disabled={loading || !input.trim()}
          className="px-4 py-2 bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 rounded font-mono text-xs text-cyber-cyan disabled:opacity-40 transition-all">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Detect'}
        </button>
      </div>

      {error && <p className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</p>}

      {result && (
        <div className="space-y-4">
          {/* Status banner */}
          <div className={clsx('flex items-center gap-3 px-4 py-3 rounded-lg border', result.protected
            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
            : 'bg-green-500/10  border-green-500/30  text-green-300')}>
            {result.protected ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
            <div>
              <p className="font-mono text-sm font-bold">
                {result.protected ? 'WAF / CDN Detected' : 'No WAF Detected'}
              </p>
              <p className="font-mono text-[10px] opacity-70">
                {result.protected
                  ? `${result.detected.length} protection layer${result.detected.length > 1 ? 's' : ''} identified`
                  : 'No known WAF signatures found — requests may reach origin directly'}
              </p>
            </div>
          </div>

          {result.detected.length > 0 && (
            <div className="bg-cyber-surface border border-cyber-border rounded-lg p-4">
              <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase mb-3">Detected Services</p>
              <div className="flex flex-wrap gap-2">
                {result.detected.map(d => (
                  <span key={d} className={clsx('px-3 py-1 rounded-full border font-mono text-xs', WAF_COLORS[d] ?? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30')}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(result.relevantHeaders).length > 0 && (
            <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-cyber-border">
                <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">Relevant Headers</p>
              </div>
              <div className="divide-y divide-cyber-border">
                {Object.entries(result.relevantHeaders).map(([k, v]) => (
                  <div key={k} className="flex gap-4 px-4 py-2">
                    <span className="font-mono text-[10px] text-cyber-cyan w-32 flex-none">{k}</span>
                    <span className="font-mono text-[10px] text-cyber-text truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.cnames.length > 0 && (
            <div className="bg-cyber-surface border border-cyber-border rounded-lg p-4">
              <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase mb-2">CNAME Chain</p>
              <div className="space-y-1">
                {result.cnames.map(c => (
                  <p key={c} className="font-mono text-xs text-cyber-text">→ {c}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
