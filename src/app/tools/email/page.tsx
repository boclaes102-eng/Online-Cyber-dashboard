'use client'

import { useState } from 'react'
import { Radio, Search, CheckCircle, XCircle, AlertTriangle, ShieldAlert } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import type { EmailOsintResult } from '@/lib/types'

export default function EmailPage() {
  const [email,   setEmail]   = useState('')
  const [result,  setResult]  = useState<EmailOsintResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function lookup(e?: string) {
    const target = (e ?? email).trim().toLowerCase()
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/email?email=${encodeURIComponent(target)}`)
      const data: EmailOsintResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch (ex) { setError(ex instanceof Error ? ex.message : 'Request failed') }
    finally { setLoading(false) }
  }

  const r = result

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Radio size={16} className="text-cyber-orange" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">Email OSINT</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Domain reputation · MX/SPF/DMARC analysis · Disposable check · Gravatar · Breach history
        </p>
      </div>

      <TerminalCard title="Email Input" accent="none">
        <div className="flex gap-3">
          <input
            className="cyber-input font-mono flex-1"
            placeholder="target@example.com"
            value={email}
            type="email"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup()}
          />
          <button className="cyber-btn flex items-center gap-2" onClick={() => lookup()} disabled={loading || !email}>
            {loading ? <Spinner size="sm" /> : <Search size={13} />}
            {loading ? 'Scanning' : 'Lookup'}
          </button>
        </div>
      </TerminalCard>

      {error && <div className="cyber-card-red p-3 font-mono text-xs text-cyber-red">{error}</div>}

      {r && (
        <div className="space-y-4 animate-slide-up">
          {/* Summary banner */}
          <div className={`cyber-card p-4 border ${r.disposable ? 'border-cyber-red/40' : r.valid ? 'border-cyber-green/30' : 'border-cyber-border'}`}>
            <div className="flex items-center gap-3">
              {r.disposable
                ? <ShieldAlert size={20} className="text-cyber-red flex-none" />
                : r.valid
                  ? <CheckCircle size={20} className="text-cyber-green flex-none" />
                  : <XCircle size={20} className="text-cyber-red flex-none" />}
              <div>
                <p className={`font-mono text-sm font-700 ${r.disposable ? 'text-cyber-red' : r.valid ? 'text-cyber-green' : 'text-cyber-red'}`}>
                  {r.disposable ? 'DISPOSABLE EMAIL' : r.valid ? 'VALID EMAIL FORMAT' : 'INVALID EMAIL'}
                </p>
                <p className="font-mono text-[11px] text-cyber-muted mt-0.5">{r.email}</p>
              </div>
              <CopyButton text={r.email} />
            </div>
            {r.disposable && (
              <p className="font-mono text-[10px] text-cyber-red mt-2">
                This is a known disposable/temporary email domain — likely used to bypass registration.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Domain info */}
            <TerminalCard title="Domain" accent="cyan">
              <div className="space-y-2">
                <div className="flex gap-3 items-center py-1.5 border-b border-cyber-border/30">
                  <span className="font-mono text-[10px] text-cyber-muted w-20 flex-none">Domain</span>
                  <span className="font-mono text-[11px] text-cyber-text-hi">{r.domain}</span>
                </div>
                {/* MX records */}
                <div>
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-1.5">MX Records</p>
                  {r.mx.length === 0 ? (
                    <div className="flex items-center gap-2">
                      <XCircle size={11} className="text-cyber-red" />
                      <span className="font-mono text-[11px] text-cyber-red">No MX records — domain cannot receive email</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {r.mx.map((mx, i) => (
                        <div key={i} className="font-mono text-[11px] text-cyber-text-hi">
                          {mx.value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TerminalCard>

            {/* Email security */}
            <TerminalCard title="Email Security" accent="none">
              <div className="space-y-2">
                {/* SPF */}
                <div className="p-2 border rounded border-cyber-border">
                  <div className="flex items-center gap-2 mb-1">
                    {r.spf
                      ? <CheckCircle size={11} className="text-cyber-green" />
                      : <XCircle    size={11} className="text-cyber-red"   />}
                    <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">SPF</span>
                  </div>
                  {r.spf
                    ? <p className="font-mono text-[10px] text-cyber-text-hi break-all">{r.spf}</p>
                    : <p className="font-mono text-[10px] text-cyber-red">No SPF record — spoofing risk</p>}
                </div>

                {/* DMARC */}
                <div className="p-2 border rounded border-cyber-border">
                  <div className="flex items-center gap-2 mb-1">
                    {r.dmarc
                      ? <CheckCircle size={11} className="text-cyber-green" />
                      : <AlertTriangle size={11} className="text-cyber-orange" />}
                    <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">DMARC</span>
                  </div>
                  {r.dmarc
                    ? <p className="font-mono text-[10px] text-cyber-text-hi break-all">{r.dmarc}</p>
                    : <p className="font-mono text-[10px] text-cyber-orange">No DMARC policy</p>}
                </div>

                {/* Gravatar */}
                <div className="flex items-center gap-2 py-1.5 border-b border-cyber-border/30">
                  <span className="font-mono text-[10px] text-cyber-muted w-24 flex-none">Gravatar</span>
                  <span className={`font-mono text-[11px] ${r.gravatarExists ? 'text-cyber-green' : 'text-cyber-muted'}`}>
                    {r.gravatarExists ? 'Profile found' : 'No profile'}
                  </span>
                </div>
              </div>
            </TerminalCard>
          </div>

          {/* Domain breaches */}
          {r.domainBreaches && r.domainBreaches.length > 0 && (
            <TerminalCard title={`Domain Breach History (${r.domainBreaches.length})`} accent="red">
              <p className="font-mono text-[10px] text-cyber-muted mb-3">
                These breaches affected the <span className="text-cyber-text-hi">{r.domain}</span> domain.
                This does not confirm the specific email was exposed.
              </p>
              <div className="space-y-2">
                {r.domainBreaches.map(b => (
                  <div key={b.name} className="p-2 border border-cyber-border rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] text-cyber-text-hi font-600">{b.name}</span>
                      <span className="font-mono text-[10px] text-cyber-muted">{b.breachDate}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {b.dataClasses.slice(0, 6).map(dc => (
                        <span key={dc} className="font-mono text-[10px] border border-cyber-orange/30 text-cyber-orange bg-cyber-orange/5 rounded px-1.5 py-0.5">
                          {dc}
                        </span>
                      ))}
                      {b.dataClasses.length > 6 && (
                        <span className="font-mono text-[10px] text-cyber-muted">+{b.dataClasses.length - 6} more</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TerminalCard>
          )}

          {r.domainBreaches?.length === 0 && (
            <div className="cyber-card p-3 border border-cyber-green/20 flex items-center gap-2">
              <CheckCircle size={13} className="text-cyber-green" />
              <span className="font-mono text-xs text-cyber-muted">Domain not found in any known breaches (HIBP)</span>
            </div>
          )}
        </div>
      )}

      {!r && !loading && (
        <TerminalCard title="Data Sources" accent="none">
          <ul className="space-y-1.5">
            {[
              ['MX Records',      'Google DoH — checks if domain can receive email'],
              ['SPF',             'TXT record — anti-spoofing policy'],
              ['DMARC',           '_dmarc.domain TXT — policy for unauthenticated mail'],
              ['Disposable check','Built-in list of 30+ throwaway mail domains'],
              ['Gravatar',        'Checks avatar registry for profile existence'],
              ['HIBP Domain',     'Free endpoint — breaches affecting the email domain'],
            ].map(([label, desc]) => (
              <li key={label} className="flex gap-3">
                <span className="font-mono text-[10px] text-cyber-cyan w-32 flex-none">{label}</span>
                <span className="font-mono text-[10px] text-cyber-muted">{desc}</span>
              </li>
            ))}
          </ul>
        </TerminalCard>
      )}
    </div>
  )
}
