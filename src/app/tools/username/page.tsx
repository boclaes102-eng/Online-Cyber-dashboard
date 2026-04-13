'use client'

import { useState } from 'react'
import { User, ExternalLink, CheckCircle, XCircle, HelpCircle, AlertTriangle } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { UsernameResult, PlatformResult } from '@/app/api/username/route'

type ViewFilter = 'all' | 'found' | 'notfound'

const CATEGORY_COLOR: Record<string, string> = {
  Dev:     'text-cyber-cyan',
  Social:  'text-cyber-purple',
  Content: 'text-cyber-orange',
  Gaming:  'text-cyber-green',
  Photo:   'text-yellow-400',
}

function PlatformCard({ r }: { r: PlatformResult }) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded border transition-all ${
        r.found === true
          ? 'bg-cyber-green/5 border-cyber-green/20'
          : r.found === false
            ? 'bg-red-500/5 border-red-500/10'
            : 'bg-transparent border-cyber-border/40'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {r.found === true  && <CheckCircle  size={12} className="text-cyber-green flex-none" />}
        {r.found === false && <XCircle      size={12} className="text-red-400    flex-none" />}
        {r.found === null  && <HelpCircle   size={12} className="text-cyber-muted flex-none" />}
        <div className="min-w-0">
          <p className="font-mono text-xs text-cyber-text-hi truncate">{r.name}</p>
          <p className={`font-mono text-[9px] ${CATEGORY_COLOR[r.category] ?? 'text-cyber-muted'}`}>
            {r.category}
          </p>
        </div>
      </div>
      {r.found === true && (
        <a
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-none text-cyber-muted hover:text-cyber-cyan transition-colors ml-2"
        >
          <ExternalLink size={10} />
        </a>
      )}
    </div>
  )
}

export default function UsernamePage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<UsernameResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [filter, setFilter]   = useState<ViewFilter>('all')

  async function lookup(u?: string) {
    const username = (u ?? query).trim()
    if (!username) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res  = await fetch(`/api/username?username=${encodeURIComponent(username)}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data as UsernameResult)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  const filtered = result?.results.filter(r => {
    if (filter === 'found')    return r.found === true
    if (filter === 'notfound') return r.found === false
    return true
  }) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-purple/30 flex items-center justify-center bg-cyber-purple/5 flex-none">
          <User size={18} className="text-cyber-purple" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Username OSINT</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Check a username across 20+ platforms. HTTP 200 = likely exists; results vary by platform bot-detection.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Username Search" label="OSINT" accent="none">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="username"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-purple/60"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple font-mono text-xs rounded hover:bg-cyber-purple/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <User size={12} />}
            Search
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['johndoe', 'admin', 'pentester'].map(u => (
              <button
                key={u}
                onClick={() => { setQuery(u); lookup(u) }}
                className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-purple hover:border-cyber-purple/40 rounded transition-all"
              >
                {u}
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

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Summary */}
          <TerminalCard title="Summary" label="RESULTS" accent="none">
            <div className="flex flex-wrap gap-6 mb-4">
              <div>
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Username</p>
                <p className="font-mono text-sm text-cyber-text-hi mt-1">@{result.username}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Found</p>
                <p className="font-mono text-sm text-cyber-green mt-1">{result.found}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Not Found</p>
                <p className="font-mono text-sm text-red-400 mt-1">{result.notFound}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">Unknown</p>
                <p className="font-mono text-sm text-cyber-muted mt-1">{result.unknown}</p>
              </div>
            </div>

            <div className="flex gap-1">
              {(['all', 'found', 'notfound'] as ViewFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`font-mono text-[10px] px-2 py-1 rounded transition-all ${
                    filter === f
                      ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30'
                      : 'text-cyber-muted border border-cyber-border hover:text-cyber-text'
                  }`}
                >
                  {f === 'notfound' ? 'NOT FOUND' : f.toUpperCase()}
                </button>
              ))}
            </div>
          </TerminalCard>

          {/* Platform grid */}
          <TerminalCard title="Platform Results" label="PLATFORMS" accent="none">
            <div className="grid grid-cols-2 gap-2">
              {filtered.map(r => <PlatformCard key={r.name} r={r} />)}
            </div>
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
