'use client'

import { useState } from 'react'
import { Shield, Search, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from 'lucide-react'
import type { CveSearchResult, CveItem } from '@/lib/types'
import TerminalCard from '@/components/ui/TerminalCard'
import SeverityBadge, { type Severity } from '@/components/ui/SeverityBadge'
import Spinner from '@/components/ui/Spinner'
import { formatDate, timeAgo } from '@/lib/utils'

const SEVERITIES = ['CRITICAL','HIGH','MEDIUM','LOW'] as const

function CveCard({ cve }: { cve: CveItem }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border border-cyber-border hover:border-cyber-border-hi transition-colors rounded overflow-hidden bg-cyber-card">
      <button
        className="w-full px-4 py-3 flex items-start gap-3 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-none pt-0.5">
          <SeverityBadge severity={cve.severity as Severity} score={cve.cvss?.baseScore} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs font-700 text-cyber-cyan">{cve.id}</span>
            <span className="font-mono text-[9px] text-cyber-muted">{formatDate(cve.published)}</span>
            <span className="font-mono text-[9px] text-cyber-muted">{timeAgo(cve.published)}</span>
            {cve.vulnStatus && (
              <span className="font-mono text-[9px] border border-cyber-border rounded px-1.5 py-px text-cyber-muted">
                {cve.vulnStatus}
              </span>
            )}
          </div>
          <p className="font-mono text-[11px] text-cyber-text leading-relaxed line-clamp-2">
            {cve.description}
          </p>
        </div>
        <div className="flex-none pt-1">
          {expanded ? <ChevronUp size={13} className="text-cyber-muted" /> : <ChevronDown size={13} className="text-cyber-muted" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-cyber-border/60 px-4 py-4 space-y-4 bg-cyber-surface/30 animate-fade-in">
          {/* Full description */}
          <div>
            <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-1">Description</p>
            <p className="font-mono text-[11px] text-cyber-text leading-relaxed">{cve.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CVSS */}
            {cve.cvss && (
              <div>
                <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-2">CVSS {cve.cvss.version}</p>
                <div className="text-center p-3 border border-cyber-border rounded bg-cyber-card">
                  <p className={`font-mono text-3xl font-700 ${
                    cve.cvss.baseScore >= 9 ? 'text-[#ff3366]' :
                    cve.cvss.baseScore >= 7 ? 'text-[#ff6633]' :
                    cve.cvss.baseScore >= 4 ? 'text-[#ffaa00]' : 'text-[#00ff88]'
                  }`}>{cve.cvss.baseScore.toFixed(1)}</p>
                  <p className="font-mono text-[9px] text-cyber-muted mt-0.5">{cve.cvss.baseSeverity}</p>
                  <p className="font-mono text-[9px] text-cyber-muted mt-1 break-all">{cve.cvss.vectorString}</p>
                </div>
              </div>
            )}

            {/* CWE */}
            {cve.cwe && cve.cwe.length > 0 && (
              <div>
                <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-2">Weakness (CWE)</p>
                <div className="flex flex-wrap gap-1.5">
                  {cve.cwe.map(w => (
                    <span key={w} className="font-mono text-[10px] border border-cyber-orange/30 text-cyber-orange bg-cyber-orange/5 rounded px-2 py-0.5">{w}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Affected products */}
            {cve.affectedProducts.length > 0 && (
              <div>
                <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-2">Affected Products</p>
                <div className="flex flex-wrap gap-1.5">
                  {cve.affectedProducts.map(p => (
                    <span key={p} className="font-mono text-[10px] border border-cyber-border text-cyber-text rounded px-2 py-0.5 capitalize">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* References */}
          {cve.references.length > 0 && (
            <div>
              <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-2">References</p>
              <div className="space-y-1">
                {cve.references.map(url => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-mono text-[10px] text-cyber-cyan hover:underline truncate">
                    <ExternalLink size={9} />
                    {url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CvePage() {
  const [query,    setQuery]    = useState('')
  const [severity, setSeverity] = useState('')
  const [result,   setResult]   = useState<CveSearchResult | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [page,     setPage]     = useState(0)

  async function search(p = 0) {
    setLoading(true); setError(''); if (p === 0) setResult(null); setPage(p)
    const params = new URLSearchParams()
    if (query.trim()) {
      if (/^CVE-\d{4}-\d+$/i.test(query.trim())) params.set('cveId', query.trim())
      else params.set('query', query.trim())
    }
    if (severity) params.set('severity', severity)
    params.set('page', String(p))
    try {
      const res  = await fetch(`/api/cve?${params}`)
      const data: CveSearchResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed') }
    finally { setLoading(false) }
  }

  const totalPages = result ? Math.ceil(result.totalResults / 20) : 0

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield size={16} className="text-cyber-orange" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">CVE Explorer</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Live NVD vulnerability database — search by keyword, CVE ID, or filter by severity.
        </p>
      </div>

      <TerminalCard title="Search" accent="none">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="cyber-input flex-1"
            placeholder="CVE-2024-1234 or keyword e.g. 'apache log4j'"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search(0)}
          />
          <select
            className="cyber-input w-full sm:w-40"
            value={severity}
            onChange={e => setSeverity(e.target.value)}
          >
            <option value="">All Severities</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="cyber-btn flex items-center gap-2" onClick={() => search(0)} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <Search size={13} />}
            {loading ? 'Searching' : 'Search'}
          </button>
        </div>
        {/* Quick filters */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-cyber-border/40">
          <span className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest self-center">Quick:</span>
          {['log4j','ssh','windows','apache','chrome','kernel'].map(kw => (
            <button key={kw} onClick={() => { setQuery(kw); search(0) }}
              className="font-mono text-[10px] text-cyber-muted border border-cyber-border hover:border-cyber-orange/40 hover:text-cyber-orange px-2 py-0.5 rounded transition-colors">
              {kw}
            </button>
          ))}
        </div>
      </TerminalCard>

      {error && (
        <div className="cyber-card-red p-3 flex items-center gap-2">
          <AlertTriangle size={13} className="text-cyber-red flex-none" />
          <span className="font-mono text-xs text-cyber-red">{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-cyber-muted">
              <span className="text-cyber-text-hi font-600">{result.totalResults.toLocaleString()}</span> results
              {severity && <span> · filtered by <span className="text-cyber-orange">{severity}</span></span>}
            </p>
            {totalPages > 1 && (
              <p className="font-mono text-[10px] text-cyber-muted">
                Page {page + 1} / {Math.min(totalPages, 50)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            {result.items.map(cve => <CveCard key={cve.id} cve={cve} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => search(page - 1)}
                disabled={page === 0 || loading}
                className="cyber-btn px-4 py-1.5 text-[11px] disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="font-mono text-[11px] text-cyber-muted">
                {page + 1} / {Math.min(totalPages, 50)}
              </span>
              <button
                onClick={() => search(page + 1)}
                disabled={page >= Math.min(totalPages - 1, 49) || loading}
                className="cyber-btn px-4 py-1.5 text-[11px] disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
