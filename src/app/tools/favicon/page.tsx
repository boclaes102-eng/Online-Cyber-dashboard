'use client'

import { useState } from 'react'
import { Fingerprint, ExternalLink, AlertTriangle, Copy, Check } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { FaviconResult } from '@/app/api/favicon/route'

export default function FaviconPage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<FaviconResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [copied, setCopied]   = useState<string | null>(null)

  async function lookup(u?: string) {
    const url = (u ?? query).trim()
    if (!url) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res  = await fetch(`/api/favicon?url=${encodeURIComponent(url)}`)
      const data: FaviconResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-purple/30 flex items-center justify-center bg-cyber-purple/5 flex-none">
          <Fingerprint size={18} className="text-cyber-purple" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Favicon Hash Lookup</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Compute the MurmurHash3 of a favicon — pivot to Shodan/FOFA to find all servers sharing the same icon.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Target URL" label="FAVICON" accent="none">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="https://example.com"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-purple/60"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple font-mono text-xs rounded hover:bg-cyber-purple/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <Fingerprint size={12} />}
            Compute Hash
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['https://github.com', 'https://gitlab.com', 'https://nginx.org'].map(u => (
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

      {/* Results */}
      {result && !error && (
        <div className="space-y-4 animate-slide-up">
          {/* Hash result */}
          <TerminalCard title="Hash Result" label="MURMUR3" accent="none">
            <div className="space-y-4">
              {/* Big hash display */}
              <div className="p-4 bg-cyber-bg border border-cyber-border/60 rounded">
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-2">
                  MurmurHash3 (Shodan-compatible, signed 32-bit)
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-semibold text-cyber-purple">{result.hash}</span>
                  <button
                    onClick={() => copy(String(result.hash), 'hash')}
                    className="text-cyber-muted hover:text-cyber-purple transition-colors"
                    title="Copy hash"
                  >
                    {copied === 'hash' ? <Check size={14} className="text-cyber-green" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-1">Favicon URL</p>
                  <p className="font-mono text-xs text-cyber-text break-all">{result.faviconUrl}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-1">Size</p>
                  <p className="font-mono text-xs text-cyber-text">{result.sizeBytes.toLocaleString()} bytes</p>
                </div>
              </div>

              <div>
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-1">
                  Base64 Preview (Shodan encoding)
                </p>
                <pre className="font-mono text-[10px] text-cyber-text bg-cyber-bg border border-cyber-border/40 rounded p-2.5 overflow-x-auto">
                  {result.base64Preview}…
                </pre>
              </div>
            </div>
          </TerminalCard>

          {/* Pivot queries */}
          <TerminalCard title="Pivot Queries" label="FINGERPRINT" accent="none">
            <div className="space-y-2">
              {/* Shodan */}
              <div className="flex items-center justify-between p-3 bg-cyber-bg border border-cyber-border/60 rounded">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-1">Shodan</p>
                  <code className="font-mono text-xs text-cyber-cyan">{result.shodanQuery}</code>
                </div>
                <div className="flex gap-3 ml-3 flex-none">
                  <button
                    onClick={() => copy(result.shodanQuery, 'shodan')}
                    className="text-cyber-muted hover:text-cyber-cyan transition-colors"
                    title="Copy query"
                  >
                    {copied === 'shodan' ? <Check size={12} className="text-cyber-green" /> : <Copy size={12} />}
                  </button>
                  <a
                    href={result.shodanLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyber-muted hover:text-cyber-cyan transition-colors"
                    title="Open in Shodan"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* FOFA */}
              <div className="flex items-center justify-between p-3 bg-cyber-bg border border-cyber-border/60 rounded">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-1">FOFA</p>
                  <code className="font-mono text-xs text-cyber-cyan">{result.fofaQuery}</code>
                </div>
                <div className="flex gap-3 ml-3 flex-none">
                  <button
                    onClick={() => copy(result.fofaQuery, 'fofa')}
                    className="text-cyber-muted hover:text-cyber-cyan transition-colors"
                    title="Copy query"
                  >
                    {copied === 'fofa' ? <Check size={12} className="text-cyber-green" /> : <Copy size={12} />}
                  </button>
                  <a
                    href={`https://en.fofa.info/result?qbase64=${btoa(result.fofaQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyber-muted hover:text-cyber-cyan transition-colors"
                    title="Open in FOFA"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Censys note */}
              <div className="p-3 bg-cyber-bg border border-cyber-border/40 rounded">
                <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-1">Censys</p>
                <p className="font-mono text-[10px] text-cyber-muted">
                  Censys uses MD5 hashing. Search in Censys Search:{' '}
                  <code className="text-cyber-text">services.http.response.favicons.hashes: &quot;md5:...&quot;</code>
                </p>
              </div>
            </div>
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
