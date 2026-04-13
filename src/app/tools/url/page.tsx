'use client'

import { useState } from 'react'
import { Crosshair, Search, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import type { UrlScanResult } from '@/lib/types'

const VERDICT_STYLE = {
  SAFE:       { color: 'text-cyber-green', border: 'border-cyber-green/40', icon: CheckCircle },
  MALICIOUS:  { color: 'text-cyber-red',   border: 'border-cyber-red/40',   icon: XCircle },
  SUSPICIOUS: { color: 'text-cyber-orange',border: 'border-cyber-orange/40',icon: AlertTriangle },
  UNKNOWN:    { color: 'text-cyber-muted', border: 'border-cyber-border',   icon: AlertTriangle },
}

const TEST_URLS = [
  { label: 'Known malware (URLhaus)', url: 'http://ianeyber.com/wp-content/themes/basic/wp-ajax.php' },
  { label: 'Safe (github.com)',       url: 'https://github.com' },
]

export default function UrlPage() {
  const [url,     setUrl]     = useState('')
  const [result,  setResult]  = useState<UrlScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function scan(u?: string) {
    const target = (u ?? url).trim()
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/url?url=${encodeURIComponent(target)}`)
      const data: UrlScanResult = await res.json()
      if (data.error && !data.verdict) setError(data.error)
      else setResult(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed') }
    finally { setLoading(false) }
  }

  const r = result
  const style = r ? VERDICT_STYLE[r.verdict] : null
  const VerdictIcon = style?.icon ?? AlertTriangle

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Crosshair size={16} className="text-cyber-cyan" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">URL Scanner</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          URLhaus + VirusTotal threat check — malware, phishing, botnet C2 detection
        </p>
      </div>

      <TerminalCard title="URL Input" accent="cyan">
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              className="cyber-input font-mono flex-1"
              placeholder="https://example.com/path"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && scan()}
            />
            <button className="cyber-btn flex items-center gap-2" onClick={() => scan()} disabled={loading || !url}>
              {loading ? <Spinner size="sm" /> : <Search size={13} />}
              {loading ? 'Scanning' : 'Scan'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TEST_URLS.map(t => (
              <button key={t.label}
                onClick={() => { setUrl(t.url); scan(t.url) }}
                className="font-mono text-[10px] text-cyber-muted border border-cyber-border hover:border-cyber-cyan/40 hover:text-cyber-cyan rounded px-2 py-0.5 transition-colors">
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </TerminalCard>

      {error && <div className="cyber-card-red p-3 font-mono text-xs text-cyber-red">{error}</div>}

      {r && style && (
        <div className="space-y-4 animate-slide-up">
          {/* Verdict */}
          <div className={`cyber-card p-4 border ${style.border}`}>
            <div className="flex items-center gap-3">
              <VerdictIcon size={20} className={`${style.color} flex-none`} />
              <div className="flex-1">
                <p className={`font-mono text-sm font-700 ${style.color}`}>{r.verdict}</p>
                <p className="font-mono text-[11px] text-cyber-muted mt-0.5 break-all">{r.url}</p>
              </div>
              <CopyButton text={r.url} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[10px] border border-cyber-border rounded px-1.5 py-px text-cyber-muted">Domain</span>
              <span className="font-mono text-[11px] text-cyber-text-hi">{r.domain}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* URLhaus */}
            <TerminalCard title="URLhaus" accent={r.urlhaus?.found ? 'red' : 'none'}>
              {r.urlhaus ? (
                r.urlhaus.error ? (
                  <p className="font-mono text-xs text-cyber-muted">{r.urlhaus.error}</p>
                ) : r.urlhaus.found ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <XCircle size={13} className="text-cyber-red" />
                      <span className="font-mono text-xs text-cyber-red font-600">Listed as malicious</span>
                    </div>
                    {[
                      { label: 'Status',    value: r.urlhaus.urlStatus  },
                      { label: 'Threat',    value: r.urlhaus.threat     },
                      { label: 'URLs on host', value: r.urlhaus.urlsOnHost?.toString() },
                    ].filter(x => x.value).map(({ label, value }) => (
                      <div key={label} className="flex gap-3 py-1 border-b border-cyber-border/30 last:border-0">
                        <span className="font-mono text-[10px] text-cyber-muted w-24 flex-none">{label}</span>
                        <span className="font-mono text-[11px] text-cyber-text-hi">{value}</span>
                      </div>
                    ))}
                    {r.urlhaus.tags && r.urlhaus.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {r.urlhaus.tags.map(t => (
                          <span key={t} className="font-mono text-[10px] border border-cyber-red/30 text-cyber-red bg-cyber-red/5 rounded px-1.5 py-0.5">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.urlhaus.reference && (
                      <a href={r.urlhaus.reference} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-[10px] text-cyber-cyan hover:underline">
                        <ExternalLink size={10} /> URLhaus report
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle size={13} className="text-cyber-green" />
                    <span className="font-mono text-xs text-cyber-muted">Not found in URLhaus database</span>
                  </div>
                )
              ) : <p className="font-mono text-xs text-cyber-muted">URLhaus check unavailable</p>}
            </TerminalCard>

            {/* VirusTotal */}
            <TerminalCard title="VirusTotal" accent={r.virustotal?.error ? 'none' : r.virustotal?.malicious ? 'red' : r.virustotal?.found ? 'green' : 'none'}>
              {!r.virustotal ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className="text-cyber-muted" />
                    <span className="font-mono text-xs text-cyber-muted">VT_API_KEY not set</span>
                  </div>
                  <p className="font-mono text-[10px] text-cyber-muted">
                    Add <code className="text-cyber-cyan">VT_API_KEY</code> to .env.local for VirusTotal scanning.
                  </p>
                </div>
              ) : r.virustotal.error ? (
                <p className="font-mono text-xs text-cyber-muted">{r.virustotal.error}</p>
              ) : r.virustotal.found ? (
                <div className="space-y-3">
                  <div className="text-center py-2">
                    <p className={`font-mono text-4xl font-700 ${r.virustotal.malicious > 0 ? 'text-cyber-red' : 'text-cyber-green'}`}>
                      {r.virustotal.malicious}/{r.virustotal.total}
                    </p>
                    <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">engines flagged</p>
                  </div>
                  {[
                    { label: 'Malicious',  count: r.virustotal.malicious,  color: 'text-cyber-red'   },
                    { label: 'Suspicious', count: r.virustotal.suspicious, color: 'text-cyber-orange' },
                    { label: 'Harmless',   count: r.virustotal.harmless,   color: 'text-cyber-green'  },
                    { label: 'Undetected', count: r.virustotal.undetected, color: 'text-cyber-muted'  },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="flex justify-between items-center py-1 border-b border-cyber-border/30 last:border-0">
                      <span className="font-mono text-[11px] text-cyber-muted">{label}</span>
                      <span className={`font-mono text-[12px] font-600 ${color}`}>{count}</span>
                    </div>
                  ))}
                  {r.virustotal.permalink && (
                    <a href={r.virustotal.permalink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-[10px] text-cyber-cyan hover:underline">
                      <ExternalLink size={10} /> View on VirusTotal
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle size={13} className="text-cyber-green" />
                  <span className="font-mono text-xs text-cyber-muted">Not found in VirusTotal database</span>
                </div>
              )}
            </TerminalCard>
          </div>
        </div>
      )}
    </div>
  )
}
