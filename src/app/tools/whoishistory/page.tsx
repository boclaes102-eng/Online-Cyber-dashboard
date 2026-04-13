'use client'

import { useState } from 'react'
import { History, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { WhoisHistoryResult } from '@/app/api/whoishistory/route'

// EPP status code plain-English explanations
const EPP: Record<string, string> = {
  ok:                          'Domain is active — no restrictions',
  active:                      'Domain is active',
  clientTransferProhibited:    'Transfer locked by registrant',
  clientUpdateProhibited:      'Updates locked by registrant',
  clientDeleteProhibited:      'Deletion locked by registrant',
  serverTransferProhibited:    'Transfer locked by registry',
  serverUpdateProhibited:      'Updates locked by registry',
  serverDeleteProhibited:      'Deletion locked by registry',
  clientHold:                  'Domain on hold — DNS not active',
  serverHold:                  'Registry hold — DNS not active',
  pendingDelete:               'Scheduled for deletion',
  pendingTransfer:             'Transfer in progress',
  pendingCreate:               'Registration in progress',
  redemptionPeriod:            'Recently deleted — in 30-day redemption window',
  autoRenewPeriod:             'In auto-renew grace period',
  transferPeriod:              'Recently transferred — in grace period',
}

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch { return iso }
}

function domainAge(created?: string): string {
  if (!created) return '—'
  const ms = Date.now() - new Date(created).getTime()
  const years  = Math.floor(ms / (365.25 * 86400000))
  const months = Math.floor((ms % (365.25 * 86400000)) / (30.44 * 86400000))
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`
  return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? `, ${months} mo` : ''}`
}

function daysToExpiry(expires?: string): number | null {
  if (!expires) return null
  return Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000)
}

