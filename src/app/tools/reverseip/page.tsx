'use client'
import { useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'

interface ReverseResult { ip: string; domains: string[]; count: number; note?: string }

export default function ReverseIpPage() {
  const [input, setInput]   = useState('')
  const [loading, setLoad]  = useState(false)
  const [result, setResult] = useState<ReverseResult | null>(null)
  const [error, setError]   = useState('')
  const [filter, setFilter] = useState('')

  async function scan() {
    if (!input.trim()) return
    setLoad(true); setError(''); setResult(null)
    try {
      const res = await fetch(`/api/reverseip?ip=${encodeURIComponent(input.trim())}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch { setError('Request failed') } finally { setLoad(false) }
  }

  const filtered = result?.domains.filter(d => !filter || d.includes(filter.toLowerCase())) ?? []

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">Reverse IP Lookup</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Find all domains hosted on the same IP — useful for shared-hosting pivoting (HackerTarget)</p>
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && scan()}
          placeholder="93.184.216.34 or example.com"
          className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
        />
        <button onClick={scan} disabled={loading || !input.trim()}
          className="px-4 py-2 bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 rounded font-mono text-xs text-cyber-cyan disabled:opacity-40 transition-all">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Lookup'}
        </button>
      </div>

      {error && <p className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold text-cyber-cyan">{result.count}</span>
              <div>
                <p className="font-mono text-xs text-cyber-text-hi">Domains on {result.ip}</p>
                {result.note && <p className="font-mono text-[10px] text-cyber-muted">{result.note}</p>}
              </div>
            </div>
            {result.count > 5 && (
              <input value={filter} onChange={e => setFilter(e.target.value)}
                placeholder="Filter..."
                className="bg-cyber-bg border border-cyber-border rounded px-3 py-1 font-mono text-xs text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60 w-40"
              />
            )}
          </div>

          {result.count === 0 && (
            <p className="font-mono text-xs text-cyber-muted text-center py-8 bg-cyber-surface border border-cyber-border rounded-lg">
              No domains found for this IP
            </p>
          )}

          {filtered.length > 0 && (
            <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-cyber-border">
                <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">
                  Hosted Domains {filter ? `(${filtered.length} matching)` : ''}
                </p>
              </div>
              <div className="divide-y divide-cyber-border max-h-[500px] overflow-y-auto">
                {filtered.map(d => (
                  <div key={d} className="flex items-center justify-between px-4 py-2 hover:bg-cyber-cyan/5 group">
                    <a href={`https://${d}`} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-xs text-cyber-text-hi group-hover:text-cyber-cyan transition-colors flex items-center gap-1.5">
                      {d}
                      <ExternalLink size={10} className="text-cyber-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
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
