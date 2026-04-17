'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldAlert, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import SeverityBadge from '@/components/ui/SeverityBadge'
import Spinner from '@/components/ui/Spinner'

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
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [severity, setSeverity] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchVulns = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (severity) params.set('severity', severity)
      const res  = await fetch(`/api/monitor/vulnerabilities?${params}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else setVulns(data.items ?? [])
    } catch {
      setError('Failed to load vulnerabilities')
    } finally { setLoading(false) }
  }, [severity])

  useEffect(() => { fetchVulns() }, [fetchVulns])

  const toggle = (id: string) => setExpanded(e => e === id ? null : id)

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

      <TerminalCard title="Filter by Severity" accent="none">
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
      </TerminalCard>

      <TerminalCard title="CVE Findings" label={`${vulns.length} found`} accent="red">
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Spinner size={14} /> <span className="font-mono text-xs text-cyber-muted">Loading…</span>
          </div>
        ) : error ? (
          <p className="font-mono text-xs text-cyber-red">{error}</p>
        ) : vulns.length === 0 ? (
          <p className="font-mono text-xs text-cyber-muted">No vulnerabilities found for current filters.</p>
        ) : (
          <div className="space-y-2">
            {vulns.map(vuln => (
              <div key={vuln.id} className="border border-cyber-border rounded overflow-hidden">
                <button
                  onClick={() => toggle(vuln.id)}
                  className="w-full flex items-center gap-3 p-3 bg-cyber-surface/40 hover:bg-cyber-surface/60 transition-colors text-left"
                >
                  <SeverityBadge severity={vuln.severity.toUpperCase()} size="sm" />
                  <span className="font-mono text-xs text-cyber-cyan w-32 flex-none">{vuln.cveId}</span>
                  {vuln.cvssScore && (
                    <span className="font-mono text-[10px] text-cyber-muted flex-none">
                      CVSS {vuln.cvssScore}
                    </span>
                  )}
                  <span className="font-mono text-xs text-cyber-text flex-1 truncate">
                    {vuln.title ?? vuln.description.slice(0, 80)}
                  </span>
                  <span className={`font-mono text-[9px] px-1.5 py-px rounded border flex-none ${
                    vuln.status === 'open'
                      ? 'text-cyber-red border-cyber-red/30 bg-cyber-red/5'
                      : vuln.status === 'remediated'
                        ? 'text-cyber-green border-cyber-green/30 bg-cyber-green/5'
                        : 'text-cyber-muted border-cyber-border'
                  }`}>
                    {vuln.status.replace('_', ' ')}
                  </span>
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
                      Published: {new Date(vuln.publishedAt).toLocaleDateString()}
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
