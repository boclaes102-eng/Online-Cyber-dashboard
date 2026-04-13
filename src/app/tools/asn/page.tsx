'use client'
import { useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'

interface AsnInfo { asn: number; name: string; description?: string; countryCode: string; rir?: string; prefixCount: { ipv4: number; ipv6: number }; abuseContacts?: string[]; website?: string }
interface Prefix { prefix: string; name?: string; description?: string; countryCode?: string }
interface Peer   { asn: number; name: string; description?: string; countryCode?: string }
interface AsnResult { query: string; asnNum: number; ipInfo?: any; asn: AsnInfo | null; prefixes: Prefix[]; peers: Peer[] }

export default function AsnPage() {
  const [input, setInput]   = useState('')
  const [loading, setLoad]  = useState(false)
  const [result, setResult] = useState<AsnResult | null>(null)
  const [error, setError]   = useState('')

  async function lookup() {
    if (!input.trim()) return
    setLoad(true); setError(''); setResult(null)
    try {
      const res = await fetch(`/api/asn?q=${encodeURIComponent(input.trim())}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch { setError('Request failed') } finally { setLoad(false) }
  }

  const examples = ['15169', 'AS13335', '8.8.8.8', '1.1.1.1']

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">BGP / ASN Analyzer</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Full ASN details, BGP prefixes and peers via BGPView — enter an IP or AS number</p>
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && lookup()}
          placeholder="8.8.8.8 or AS15169 or 15169"
          className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
        />
        <button onClick={lookup} disabled={loading || !input.trim()}
          className="px-4 py-2 bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 rounded font-mono text-xs text-cyber-cyan disabled:opacity-40 transition-all">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Lookup'}
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {examples.map(e => (
          <button key={e} onClick={() => { setInput(e); }}
            className="px-2 py-1 font-mono text-[10px] text-cyber-muted border border-cyber-border rounded hover:text-cyber-cyan hover:border-cyber-cyan/30 transition-colors">
            {e}
          </button>
        ))}
      </div>

      {error && <p className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</p>}

      {result?.asn && (
        <div className="space-y-4">
          {/* ASN info card */}
          <div className="bg-cyber-surface border border-cyber-border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-lg font-bold text-cyber-cyan">AS{result.asnNum}</p>
                <p className="font-mono text-sm text-cyber-text-hi">{result.asn.name}</p>
                {result.asn.description && <p className="font-mono text-xs text-cyber-muted mt-0.5">{result.asn.description}</p>}
              </div>
              <a href={`https://bgpview.io/asn/${result.asnNum}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-[10px] text-cyber-cyan hover:underline">
                BGPView <ExternalLink size={9} />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-cyber-border">
              {[
                ['Country', result.asn.countryCode],
                ['RIR', result.asn.rir],
                ['IPv4 Prefixes', result.asn.prefixCount.ipv4],
                ['IPv6 Prefixes', result.asn.prefixCount.ipv6],
                ['Abuse Contact', result.asn.abuseContacts?.join(', ')],
                ['Website', result.asn.website],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={String(label)}>
                  <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">{label}</p>
                  <p className="font-mono text-xs text-cyber-text-hi mt-0.5">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>

          {result.prefixes.length > 0 && (
            <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-cyber-border">
                <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">
                  IPv4 Prefixes ({result.prefixes.length} shown)
                </p>
              </div>
              <div className="divide-y divide-cyber-border max-h-60 overflow-y-auto">
                {result.prefixes.map(p => (
                  <div key={p.prefix} className="flex items-center justify-between px-4 py-2">
                    <span className="font-mono text-xs text-cyber-cyan">{p.prefix}</span>
                    <span className="font-mono text-[10px] text-cyber-muted">{p.description ?? p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.peers.length > 0 && (
            <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-cyber-border">
                <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">
                  IPv4 Peers ({result.peers.length} shown)
                </p>
              </div>
              <div className="divide-y divide-cyber-border max-h-48 overflow-y-auto">
                {result.peers.map(p => (
                  <div key={p.asn} className="flex items-center gap-4 px-4 py-2">
                    <span className="font-mono text-[10px] text-cyber-cyan w-16 flex-none">AS{p.asn}</span>
                    <span className="font-mono text-xs text-cyber-text-hi flex-1">{p.name}</span>
                    <span className="font-mono text-[10px] text-cyber-muted">{p.countryCode}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {result && !result.asn && (
        <p className="font-mono text-xs text-cyber-muted text-center py-8 bg-cyber-surface border border-cyber-border rounded-lg">
          No ASN data found for this query
        </p>
      )}
    </div>
  )
}
