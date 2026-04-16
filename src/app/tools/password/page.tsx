'use client'

import { useState, useEffect, useRef } from 'react'
import { KeyRound, Eye, EyeOff, AlertTriangle, CheckCircle, XCircle, ShieldAlert } from 'lucide-react'
import type { PasswordResult } from '@/lib/types'
import { scorePassword } from '@/lib/password-scorer'
import TerminalCard from '@/components/ui/TerminalCard'

const STRENGTH_COLOR: Record<string, string> = {
  VERY_WEAK:  'text-cyber-red',
  WEAK:       'text-cyber-red',
  FAIR:       'text-cyber-orange',
  STRONG:     'text-cyber-green',
  VERY_STRONG:'text-cyber-green',
}
const STRENGTH_BAR: Record<string, string> = {
  VERY_WEAK:  'bg-cyber-red',
  WEAK:       'bg-cyber-red',
  FAIR:       'bg-cyber-orange',
  STRONG:     'bg-cyber-green',
  VERY_STRONG:'bg-cyber-green',
}
const STRENGTH_WIDTH: Record<string, string> = {
  VERY_WEAK:  'w-[10%]',
  WEAK:       'w-[30%]',
  FAIR:       'w-[55%]',
  STRONG:     'w-[78%]',
  VERY_STRONG:'w-full',
}

async function checkBreach(password: string): Promise<{ count: number; checked: boolean }> {
  try {
    const encoder = new TextEncoder()
    const data    = encoder.encode(password)
    const hashBuf = await crypto.subtle.digest('SHA-1', data)
    const hex     = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('').toUpperCase()
    const prefix  = hex.slice(0, 5)
    const suffix  = hex.slice(5)

    const res  = await fetch(`/api/breach?prefix=${prefix}`)
    if (!res.ok) return { count: 0, checked: false }
    const text = await res.text()
    const line = text.split('\n').find(l => l.startsWith(suffix))
    const count = line ? parseInt(line.split(':')[1], 10) : 0
    return { count, checked: true }
  } catch {
    return { count: 0, checked: false }
  }
}

