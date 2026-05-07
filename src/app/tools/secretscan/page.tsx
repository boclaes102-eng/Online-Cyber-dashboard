'use client'

import { useState } from 'react'
import { KeyRound, AlertOctagon, AlertTriangle, Info, CheckCircle, Search } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import type { SecretMatch, SecretScanResult } from '@/app/api/secretscan/route'

const SEV: Record<SecretMatch['severity'], { label: string; cls: string; Icon: typeof AlertOctagon }> = {
  critical: { label: 'CRITICAL', cls: 'text-red-400 border-red-400/40 bg-red-400/10',           Icon: AlertOctagon  },
  high:     { label: 'HIGH',     cls: 'text-cyber-orange border-cyber-orange/40 bg-cyber-orange/10', Icon: AlertTriangle },
  medium:   { label: 'MEDIUM',   cls: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',   Icon: AlertTriangle },
  info:     { label: 'INFO',     cls: 'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10',    Icon: Info          },
}

const QUICK = ['https://match.career', 'https://cronos.match.career']

export default function SecretScanPage() {
  const [url,     setUrl]     = useState('')
  const [result,  setResult]  = useState<SecretScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function scan(target?: string) {
    const u = (target ?? url).trim()
    if (!u) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/secretscan?url=${encodeURIComponent(u)}`)
      const data: SecretScanResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const critCount = result?.secrets.filter(s => s.severity === 'critical').length ?? 0
  const highCount = result?.secrets.filter(s => s.severity === 'high').length ?? 0

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={16} className="text-cyber-orange" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">JS Secret Scanner</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Scan JavaScript bundles for exposed API keys, tokens, and credentials
        </p>
      </div>

      <TerminalCard title="Target" accent="orange">
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              className="cyber-input font-mono"
              style={{ flex: '1 1 0', width: 0 }}
              placeholder="https://target.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && scan()}
            />
            <button
              className="cyber-btn flex items-center gap-2"
              onClick={() => scan()}
              disabled={loading}
            >
              {loading ? <Spinner size="sm" /> : <Search size={13} />}
              {loading ? 'Scanning' : 'Scan'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map(q => (
              <button
                key={q}
                onClick={() => { setUrl(q); scan(q) }}
                className="font-mono text-[10px] text-cyber-muted border border-cyber-border hover:border-cyber-orange/40 hover:text-cyber-orange rounded px-2 py-0.5 transition-colors"
              >
                {q.replace('https://', '')}
              </button>
            ))}
          </div>
        </div>
      </TerminalCard>

      {error && (
        <div className="cyber-card-red p-3 font-mono text-xs text-cyber-red">{error}</div>
      )}

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Summary */}
          <div className={`cyber-card p-4 border rounded-md ${
            critCount > 0 ? 'border-red-400/30 bg-red-400/5' :
            highCount > 0 ? 'border-cyber-orange/30 bg-cyber-orange/5' :
            'border-cyber-green/30 bg-cyber-green/5'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {critCount > 0 ? <AlertOctagon size={14} className="text-red-400" /> :
               highCount > 0 ? <AlertTriangle size={14} className="text-cyber-orange" /> :
               <CheckCircle size={14} className="text-cyber-green" />}
              <span className={`font-mono text-sm font-bold ${
                critCount > 0 ? 'text-red-400' :
                highCount > 0 ? 'text-cyber-orange' :
                'text-cyber-green'
              }`}>
                {result.secrets.length === 0
                  ? 'No secrets found'
                  : `${result.secrets.length} secret(s) found`}
              </span>
            </div>
            <p className="font-mono text-xs text-cyber-muted">
              Scanned {result.scriptsScanned} JS bundle(s) from {result.url}
            </p>
          </div>

          {/* Findings */}
          {result.secrets.length > 0 && (
            <TerminalCard title={`Secrets (${result.secrets.length})`} accent="orange">
              <div className="space-y-4">
                {result.secrets.map((s, i) => {
                  const sev = SEV[s.severity]
                  return (
                    <div key={i} className="border-b border-cyber-border/30 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <sev.Icon size={12} className={sev.cls.split(' ')[0]} />
                        <span className={`font-mono text-[10px] border rounded px-2 py-px ${sev.cls}`}>
                          {sev.label}
                        </span>
                        <span className="font-mono text-xs text-cyber-text-hi">{s.type}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2">
                          <span className="font-mono text-[10px] text-cyber-muted w-14 flex-none mt-0.5">VALUE</span>
                          <div className="flex-1 flex items-start gap-2 min-w-0">
                            <p className="font-mono text-[11px] text-cyber-red break-all flex-1">{s.value}</p>
                            <CopyButton text={s.value} />
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-mono text-[10px] text-cyber-muted w-14 flex-none mt-0.5">CONTEXT</span>
                          <p className="font-mono text-[10px] text-cyber-muted break-all flex-1 bg-cyber-bg rounded p-1.5">{s.context}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-mono text-[10px] text-cyber-muted w-14 flex-none mt-0.5">SOURCE</span>
                          <p className="font-mono text-[10px] text-cyber-cyan break-all flex-1 truncate">{s.scriptUrl}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </TerminalCard>
          )}
        </div>
      )}
    </div>
  )
}
