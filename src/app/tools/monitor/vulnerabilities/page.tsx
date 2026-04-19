'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldAlert, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import SeverityBadge from '@/components/ui/SeverityBadge'
import Spinner from '@/components/ui/Spinner'

interface Asset {
  id:    string
  value: string
  type:  string
}

interface Vuln {
  id:               string
  cveId:            string
  title:            string | null
  description:      string
  severity:         string
  cvssScore:        string | null
  publishedAt:      string
  affectedProducts: string[]
  references:       string[]
  status:           string
  assetId?:         string
}

const SEVERITIES = ['', 'critical', 'high', 'medium', 'low']

export default function VulnerabilitiesPage() {
  const [vulns,    setVulns]    = useState<Vuln[]>([])
  const [assets,   setAssets]   = useState<Asset[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [severity, setSeverity] = useState('')
  const [assetId,  setAssetId]  = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/monitor/assets?limit=100')
      .then(r => r.json())
      .then(d => setAssets(d.data ?? []))
      .catch(() => {})
  }, [])

  const fetchVulns = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (severity) params.set('severity', severity)
      if (assetId)  params.set('assetId', assetId)
      const res  = await fetch(`/api/monitor/vulnerabilities?${params}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else setVulns(data.data ?? [])
    } catch {
      setError('Failed to load vulnerabilities')
    } finally { setLoading(false) }
  }, [severity, assetId])

  useEffect(() => { fetchVulns() }, [fetchVulns])

  const toggle = (id: string) => setExpanded(e => e === id ? null : id)

  const selectedAsset = assets.find(a => a.id === assetId)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={16} className="text-cyber-red" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">Vulnerabilities</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          CVEs correlated against your monitored assets
        </p>
      </div>

      <TerminalCard title="Filters" accent="none">
        <div className="space-y-3">
          {assets.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-wider w-16 flex-none">Asset</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setAssetId(''); setExpanded(null) }}
                  className={`font-mono text-[10px] px-2 py-px rounded border transition-colors ${
                    assetId === ''
                      ? 'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10'
                      : 'text-cyber-muted border-cyber-border hover:border-cyber-cyan/30'
                  }`}
                >
                  ALL
                </button>
                {assets.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { setAssetId(a.id); setExpanded(null) }}
                    className={`flex items-center gap-1.5 font-mono text-[10px] px-2 py-px rounded border transition-colors ${
                      assetId === a.id
                        ? 'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10'
                        : 'text-cyber-muted border-cyber-border hover:border-cyber-cyan/30'
                    }`}
                  >
                    <span className="text-[8px] uppercase opacity-60">{a.type}</span>
                    {a.value}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-wider w-16 flex-none">Severity</span>
            <div className="flex flex-wrap gap-2">
              {SEVERITIES.map(s => (
                <button
                  key={s || 'all'}
                  onClick={() => setSeverity(s)}
                  className={`font-mono text-[10px] px-2 py-px rounded border transition-colors ${
                    severity === s
                      ? 'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10'
                      : 'text-cyber-muted border-cyber-border hover:border-cyber-cyan/30'
                  }`}
                >
                  {s ? s.toUpperCase() : 'ALL'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard
        title="CVE Findings"
        label={`${vulns.length} found${selectedAsset ? ` — ${selectedAsset.value}` : ''}`}
        accent="red"
      >
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Spinner size="sm" /> <span className="font-mono text-xs text-cyber-muted">Loading…</span>
          </div>
        ) : error ? (
          <p className="font-mono text-xs text-cyber-red">{error}</p>
        ) : vulns.length === 0 ? (
          <div className="space-y-2 py-2">
            <p className="font-mono text-xs text-cyber-muted">No vulnerabilities found for current filters.</p>
            {assetId && (
              <p className="font-mono text-[10px] text-cyber-muted/60">
                The backend may still be building the CVE database. If this asset was just added, check back in a few minutes — correlation runs automatically once the CVE feed completes.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {vulns.map(vuln => (
              <div key={vuln.id} className="border border-cyber-border rounded overflow-hidden">
                <button
                  onClick={() => toggle(vuln.id)}
                  className="w-full flex items-center gap-3 p-3 bg-cyber-surface/40 hover:bg-cyber-surface/60 transition-colors text-left"
                >
                  <SeverityBadge severity={(vuln.severity ?? '').toUpperCase()} size="sm" />
                  <span className="font-mono text-xs text-cyber-cyan w-32 flex-none">{vuln.cveId}</span>
                  {vuln.cvssScore && (
                    <span className="font-mono text-[10px] text-cyber-muted flex-none">
                      CVSS {vuln.cvssScore}
                    </span>
                  )}
                  <span className="font-mono text-xs text-cyber-text flex-1 truncate">
                    {vuln.title ?? vuln.description.slice(0, 80)}
                  </span>
                  {vuln.status && (
                    <span className={`font-mono text-[9px] px-1.5 py-px rounded border flex-none ${
                      vuln.status === 'open'
                        ? 'text-cyber-red border-cyber-red/30 bg-cyber-red/5'
                        : vuln.status === 'remediated'
                          ? 'text-cyber-green border-cyber-green/30 bg-cyber-green/5'
                          : 'text-cyber-muted border-cyber-border'
                    }`}>
                      {vuln.status.replace('_', ' ')}
                    </span>
                  )}
                  {expanded === vuln.id ? <ChevronUp size={12} className="text-cyber-muted flex-none" /> : <ChevronDown size={12} className="text-cyber-muted flex-none" />}
                </button>

                {expanded === vuln.id && (
                  <div className="p-3 border-t border-cyber-border space-y-3 bg-cyber-surface/20">
                    <p className="font-mono text-xs text-cyber-text leading-relaxed">{vuln.description}</p>
                    {vuln.affectedProducts.length > 0 && (
                      <div>
                        <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-wider mb-1">Affected Products</p>
                        <div className="flex flex-wrap gap-1">
                          {vuln.affectedProducts.map(p => (
                            <span key={p} className="font-mono text-[9px] text-cyber-text border border-cyber-border rounded px-1.5 py-px">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {vuln.references.length > 0 && (
                      <div>
                        <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-wider mb-1">References</p>
                        <div className="space-y-0.5">
                          {vuln.references.slice(0, 3).map(ref => (
                            <a
                              key={ref}
                              href={ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-mono text-[10px] text-cyber-cyan hover:underline truncate"
                            >
                              <ExternalLink size={9} />
                              {ref}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="font-mono text-[9px] text-cyber-muted">
                      Published: <span suppressHydrationWarning>{new Date(vuln.publishedAt).toISOString().split('T')[0]}</span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </TerminalCard>
    </div>
  )
}
