'use client'

import { useState } from 'react'
import { Globe, Search, MapPin, Server, Shield, AlertTriangle, Wifi } from 'lucide-react'
import type { IpResult } from '@/lib/types'
import TerminalCard from '@/components/ui/TerminalCard'
import SeverityBadge from '@/components/ui/SeverityBadge'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import SaveToWorkspace from '@/components/ui/SaveToWorkspace'
import { formatDate } from '@/lib/utils'

function RiskBadge({ level }: { level: IpResult['riskLevel'] }) {
  const map = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' }
  return <SeverityBadge severity={map[level]} size="md" />
}

function Row({ label, value, mono = true }: { label: string; value?: string | number; mono?: boolean }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-cyber-border/40 last:border-0">
      <span className="font-mono text-[11px] text-cyber-muted flex-none w-32 uppercase tracking-wider">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} text-[12px] text-cyber-text-hi text-right break-all`}>{value}</span>
    </div>
  )
}

export default function IpPage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<IpResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function lookup() {
    const q = query.trim()
    if (!q) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`/api/ip?ip=${encodeURIComponent(q)}`)
      const data: IpResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} className="text-cyber-cyan" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">IP Intelligence</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Geolocation · ASN / ISP · Abuse reputation · Risk assessment
        </p>
      </div>

      {/* Input */}
      <TerminalCard title="Target" accent="cyan">
        <div className="flex gap-3">
          <input
            className="cyber-input flex-1"
            placeholder="8.8.8.8 or domain.com"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup()}
          />
          <button className="cyber-btn flex items-center gap-2" onClick={lookup} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <Search size={13} />}
            {loading ? 'Scanning' : 'Scan'}
          </button>
        </div>
      </TerminalCard>

      {error && (
        <div className="cyber-card-red p-3 flex items-center gap-2">
          <AlertTriangle size={13} className="text-cyber-red flex-none" />
          <span className="font-mono text-xs text-cyber-red">{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Risk banner */}
          <div className={`cyber-card p-4 flex items-center justify-between ${
            result.riskLevel === 'CRITICAL' ? 'border-cyber-red/40' :
            result.riskLevel === 'HIGH'     ? 'border-cyber-orange/40' : 'border-cyber-green/20'
          }`}>
            <div>
              <p className="font-mono text-xs text-cyber-muted uppercase tracking-widest mb-1">Risk Assessment</p>
              <p className="font-mono text-2xl font-700 text-cyber-text-hi">{result.ip}</p>
              {result.hostname && <p className="font-mono text-xs text-cyber-cyan mt-0.5">{result.hostname}</p>}
            </div>
            <div className="text-right">
              <RiskBadge level={result.riskLevel} />
              {result.abuseScore !== undefined && (
                <p className="font-mono text-xs text-cyber-muted mt-1">
                  Abuse score: <span className="text-cyber-text-hi">{result.abuseScore}</span>/100
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Geo */}
            <TerminalCard title="Geolocation" label="GEO" accent="cyan" scanline>
              <div className="space-y-0">
                <Row label="Country"  value={result.country ? `${result.country} (${result.countryCode})` : undefined} />
                <Row label="Region"   value={result.region} />
                <Row label="City"     value={result.city} />
                <Row label="Timezone" value={result.timezone} />
                {result.lat && result.lon && (
                  <div className="flex justify-between items-start gap-4 py-1.5">
                    <span className="font-mono text-[11px] text-cyber-muted flex-none w-32 uppercase tracking-wider">Coords</span>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${result.lat}&mlon=${result.lon}&zoom=12`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[12px] text-cyber-cyan hover:underline flex items-center gap-1"
                    >
                      <MapPin size={10} />
                      {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                    </a>
                  </div>
                )}
              </div>
            </TerminalCard>

            {/* Network */}
            <TerminalCard title="Network" label="ASN" accent="cyan">
              <div className="space-y-0">
                <Row label="ISP"      value={result.isp} />
                <Row label="Org"      value={result.org} />
                <Row label="AS"       value={result.as} />
                <Row label="AS Name"  value={result.asname} />
                <Row label="Private"  value={result.isPrivate ? 'Yes (RFC1918)' : 'No (Public)'} />
              </div>
            </TerminalCard>
          </div>

          {/* Abuse */}
          {result.abuseScore !== undefined && (
            <TerminalCard
              title="Abuse Intelligence"
              accent={result.abuseScore >= 50 ? 'red' : result.abuseScore >= 20 ? 'orange' : 'green'}
            >
              <div className="flex items-center gap-6">
                {/* Score meter */}
                <div className="flex-none text-center">
                  <p className={`font-mono text-4xl font-700 ${
                    result.abuseScore >= 50 ? 'text-cyber-red' : result.abuseScore >= 20 ? 'text-cyber-orange' : 'text-cyber-green'
                  }`}>{result.abuseScore}</p>
                  <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">Abuse Score</p>
                </div>
                <div className="flex-1 space-y-0">
                  <Row label="Total Reports"   value={result.totalReports} />
                  <Row label="Last Reported"   value={result.lastReported ? formatDate(result.lastReported) : undefined} />
                  <Row label="Source"          value="AbuseIPDB" />
                </div>
              </div>
            </TerminalCard>
          )}

          {/* Raw JSON */}
          <TerminalCard title="Raw Data" label="JSON" accent="none">
            <div className="flex justify-end gap-2 mb-2">
              <SaveToWorkspace
                tool="ip"
                target={result.ip}
                results={result as unknown as Record<string, unknown>}
                summary={{ ip: result.ip, country: result.country, isp: result.isp, riskLevel: result.riskLevel, abuseScore: result.abuseScore }}
              />
              <CopyButton text={JSON.stringify(result, null, 2)} />
            </div>
            <pre className="font-mono text-[11px] text-cyber-text overflow-x-auto leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </TerminalCard>
        </div>
      )}

      {/* Examples */}
      {!result && !loading && (
        <div className="flex flex-wrap gap-2">
          {['8.8.8.8', '1.1.1.1', '185.220.101.1', 'github.com'].map(ip => (
            <button
              key={ip}
              onClick={() => { setQuery(ip); }}
              className="font-mono text-[11px] text-cyber-muted border border-cyber-border hover:border-cyber-cyan/40 hover:text-cyber-cyan px-3 py-1 rounded transition-colors"
            >
              {ip}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