export default function PasswordPage() {
  const [password,  setPassword]  = useState('')
  const [visible,   setVisible]   = useState(false)
  const [result,    setResult]    = useState<PasswordResult | null>(null)
  const [breaching, setBreaching] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Score locally on each keystroke (no API call needed)
  useEffect(() => {
    if (!password) { setResult(null); return }
    const scored = scorePassword(password)
    setResult(scored)

    // Debounce the HIBP breach check — wait 800ms after last keystroke
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setBreaching(true)
      const { count, checked } = await checkBreach(password)
      setResult(prev => prev ? { ...prev, breachCount: count, isBreached: count > 0, breachChecked: checked } : prev)
      setBreaching(false)
    }, 800)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [password])

  const pool = result?.charClasses
  const classCount = pool ? [pool.lowercase, pool.uppercase, pool.digits, pool.symbols].filter(Boolean).length : 0

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={16} className="text-cyber-green" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">Password Auditor</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Real-time entropy · Pattern detection · HIBP k-anonymity breach check · Crack time estimate
        </p>
      </div>

      {/* Input */}
      <TerminalCard title="Password Input" accent="green">
        <div className="space-y-3">
          <div className="relative">
            <input
              type={visible ? 'text' : 'password'}
              className="cyber-input pr-10"
              placeholder="Enter password to audit..."
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-cyber-text transition-colors"
              onClick={() => setVisible(v => !v)}
              tabIndex={-1}
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="font-mono text-[9px] text-cyber-muted">
            Your password never leaves your browser for scoring. Only a 5-char SHA-1 prefix is sent to HIBP (k-anonymity).
          </p>
        </div>
      </TerminalCard>

      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Score + strength bar */}
          <TerminalCard title="Strength Assessment" accent="green" scanline>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`font-mono text-3xl font-700 ${STRENGTH_COLOR[result.strength]}`}>
                    {result.strength.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-cyber-muted text-sm ml-3">score: {result.score}/100</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-cyber-muted">Crack time</p>
                  <p className="font-mono text-sm text-cyber-text-hi">{result.crackTime}</p>
                  <p className="font-mono text-[9px] text-cyber-muted">(GPU cluster @ 1B/s)</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-cyber-surface rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${STRENGTH_BAR[result.strength]} ${STRENGTH_WIDTH[result.strength]}`} />
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Length',       value: result.length,                         unit: 'chars' },
                  { label: 'Shannon Entropy', value: result.shannonEntropy.toFixed(2),   unit: 'bits/char' },
                  { label: 'Search Space', value: result.searchSpaceBits.toFixed(1),     unit: 'bits' },
                  { label: 'Char Classes', value: classCount,                             unit: '/ 4' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="p-3 border border-cyber-border rounded bg-cyber-surface/40 text-center">
                    <p className="font-mono text-lg font-700 text-cyber-text-hi">{value}</p>
                    <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">{label}</p>
                    <p className="font-mono text-[9px] text-cyber-muted/60">{unit}</p>
                  </div>
                ))}
              </div>
            </div>
          </TerminalCard>

          {/* Character class breakdown */}
          <TerminalCard title="Character Classes" accent="none">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { label: 'Lowercase a–z',  active: pool?.lowercase, pool: 26  },
                { label: 'Uppercase A–Z',  active: pool?.uppercase, pool: 26  },
                { label: 'Digits 0–9',     active: pool?.digits,    pool: 10  },
                { label: 'Symbols !@#…',   active: pool?.symbols,   pool: 32  },
                { label: 'Extended UTF-8', active: pool?.extended,  pool: 64  },
              ].map(({ label, active, pool: p }) => (
                <div key={label} className={`p-2 rounded border text-center transition-colors ${
                  active ? 'border-cyber-green/40 bg-cyber-green/5' : 'border-cyber-border bg-cyber-surface/30 opacity-50'
                }`}>
                  {active
                    ? <CheckCircle size={14} className="text-cyber-green mx-auto mb-1" />
                    : <XCircle    size={14} className="text-cyber-muted mx-auto mb-1"  />}
                  <p className="font-mono text-[9px] text-cyber-muted leading-tight">{label}</p>
                  <p className="font-mono text-[8px] text-cyber-muted/60 mt-0.5">+{p} pool</p>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-cyber-muted mt-3">
              Character pool size: <span className="text-cyber-text-hi">{pool?.poolSize}</span>
            </p>
          </TerminalCard>

          {/* Pattern detection */}
          <TerminalCard
            title="Pattern Detection"
            label={`${result.patternsFound.length} found`}
            accent={result.patternsFound.length > 0 ? 'red' : 'green'}
          >
            {result.patternsFound.length === 0 ? (
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-cyber-green" />
                <span className="font-mono text-xs text-cyber-green">No structural weaknesses detected.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {result.patternsFound.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 border border-cyber-red/20 rounded bg-cyber-red/5">
                    <AlertTriangle size={12} className={p.severity >= 0.7 ? 'text-cyber-red' : 'text-cyber-orange'} />
                    <span className="font-mono text-[11px] text-cyber-text flex-1">{p.label}</span>
                    <span className={`font-mono text-[9px] px-1.5 py-px rounded border ${
                      p.severity >= 0.8 ? 'text-cyber-red border-cyber-red/30 bg-cyber-red/10' :
                      p.severity >= 0.5 ? 'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/10' :
                                          'text-cyber-muted border-cyber-border'
                    }`}>
                      {(p.severity * 100).toFixed(0)}% risk
                    </span>
                    <span className="font-mono text-[9px] text-cyber-muted">
                      pos {p.span[0]}–{p.span[1]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TerminalCard>

          {/* HIBP Breach check */}
          <TerminalCard
            title="Breach Database Check"
            label={breaching ? 'Checking HIBP…' : 'HIBP Pwned Passwords'}
            accent={result.isBreached ? 'red' : result.breachChecked ? 'green' : 'none'}
          >
            {breaching ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-cyber-cyan border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs text-cyber-muted">Checking k-anonymity prefix against HIBP…</span>
              </div>
            ) : result.breachChecked ? (
              result.isBreached ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={15} className="text-cyber-red" />
                    <span className="font-mono text-sm font-700 text-cyber-red">Password COMPROMISED</span>
                  </div>
                  <p className="font-mono text-xs text-cyber-muted">
                    Found <span className="text-cyber-red font-700">{result.breachCount?.toLocaleString()}</span> times in known breach databases.
                    Do not use this password anywhere.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-cyber-green" />
                  <span className="font-mono text-xs text-cyber-green">Not found in HIBP breach database.</span>
                </div>
              )
            ) : (
              <p className="font-mono text-xs text-cyber-muted">Type a password above to check…</p>
            )}
          </TerminalCard>

          {/* Policy violations */}
          {result.policyViolations.length > 0 && (
            <TerminalCard title="Policy Violations" label="NIST SP 800-63B" accent="red">
              <ul className="space-y-1.5">
                {result.policyViolations.map((v, i) => (
                  <li key={i} className="flex items-start gap-2 font-mono text-xs text-cyber-red">
                    <XCircle size={12} className="flex-none mt-0.5" />
                    {v}
                  </li>
                ))}
              </ul>
            </TerminalCard>
          )}

          {/* Recommendations */}
          <TerminalCard title="Recommendations" accent="none">
            <ul className="space-y-2">
              {result.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 font-mono text-[11px] text-cyber-text">
                  <span className="text-cyber-cyan flex-none mt-px">›</span>
                  {r}
                </li>
              ))}
            </ul>
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
