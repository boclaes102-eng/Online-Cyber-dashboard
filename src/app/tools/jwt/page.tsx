'use client'

import { useState, useMemo } from 'react'
import { Lock, AlertTriangle, CheckCircle, XCircle, Clock, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'

function b64urlDecode(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  try { return atob(s) } catch { return '' }
}

function tryParse(s: string): Record<string, unknown> | null {
  try { return JSON.parse(s) } catch { return null }
}

interface JwtParts {
  raw:     { header: string; payload: string; signature: string }
  header:  Record<string, unknown> | null
  payload: Record<string, unknown> | null
  valid:   boolean
}

function parseJwt(token: string): JwtParts | null {
  const parts = token.trim().split('.')
  if (parts.length !== 3) return null
  const [h, p, sig] = parts
  const header  = tryParse(b64urlDecode(h))
  const payload = tryParse(b64urlDecode(p))
  return {
    raw: { header: h, payload: p, signature: sig },
    header,
    payload,
    valid: header !== null && payload !== null,
  }
}

type FlagSeverity = 'critical' | 'warning' | 'info'

interface Flag {
  severity: FlagSeverity
  label:    string
  detail:   string
}

function analyzeFlags(parsed: JwtParts): Flag[] {
  const flags: Flag[] = []
  const h = parsed.header
  const p = parsed.payload

  if (!h || !p) {
    flags.push({ severity: 'critical', label: 'Invalid JWT', detail: 'Token could not be decoded' })
    return flags
  }

  const alg = (h.alg as string ?? '').toUpperCase()
  if (alg === 'NONE' || alg === '') {
    flags.push({ severity: 'critical', label: 'Algorithm: none', detail: 'Unsigned token — no signature verification. Trivially forgeable.' })
  } else if (alg.startsWith('HS')) {
    flags.push({ severity: 'info', label: `Algorithm: ${alg}`, detail: 'Symmetric HMAC — both parties share the same secret key.' })
  } else if (alg.startsWith('RS') || alg.startsWith('ES') || alg.startsWith('PS')) {
    flags.push({ severity: 'info', label: `Algorithm: ${alg}`, detail: 'Asymmetric — private key signs, public key verifies.' })
  } else {
    flags.push({ severity: 'warning', label: `Unknown algorithm: ${alg}`, detail: 'Non-standard algorithm identifier.' })
  }

  const now = Math.floor(Date.now() / 1000)
  if (typeof p.exp === 'number') {
    if (p.exp < now) {
      const ago = Math.round((now - (p.exp as number)) / 60)
      flags.push({ severity: 'warning', label: 'Token expired', detail: `Expired ${ago} minute(s) ago. Any system accepting this token has broken expiry validation.` })
    }
  } else {
    flags.push({ severity: 'warning', label: 'No expiry (exp)', detail: 'Token never expires — indefinite access if stolen.' })
  }

  if (typeof p.nbf === 'number' && (p.nbf as number) > now) {
    flags.push({ severity: 'warning', label: 'Not yet valid (nbf)', detail: 'Token\'s "not before" claim is in the future.' })
  }

  if (typeof p.iat === 'number' && (p.iat as number) > now + 60) {
    flags.push({ severity: 'warning', label: 'Issued in the future', detail: 'iat claim is ahead of server time — clock skew or tampered token.' })
  }

  if (!p.iss) flags.push({ severity: 'info', label: 'No issuer (iss)', detail: 'Best practice: always set iss to identify who issued the token.' })
  if (!p.aud) flags.push({ severity: 'info', label: 'No audience (aud)', detail: 'Best practice: set aud to restrict which services accept this token.' })

  return flags
}

function formatClaimValue(key: string, val: unknown): string {
  if (typeof val === 'number' && (key === 'exp' || key === 'iat' || key === 'nbf')) {
    const d = new Date(val * 1000)
    const rel = key === 'exp'
      ? (val < Date.now() / 1000 ? '(expired)' : `(in ${Math.round((val - Date.now() / 1000) / 60)} min)`)
      : ''
    return `${val} → ${d.toISOString()} ${rel}`
  }
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

const SEVERITY_COLORS: Record<FlagSeverity, string> = {
  critical: 'text-cyber-red border-cyber-red/30 bg-cyber-red/5',
  warning:  'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5',
  info:     'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/5',
}

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

export default function JwtPage() {
  const [token,    setToken]    = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const parsed  = useMemo(() => token.trim() ? parseJwt(token) : null, [token])
  const flags   = useMemo(() => parsed ? analyzeFlags(parsed) : [], [parsed])
  const isValid = parsed?.valid ?? false

  const toggle = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }))

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} className="text-cyber-cyan" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">JWT Analyzer</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Decode and inspect JSON Web Tokens — claims, expiry, algorithm flags, security issues
        </p>
      </div>

      <TerminalCard title="Token Input" accent="cyan">
        <div className="space-y-3">
          <textarea
            rows={4}
            className="cyber-input font-mono text-xs w-full resize-none"
            placeholder="Paste JWT here (eyJ…)"
            value={token}
            onChange={e => setToken(e.target.value)}
            spellCheck={false}
          />
          <div className="flex items-center justify-between">
            <button
              className="font-mono text-[10px] text-cyber-muted hover:text-cyber-cyan transition-colors"
              onClick={() => setToken(SAMPLE_JWT)}
            >
              Load sample JWT
            </button>
            {token && (
              <button
                className="font-mono text-[10px] text-cyber-muted hover:text-cyber-red transition-colors"
                onClick={() => setToken('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </TerminalCard>

      {parsed && (
        <div className="space-y-4 animate-slide-up">
          {/* Token structure */}
          <TerminalCard title="Token Structure" accent="cyan">
            <div className="font-mono text-[11px] break-all leading-relaxed">
              <span className="text-cyber-red">{parsed.raw.header}</span>
              <span className="text-cyber-muted">.</span>
              <span className="text-cyber-cyan">{parsed.raw.payload}</span>
              <span className="text-cyber-muted">.</span>
              <span className="text-cyber-green">{parsed.raw.signature}</span>
            </div>
            <div className="flex gap-4 mt-3 font-mono text-[9px] text-cyber-muted">
              <span><span className="text-cyber-red">■</span> Header</span>
              <span><span className="text-cyber-cyan">■</span> Payload</span>
              <span><span className="text-cyber-green">■</span> Signature</span>
            </div>
          </TerminalCard>

          {/* Security flags */}
          {flags.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">Security Analysis</p>
              {flags.map((f, i) => (
                <div key={i} className={`flex items-start gap-2 p-2.5 border rounded font-mono ${SEVERITY_COLORS[f.severity]}`}>
                  {f.severity === 'critical' ? <XCircle size={13} className="flex-none mt-0.5" />
                    : f.severity === 'warning' ? <AlertTriangle size={13} className="flex-none mt-0.5" />
                    : <CheckCircle size={13} className="flex-none mt-0.5" />}
                  <div>
                    <p className="text-[11px] font-600">{f.label}</p>
                    <p className="text-[10px] opacity-80 mt-0.5">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Header */}
            <TerminalCard title="Header" accent="red">
              {parsed.header ? (
                <div className="space-y-0">
                  {Object.entries(parsed.header).map(([k, v]) => (
                    <div key={k} className="flex gap-3 py-1.5 border-b border-cyber-border/30 last:border-0">
                      <span className="font-mono text-[10px] text-cyber-muted w-16 flex-none">{k}</span>
                      <span className="font-mono text-[11px] text-cyber-text-hi break-all">{String(v)}</span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <button className="flex items-center gap-1 font-mono text-[9px] text-cyber-muted hover:text-cyber-text transition-colors"
                      onClick={() => toggle('hraw')}>
                      {expanded.hraw ? <ChevronUp size={10} /> : <ChevronDown size={10} />} Raw JSON
                    </button>
                    {expanded.hraw && (
                      <pre className="mt-2 font-mono text-[10px] text-cyber-muted bg-cyber-bg rounded p-2 overflow-x-auto">
                        {JSON.stringify(parsed.header, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ) : <p className="font-mono text-xs text-cyber-muted">Could not decode header</p>}
            </TerminalCard>

            {/* Payload */}
            <TerminalCard title="Payload" accent="cyan">
              {parsed.payload ? (
                <div className="space-y-0">
                  {Object.entries(parsed.payload).map(([k, v]) => (
                    <div key={k} className="py-1.5 border-b border-cyber-border/30 last:border-0">
                      <div className="flex gap-3">
                        <span className="font-mono text-[10px] text-cyber-muted w-16 flex-none">{k}</span>
                        <span className="font-mono text-[10px] text-cyber-text-hi break-all leading-relaxed">
                          {formatClaimValue(k, v)}
                        </span>
                      </div>
                      {(k === 'exp' || k === 'iat' || k === 'nbf') && typeof v === 'number' && (
                        <div className="flex items-center gap-1 mt-1 ml-16">
                          <Clock size={9} className="text-cyber-muted" />
                          {k === 'exp' && (
                            <span className={`font-mono text-[9px] ${(v as number) < Date.now() / 1000 ? 'text-cyber-red' : 'text-cyber-green'}`}>
                              {(v as number) < Date.now() / 1000 ? 'EXPIRED' : 'VALID'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="pt-2">
                    <button className="flex items-center gap-1 font-mono text-[9px] text-cyber-muted hover:text-cyber-text transition-colors"
                      onClick={() => toggle('praw')}>
                      {expanded.praw ? <ChevronUp size={10} /> : <ChevronDown size={10} />} Raw JSON
                    </button>
                    {expanded.praw && (
                      <pre className="mt-2 font-mono text-[10px] text-cyber-muted bg-cyber-bg rounded p-2 overflow-x-auto">
                        {JSON.stringify(parsed.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ) : <p className="font-mono text-xs text-cyber-muted">Could not decode payload</p>}
            </TerminalCard>
          </div>

          {/* Signature note */}
          <TerminalCard title="Signature" accent="green">
            <div className="flex items-start gap-2">
              <AlertTriangle size={13} className="text-cyber-orange flex-none mt-0.5" />
              <div>
                <p className="font-mono text-xs text-cyber-text-hi">Signature cannot be verified client-side</p>
                <p className="font-mono text-[10px] text-cyber-muted mt-1">
                  Verification requires the secret key (HMAC) or public key (RSA/ECDSA). This tool decodes structure only.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-cyber-muted break-all">{parsed.raw.signature.slice(0, 40)}…</span>
                  <CopyButton text={parsed.raw.signature} />
                </div>
              </div>
            </div>
          </TerminalCard>

          {/* Copy decoded */}
          <div className="flex items-center gap-2">
            <CopyButton text={JSON.stringify({ header: parsed.header, payload: parsed.payload }, null, 2)} />
            <span className="font-mono text-[10px] text-cyber-muted">Copy decoded JSON</span>
          </div>
        </div>
      )}

      {!token && (
        <div className="cyber-card p-4 border border-cyber-border/50">
          <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-3">What this tool does</p>
          <ul className="space-y-1.5">
            {[
              'Decode header and payload (base64url)',
              'Display all claims with human-readable timestamps',
              'Flag dangerous algorithms (none, unknown)',
              'Check expiry, nbf, iat validity',
              'Detect missing security claims (iss, aud, exp)',
            ].map(t => (
              <li key={t} className="flex items-center gap-2 font-mono text-[11px] text-cyber-muted">
                <span className="text-cyber-cyan">›</span> {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
