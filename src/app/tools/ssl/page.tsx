'use client'

import { useState } from 'react'
import { Lock, Search, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import type { SslInspectResult } from '@/lib/types'

const QUICK = [
  { label: 'google.com',    host: 'google.com'    },
  { label: 'github.com',    host: 'github.com'    },
  { label: 'cloudflare.com',host: 'cloudflare.com'},
  { label: 'expired-demo',  host: 'expired.badssl.com' },
]

function daysColor(days: number): string {
  if (days < 0)   return 'text-cyber-red'
  if (days < 14)  return 'text-cyber-red'
  if (days < 30)  return 'text-cyber-orange'
  return 'text-cyber-green'
}

export default function SslPage() {
  const [host,    setHost]    = useState('')
  const [port,    setPort]    = useState('443')
  const [result,  setResult]  = useState<SslInspectResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function inspect(h?: string, p?: string) {
    const target = (h ?? host).trim().replace(/^https?:\/\//, '').split('/')[0]
    const targetPort = p ?? port
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/ssl?host=${encodeURIComponent(target)}&port=${targetPort}`)
      const data: SslInspectResult = await res.json()
      if (data.error && !data.subject) setError(data.error)
      else setResult(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed') }
    finally { setLoading(false) }
  }

  const r = result

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} className="text-cyber-green" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">SSL Inspector</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Live TLS certificate inspection — expiry, issuer, SANs, protocol, cipher suite
        </p>
      </div>

      <TerminalCard title="Target" accent="green">
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              className="cyber-input font-mono flex-1"
              placeholder="hostname (e.g. github.com)"
              value={host}
              onChange={e => setHost(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && inspect()}
            />
            <input
              className="cyber-input font-mono w-20"
              placeholder="Port"
              value={port}
              onChange={e => setPort(e.target.value)}
              type="number"
              min={1}
              max={65535}
            />
            <button className="cyber-btn flex items-center gap-2" onClick={() => inspect()} disabled={loading}>
              {loading ? <Spinner size="sm" /> : <Search size={13} />}
              {loading ? 'Checking' : 'Inspect'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map(q => (
              <button key={q.host}
                onClick={() => { setHost(q.host); inspect(q.host) }}
                className="font-mono text-[10px] text-cyber-muted border border-cyber-border hover:border-cyber-green/40 hover:text-cyber-green rounded px-2 py-0.5 transition-colors">
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </TerminalCard>

      {error && <div className="cyber-card-red p-3 font-mono text-xs text-cyber-red">{error}</div>}

      {r && (
        <div className="space-y-4 animate-slide-up">
          {/* Verdict banner */}
          <div className={`cyber-card p-4 border ${r.valid ? 'border-cyber-green/40' : 'border-cyber-red/40'}`}>
            <div className="flex items-center gap-3">
              {r.valid
                ? <CheckCircle size={20} className="text-cyber-green flex-none" />
                : <XCircle    size={20} className="text-cyber-red flex-none" />}
              <div className="flex-1">
                <p className={`font-mono text-sm font-700 ${r.valid ? 'text-cyber-green' : 'text-cyber-red'}`}>
                  {r.valid ? 'Certificate Valid' : r.error ? 'Connection Failed' : 'Certificate Invalid / Expired'}
                </p>
                <p className="font-mono text-[11px] text-cyber-muted mt-0.5">{r.subject}</p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-2xl font-700 ${daysColor(r.daysLeft)}`}>{r.daysLeft}</p>
                <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">days left</p>
              </div>
            </div>
            {r.error && (
              <p className="font-mono text-[11px] text-cyber-red mt-2">{r.error}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Certificate details */}
            <TerminalCard title="Certificate" accent="green">
              <div className="space-y-0">
                {[
                  { label: 'Subject',  value: r.subject    },
                  { label: 'Issuer',   value: r.issuer     },
                  { label: 'Issued',   value: r.issuedAt ? new Date(r.issuedAt).toLocaleDateString() : '—' },
                  { label: 'Expires',  value: r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : '—' },
                  { label: 'Serial',   value: r.serialNumber?.slice(0, 24) },
                  { label: 'Key bits', value: r.keyBits ? `${r.keyBits}-bit` : undefined },
                ].filter(x => x.value).map(({ label, value }) => (
                  <div key={label} className="flex gap-3 py-1.5 border-b border-cyber-border/30 last:border-0">
                    <span className="font-mono text-[10px] text-cyber-muted w-20 flex-none uppercase tracking-wider">{label}</span>
                    <span className="font-mono text-[11px] text-cyber-text-hi break-all">{value}</span>
                  </div>
                ))}
                {r.fingerprint256 && (
                  <div className="pt-2">
                    <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-1">SHA-256 Fingerprint</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[10px] text-cyber-muted break-all">{r.fingerprint256}</p>
                      <CopyButton text={r.fingerprint256} />
                    </div>
                  </div>
                )}
              </div>
            </TerminalCard>

            {/* Connection */}
            <TerminalCard title="Connection" accent="cyan">
              <div className="space-y-0">
                {[
                  { label: 'Protocol', value: r.protocol, color: r.protocol?.includes('1.3') ? 'text-cyber-green' : r.protocol?.includes('1.2') ? 'text-cyber-cyan' : 'text-cyber-orange' },
                  { label: 'Cipher',   value: r.cipher,   color: 'text-cyber-text-hi' },
                  { label: 'Host',     value: `${r.host}:${r.port}`, color: 'text-cyber-text-hi' },
                  { label: 'Authorized', value: r.authorized ? 'Yes (chain valid)' : 'No (self-signed or chain error)',
                    color: r.authorized ? 'text-cyber-green' : 'text-cyber-orange' },
                ].filter(x => x.value).map(({ label, value, color }) => (
                  <div key={label} className="flex gap-3 py-1.5 border-b border-cyber-border/30 last:border-0">
                    <span className="font-mono text-[10px] text-cyber-muted w-24 flex-none uppercase tracking-wider">{label}</span>
                    <span className={`font-mono text-[11px] ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                {r.protocol?.includes('1.3') && (
                  <div className="flex items-center gap-1.5 p-2 border border-cyber-green/20 rounded bg-cyber-green/5">
                    <CheckCircle size={11} className="text-cyber-green" />
                    <span className="font-mono text-[10px] text-cyber-green">TLS 1.3 — modern, forward secrecy</span>
                  </div>
                )}
                {r.protocol?.includes('1.2') && !r.protocol?.includes('1.3') && (
                  <div className="flex items-center gap-1.5 p-2 border border-cyber-cyan/20 rounded bg-cyber-cyan/5">
                    <AlertTriangle size={11} className="text-cyber-cyan" />
                    <span className="font-mono text-[10px] text-cyber-cyan">TLS 1.2 — acceptable, prefer upgrading to 1.3</span>
                  </div>
                )}
                {(r.protocol?.includes('1.0') || r.protocol?.includes('1.1')) && (
                  <div className="flex items-center gap-1.5 p-2 border border-cyber-red/20 rounded bg-cyber-red/5">
                    <XCircle size={11} className="text-cyber-red" />
                    <span className="font-mono text-[10px] text-cyber-red">Outdated TLS — vulnerable to attacks</span>
                  </div>
                )}
              </div>
            </TerminalCard>
          </div>

          {/* SANs */}
          {r.san.length > 0 && (
            <TerminalCard title={`Subject Alternative Names (${r.san.length})`} accent="none">
              <div className="flex flex-wrap gap-1.5">
                {r.san.map(name => (
                  <span key={name} className="font-mono text-[10px] border border-cyber-border rounded px-2 py-0.5 text-cyber-muted">
                    {name}
                  </span>
                ))}
              </div>
            </TerminalCard>
          )}

          {/* Expiry timeline */}
          <TerminalCard title="Expiry Status" accent={r.daysLeft < 14 ? 'red' : r.daysLeft < 30 ? 'none' : 'green'}>
            <div className="flex items-center gap-3">
              <Clock size={13} className={daysColor(r.daysLeft)} />
              <div className="flex-1">
                <div className="h-2 bg-cyber-bg rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${r.daysLeft < 0 ? 'bg-cyber-red' : r.daysLeft < 14 ? 'bg-cyber-red' : r.daysLeft < 30 ? 'bg-cyber-orange' : 'bg-cyber-green'}`}
                    style={{ width: `${Math.max(0, Math.min(100, (r.daysLeft / 365) * 100))}%` }}
                  />
                </div>
              </div>
              <span className={`font-mono text-xs font-700 ${daysColor(r.daysLeft)}`}>
                {r.daysLeft < 0 ? 'EXPIRED' : `${r.daysLeft}d`}
              </span>
            </div>
            <p className="font-mono text-[10px] text-cyber-muted mt-2">
              {r.daysLeft < 0
                ? 'Certificate is expired. Visitors will see security warnings.'
                : r.daysLeft < 14
                  ? 'Critical: renew immediately.'
                  : r.daysLeft < 30
                    ? 'Warning: certificate expiring soon, schedule renewal.'
                    : 'Certificate has adequate validity remaining.'}
            </p>
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
