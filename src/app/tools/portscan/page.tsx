'use client'

import { useState } from 'react'
import { Cpu, Search, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import type { PortScanResult } from '@/lib/types'

const PORT_RISK: Record<number, 'high' | 'medium' | 'low'> = {
  21: 'high', 23: 'high', 3389: 'high', 5900: 'high', 11211: 'high',
  22: 'medium', 25: 'medium', 445: 'medium', 1433: 'medium', 1521: 'medium',
  3306: 'medium', 5432: 'medium', 6379: 'medium', 27017: 'medium',
  9200: 'high', 9300: 'medium',
}

const RISK_COLOR = { high: 'text-cyber-red', medium: 'text-cyber-orange', low: 'text-cyber-green' }
const RISK_BORDER = { high: 'border-cyber-red/30', medium: 'border-cyber-orange/30', low: 'border-cyber-border' }

const SERVICE_NOTES: Record<string, string> = {
  'FTP':   'Plaintext auth — use SFTP instead',
  'Telnet':'Unencrypted — use SSH instead',
  'RDP':   'Common bruteforce target — restrict to VPN',
  'VNC':   'Remote desktop — restrict to internal',
  'Redis': 'No auth by default — often exploited for RCE',
  'MongoDB': 'Check if auth is required',
  'Elasticsearch': 'Often exposed without auth — data leak risk',
  'Memcached': 'Can be used for DDoS amplification',
  'SMB':   'Common ransomware vector',
  'MSSQL': 'Database — restrict access',
  'MySQL': 'Database — restrict access',
  'PostgreSQL': 'Database — restrict access',
}

const QUICK_TARGETS = [
  { label: 'scanme.nmap.org', ip: 'scanme.nmap.org' },
  { label: '8.8.8.8 (Google)', ip: '8.8.8.8' },
]

export default function PortScanPage() {
  const [target,  setTarget]  = useState('')
  const [result,  setResult]  = useState<PortScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function scan(t?: string) {
    const ip = (t ?? target).trim()
    if (!ip) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/portscan?ip=${encodeURIComponent(ip)}`)
      const data: PortScanResult = await res.json()
      if (data.error) setError(data.error)
      setResult(data)
    } catch (ex) { setError(ex instanceof Error ? ex.message : 'Request failed') }
    finally { setLoading(false) }
  }

  const r = result

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Cpu size={16} className="text-cyber-cyan" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">Port Scanner</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Shodan historical data (with API key) or live TCP scan of 28 common ports
        </p>
      </div>

      <TerminalCard title="Target" accent="cyan">
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              className="cyber-input font-mono flex-1"
              placeholder="IP address or hostname…"
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && scan()}
            />
            <button className="cyber-btn flex items-center gap-2" onClick={() => scan()} disabled={loading || !target}>
              {loading ? <Spinner size="sm" /> : <Search size={13} />}
              {loading ? 'Scanning' : 'Scan'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TARGETS.map(q => (
              <button key={q.ip}
                onClick={() => { setTarget(q.ip); scan(q.ip) }}
                className="font-mono text-[10px] text-cyber-muted border border-cyber-border hover:border-cyber-cyan/40 hover:text-cyber-cyan rounded px-2 py-0.5 transition-colors">
                {q.label}
              </button>
            ))}
          </div>
          {loading && (
            <p className="font-mono text-[10px] text-cyber-muted animate-pulse">
              Live TCP scan — checking 28 ports in parallel (up to 2s per port)…
            </p>
          )}
        </div>
      </TerminalCard>

      {error && <div className="cyber-card-red p-3 font-mono text-xs text-cyber-red">{error}</div>}

      {r && (
        <div className="space-y-4 animate-slide-up">
          {/* Mode badge */}
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[10px] border rounded px-2 py-0.5 ${r.mode === 'shodan' ? 'border-cyber-cyan/30 text-cyber-cyan' : 'border-cyber-green/30 text-cyber-green'}`}>
              {r.mode === 'shodan' ? 'SHODAN' : 'LIVE TCP'}
            </span>
            <span className="font-mono text-[10px] text-cyber-muted">
              {r.mode === 'shodan' ? 'Historical Shodan data' : 'Real-time TCP connection check'}
            </span>
          </div>

          {/* Summary */}
          <div className={`cyber-card p-4 border ${r.ports.length > 0 ? 'border-cyber-orange/30' : 'border-cyber-green/30'}`}>
            <div className="flex items-center gap-3">
              {r.ports.length > 0
                ? <AlertTriangle size={18} className="text-cyber-orange flex-none" />
                : <CheckCircle  size={18} className="text-cyber-green flex-none"  />}
              <div className="flex-1">
                <p className={`font-mono text-sm font-700 ${r.ports.length > 0 ? 'text-cyber-orange' : 'text-cyber-green'}`}>
                  {r.ports.length} open port{r.ports.length !== 1 ? 's' : ''} found
                </p>
                <p className="font-mono text-[11px] text-cyber-muted mt-0.5">{r.ip}</p>
              </div>
            </div>
            {(r.org || r.os || r.country) && (
              <div className="flex gap-4 mt-3 flex-wrap">
                {r.org     && <span className="font-mono text-[10px] text-cyber-muted">Org: <span className="text-cyber-text-hi">{r.org}</span></span>}
                {r.os      && <span className="font-mono text-[10px] text-cyber-muted">OS: <span className="text-cyber-text-hi">{r.os}</span></span>}
                {r.country && <span className="font-mono text-[10px] text-cyber-muted">Country: <span className="text-cyber-text-hi">{r.country}</span></span>}
              </div>
            )}
            {r.hostnames && r.hostnames.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {r.hostnames.map(h => (
                  <span key={h} className="font-mono text-[10px] border border-cyber-border rounded px-1.5 py-px text-cyber-muted">{h}</span>
                ))}
              </div>
            )}
          </div>

          {/* Port list */}
          {r.services.length > 0 && (
            <TerminalCard title="Open Ports" accent="none">
              <div className="space-y-0">
                {r.services.map(svc => {
                  const risk = PORT_RISK[svc.port] ?? 'low'
                  const note = svc.service ? SERVICE_NOTES[svc.service] : undefined
                  return (
                    <div key={svc.port} className={`py-2.5 border-b border-cyber-border/30 last:border-0`}>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-xs font-700 w-14 flex-none ${RISK_COLOR[risk]}`}>
                          {svc.port}
                        </span>
                        <span className="font-mono text-[10px] border rounded px-1.5 py-px flex-none text-cyber-muted border-cyber-border">
                          {svc.protocol}
                        </span>
                        <span className="font-mono text-[11px] text-cyber-text-hi flex-1">
                          {svc.service ?? 'unknown'}
                          {svc.product && <span className="text-cyber-muted"> · {svc.product}</span>}
                          {svc.version && <span className="text-cyber-muted"> {svc.version}</span>}
                        </span>
                        <span className={`font-mono text-[9px] border rounded px-1.5 py-px ${RISK_BORDER[risk]} ${RISK_COLOR[risk]}`}>
                          {risk.toUpperCase()}
                        </span>
                      </div>
                      {note && (
                        <div className="flex items-center gap-1.5 mt-1 ml-16">
                          <AlertTriangle size={10} className="text-cyber-orange flex-none" />
                          <p className="font-mono text-[10px] text-cyber-orange">{note}</p>
                        </div>
                      )}
                      {svc.cpe && (
                        <p className="font-mono text-[9px] text-cyber-muted mt-1 ml-16">{svc.cpe}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </TerminalCard>
          )}

          {/* CVE exposure (Shodan only) */}
          {r.vulns && r.vulns.length > 0 && (
            <TerminalCard title={`Known CVEs (${r.vulns.length})`} accent="red">
              <div className="flex flex-wrap gap-1.5">
                {r.vulns.map(cve => (
                  <a key={cve}
                    href={`/tools/cve?id=${cve}`}
                    className="font-mono text-[10px] border border-cyber-red/30 text-cyber-red bg-cyber-red/5 rounded px-2 py-0.5 hover:bg-cyber-red/10 transition-colors">
                    {cve}
                  </a>
                ))}
              </div>
            </TerminalCard>
          )}

          {r.lastUpdate && (
            <p className="font-mono text-[9px] text-cyber-muted">Shodan last crawled: {r.lastUpdate}</p>
          )}
        </div>
      )}

      {!r && !loading && (
        <TerminalCard title="How it works" accent="none">
          <div className="space-y-3">
            <div className="p-2 border border-cyber-cyan/20 rounded bg-cyber-cyan/5">
              <div className="flex items-center gap-2 mb-1">
                <Info size={11} className="text-cyber-cyan" />
                <span className="font-mono text-[10px] text-cyber-cyan font-600">With SHODAN_API_KEY</span>
              </div>
              <p className="font-mono text-[10px] text-cyber-muted">
                Rich historical data: open ports, service banners, product versions, OS detection, known CVEs, hostname history.
              </p>
            </div>
            <div className="p-2 border border-cyber-border rounded">
              <div className="flex items-center gap-2 mb-1">
                <Info size={11} className="text-cyber-muted" />
                <span className="font-mono text-[10px] text-cyber-muted font-600">Without API key (TCP scan)</span>
              </div>
              <p className="font-mono text-[10px] text-cyber-muted">
                Live TCP connection attempt on 28 common ports with 2s timeout each, run in parallel. Real-time results in ~2–3 seconds.
              </p>
            </div>
            <p className="font-mono text-[9px] text-cyber-muted pt-1">
              Free Shodan account: <span className="text-cyber-cyan">shodan.io</span> → Dashboard → API Key → add to .env.local as SHODAN_API_KEY
            </p>
          </div>
        </TerminalCard>
      )}
    </div>
  )
}
