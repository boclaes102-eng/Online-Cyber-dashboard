'use client'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface Detection { category: string; name: string; version?: string; confidence: 'High' | 'Medium' | 'Low' }
interface TechResult { url: string; finalUrl: string; status: number; detections: Detection[]; headers: Record<string, string | undefined> }

const CONFIDENCE_STYLE: Record<string, string> = {
  High:   'bg-green-500/15 text-green-400 border-green-500/30',
  Medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  Low:    'bg-cyber-border/50 text-cyber-muted border-cyber-border',
}

const CATEGORY_ICON: Record<string, string> = {
  Server: '🖥', Language: '⚙', CMS: '📝', Framework: '⚡', Analytics: '📊', CDN: '🌐', Security: '🔒',
}

export default function TechPage() {
  const [input, setInput]   = useState('')
  const [loading, setLoad]  = useState(false)
  const [result, setResult] = useState<TechResult | null>(null)
  const [error, setError]   = useState('')

  async function scan() {
    if (!input.trim()) return
    setLoad(true); setError(''); setResult(null)
    try {
      const res = await fetch(`/api/tech?url=${encodeURIComponent(input.trim())}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch { setError('Request failed') } finally { setLoad(false) }
  }

  const byCategory = result
    ? result.detections.reduce((acc, d) => {
        ;(acc[d.category] ??= []).push(d)
        return acc
      }, {} as Record<string, Detection[]>)
    : {}

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">Tech Fingerprinter</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Identify CMS, server, frameworks, CDNs and analytics from headers and HTML</p>
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && scan()}
          placeholder="https://example.com"
          className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
        />
        <button onClick={scan} disabled={loading || !input.trim()}
          className="px-4 py-2 bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 rounded font-mono text-xs text-cyber-cyan disabled:opacity-40 transition-all">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Fingerprint'}
        </button>
      </div>

      {error && <p className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-cyber-surface border border-cyber-border rounded-lg px-4 py-3">
            <span className="font-mono text-2xl font-bold text-cyber-cyan">{result.detections.length}</span>
            <div>
              <p className="font-mono text-xs text-cyber-text-hi">Technologies detected</p>
              <p className="font-mono text-[10px] text-cyber-muted">HTTP {result.status} · {result.finalUrl}</p>
            </div>
          </div>

          {result.detections.length === 0 && (
            <p className="font-mono text-xs text-cyber-muted px-4 py-6 text-center bg-cyber-surface border border-cyber-border rounded-lg">
              No known technologies detected
            </p>
          )}

          {Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat} className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-cyber-border flex items-center gap-2">
                <span>{CATEGORY_ICON[cat] ?? '🔧'}</span>
                <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">{cat}</p>
              </div>
              <div className="divide-y divide-cyber-border">
                {items.map(d => (
                  <div key={d.name} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="font-mono text-xs text-cyber-text-hi">{d.name}</span>
                      {d.version && <span className="font-mono text-[10px] text-cyber-muted ml-2">v{d.version}</span>}
                    </div>
                    <span className={clsx('font-mono text-[9px] px-2 py-0.5 rounded border', CONFIDENCE_STYLE[d.confidence])}>
                      {d.confidence}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.values(result.headers).some(Boolean) && (
            <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-cyber-border">
                <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">Key Headers</p>
              </div>
              <div className="divide-y divide-cyber-border">
                {Object.entries(result.headers).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex gap-4 px-4 py-2">
                    <span className="font-mono text-[10px] text-cyber-cyan w-28 flex-none">{k}</span>
                    <span className="font-mono text-[10px] text-cyber-text truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