function Timeline({ created, updated, expires }: { created?: string; updated?: string; expires?: string }) {
  if (!created) return null

  const createdMs = new Date(created).getTime()
  const expiresMs = expires ? new Date(expires).getTime() : Date.now() + 365 * 86400000
  const nowMs     = Date.now()
  const total     = expiresMs - createdMs
  const elapsed   = nowMs     - createdMs
  const nowPct    = Math.min(Math.max((elapsed / total) * 100, 0), 100)

  let updPct: number | null = null
  if (updated) {
    const updMs = new Date(updated).getTime()
    updPct = Math.min(Math.max(((updMs - createdMs) / total) * 100, 0), 100)
  }

  const dte = daysToExpiry(expires)
  const expiryColor =
    dte === null ? 'text-cyber-muted' :
    dte < 0      ? 'text-red-400' :
    dte < 30     ? 'text-red-400' :
    dte < 90     ? 'text-cyber-orange' :
                   'text-cyber-green'

  return (
    <div>
      <div className="flex justify-between font-mono text-[10px] text-cyber-muted mb-1.5">
        <span>{fmtDate(created)}</span>
        {expires && <span>{fmtDate(expires)}</span>}
      </div>

      <div className="relative h-3 bg-cyber-border/30 rounded-full overflow-visible">
        {/* Filled bar (age) */}
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyber-cyan/60 to-cyber-green/60 rounded-full"
          style={{ width: `${nowPct}%` }}
        />
        {/* Last-updated tick */}
        {updPct !== null && (
          <div
            className="absolute top-0 w-0.5 h-full bg-cyber-orange/70"
            style={{ left: `${updPct}%` }}
          />
        )}
        {/* Now marker */}
        <div
          className="absolute -top-0.5 w-2 h-4 bg-cyber-text-hi/90 rounded-sm"
          style={{ left: `calc(${nowPct}% - 4px)` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2 font-mono text-[10px]">
        <span className="text-cyber-cyan">Age: {domainAge(created)}</span>
        {updated && <span className="text-cyber-orange">Updated: {fmtDate(updated)}</span>}
        {expires && (
          <span className={expiryColor}>
            {dte === null ? '' : dte < 0 ? 'EXPIRED' : `${dte}d until expiry`}
          </span>
        )}
      </div>
    </div>
  )
}

export default function WhoisHistoryPage() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState<WhoisHistoryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showRaw, setShowRaw] = useState(false)

  async function lookup(d?: string) {
    const domain = (d ?? query).trim()
    if (!domain) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res  = await fetch(`/api/whoishistory?domain=${encodeURIComponent(domain)}`)
      const data: WhoisHistoryResult = await res.json()
      if (data.error && !data.created) setError(data.error)
      else setResult(data)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-orange/30 flex items-center justify-center bg-cyber-orange/5 flex-none">
          <History size={18} className="text-cyber-orange" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">WHOIS History</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Domain registration timeline, ownership info, and RDAP event history via IANA RDAP + WHOIS.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Domain Lookup" label="WHOIS" accent="orange">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && lookup()}
            placeholder="example.com"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-orange/60"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-orange/10 border border-cyber-orange/30 text-cyber-orange font-mono text-xs rounded hover:bg-cyber-orange/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <History size={12} />}
            Lookup
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['google.com', 'github.com', 'cloudflare.com'].map(d => (
              <button
                key={d}
                onClick={() => { setQuery(d); lookup(d) }}
                className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-orange hover:border-cyber-orange/40 rounded transition-all"
              >
                {d}
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

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Registration timeline */}
          <TerminalCard title="Ownership Timeline" label="TIMELINE" accent="orange">
            <Timeline
              created={result.created}
              updated={result.updated}
              expires={result.expires}
            />
          </TerminalCard>

          {/* Registration details */}
          <TerminalCard title="Registration" label="WHOIS" accent="none">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: 'Domain',     value: result.domain },
                { label: 'Registrar',  value: result.registrar },
                { label: 'Created',    value: fmtDate(result.created) },
                { label: 'Updated',    value: fmtDate(result.updated) },
                { label: 'Expires',    value: fmtDate(result.expires) },
                { label: 'DNSSEC',     value: result.dnssec },
              ].map(({ label, value }) => value && (
                <div key={label}>
                  <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">{label}</p>
                  <p className="font-mono text-xs text-cyber-text-hi mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {result.registrarUrl && (
              <a
                href={result.registrarUrl.startsWith('http') ? result.registrarUrl : `https://${result.registrarUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 font-mono text-[10px] text-cyber-muted hover:text-cyber-orange transition-colors"
              >
                <ExternalLink size={10} />
                {result.registrarUrl}
              </a>
            )}
          </TerminalCard>

          {/* Nameservers */}
          {result.nameservers.length > 0 && (
            <TerminalCard title="Nameservers" label="NS" accent="none">
              <div className="space-y-1">
                {result.nameservers.map(ns => (
                  <p key={ns} className="font-mono text-xs text-cyber-cyan">{ns}</p>
                ))}
              </div>
            </TerminalCard>
          )}

          {/* EPP status */}
          {result.status.length > 0 && (
            <TerminalCard title="Domain Status" label="EPP" accent="none">
              <div className="space-y-2">
                {result.status.map(s => {
                  const url = s.startsWith('http') ? s : null
                  const code = s.replace(/https?:\/\/\S+/, '').trim()
                  return (
                    <div key={s} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan/60 flex-none mt-1.5" />
                      <div>
                        <p className="font-mono text-xs text-cyber-text-hi">{code}</p>
                        {EPP[code] && (
                          <p className="font-mono text-[10px] text-cyber-muted mt-0.5">{EPP[code]}</p>
                        )}
                      </div>
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyber-muted hover:text-cyber-cyan transition-colors flex-none">
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </TerminalCard>
          )}

          {/* RDAP events */}
          {result.events.length > 0 && (
            <TerminalCard title="RDAP Event Log" label="EVENTS" accent="none">
              <div className="space-y-1 divide-y divide-cyber-border/30">
                {result.events.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                    <span className="font-mono text-xs text-cyber-text capitalize">{ev.action}</span>
                    <span className="font-mono text-[10px] text-cyber-muted">{fmtDate(ev.date)}</span>
                  </div>
                ))}
              </div>
            </TerminalCard>
          )}

          {/* Raw WHOIS */}
          {result.rawText && (
            <TerminalCard title="Raw WHOIS" label="TEXT" accent="none">
              <button
                onClick={() => setShowRaw(r => !r)}
                className="flex items-center gap-2 font-mono text-xs text-cyber-muted hover:text-cyber-text transition-colors mb-3"
              >
                {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showRaw ? 'Collapse' : 'Show raw WHOIS output'}
              </button>
              {showRaw && (
                <pre className="font-mono text-[10px] text-cyber-text bg-cyber-bg border border-cyber-border/40 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                  {result.rawText}
                </pre>
              )}
            </TerminalCard>
          )}
        </div>
      )}
    </div>
  )
}
