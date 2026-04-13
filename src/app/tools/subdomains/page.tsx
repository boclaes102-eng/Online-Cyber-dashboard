'use client'
import { useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'

interface SubEntry { name: string; source: string }
interface SubResult { domain: string; count: number; subdomains: SubEntry[]; sources: string[] }

export default function SubdomainsPage() {
  const [input, setInput]   = useState('')
  const [loading, setLoad]  = useState(false)
  const [result, setResult] = useState<SubResult | null>(null)
  const [error, setError]   = useState('')
  const [filter, setFilter] = useState('')

  async function scan() {
    const domain = input.trim().replace(/^https?:\/\//, '').split('/')[0]
    if (!domain) return
    setLoad(true); setError(''); setResult(null)
    try {
      const res = await fetch(`/api/subdomains?domain=${encodeURIComponent(domain)}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch { setError('Request failed') } finally { setLoad(false) }
  }

  const filtered = result?.subdomains.filter(s =>
    !filter || s.name.includes(filter.toLowerCase())
  ) ?? []

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">Subdomain Enumerator</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Discover subdomains via certificate transparency (crt.sh) and HackerTarget</p>
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && scan()}
          placeholder="example.com"
          className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
        />
        <button onClick={scan} disabled={loading || !input.trim()}
          className="px-4 py-2 bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 rounded font-mono text-xs text-cyber-cyan disabled:opacity-40 transition-all">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Enumerate'}
        </button>
      </div>

      {error && <p className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold text-cyber-cyan">{result.count}</span>
              <div>
                <p className="font-mono text-xs text-cyber-text-hi">Subdomains found</p>
                <p className="font-mono text-[10px] text-cyber-muted">{result.sources.join(' · ')}</p>
              </div>
            </div>
            {result.count > 0 && (
              <input value={filter} onChange={e => setFilter(e.target.value)}
                placeholder="Filter..."
                className="bg-cyber-bg border border-cyber-border rounded px-3 py-1 font-mono text-xs text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60 w-40"
              />
            )}
          </div>

          {result.count === 0 && (
            <p className="font-mono text-xs text-cyber-muted text-center py-8 bg-cyber-surface border border-cyber-border rounded-lg">
              No subdomains found
            </p>
          )}

          {filtered.length > 0 && (
            <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-cyber-border flex items-center justify-between">
                <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">
                  Subdomains {filter ? `(${filtered.length} matching)` : ''}
                </p>
              </div>
              <div className="divide-y divide-cyber-border max-h-[500px] overflow-y-auto">
                {filtered.map(s => (
                  <div key={s.name} className="flex items-center justify-between px-4 py-2 hover:bg-cyber-cyan/5 group">
                    <div className="flex items-center gap-2">
                      <a href={`https://${s.name}`} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs text-cyber-text-hi group-hover:text-cyber-cyan transition-colors">
                        {s.name}
                      </a>
                      <ExternalLink size={10} className="text-cyber-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="font-mono text-[9px] text-cyber-muted">{s.source}</span>
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
