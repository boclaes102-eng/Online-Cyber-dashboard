'use client'

import { useState } from 'react'
import { FileCode, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { CspResult, CspGrade, CspSeverity } from '@/app/api/csp/route'

const GRADE_STYLE: Record<CspGrade, { color: string; bg: string; border: string }> = {
  'A+': { color: 'text-cyber-green',  bg: 'bg-cyber-green/10',  border: 'border-cyber-green/30'  },
  'A':  { color: 'text-cyber-green',  bg: 'bg-cyber-green/10',  border: 'border-cyber-green/30'  },
  'B':  { color: 'text-cyber-cyan',   bg: 'bg-cyber-cyan/10',   border: 'border-cyber-cyan/30'   },
  'C':  { color: 'text-yellow-400',   bg: 'bg-yellow-400/10',   border: 'border-yellow-400/30'   },
  'D':  { color: 'text-cyber-orange', bg: 'bg-cyber-orange/10', border: 'border-cyber-orange/30' },
  'F':  { color: 'text-red-400',      bg: 'bg-red-400/10',      border: 'border-red-400/30'      },
}

const SEVERITY_STYLE: Record<CspSeverity, { dot: string; text: string; badge: string }> = {
  critical: { dot: 'bg-red-400',         text: 'text-red-400',         badge: 'text-red-400 border-red-400/30 bg-red-400/5'                },
  high:     { dot: 'bg-cyber-orange',    text: 'text-cyber-orange',    badge: 'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5' },
  medium:   { dot: 'bg-yellow-400',      text: 'text-yellow-400',      badge: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5'       },
  low:      { dot: 'bg-cyber-cyan',      text: 'text-cyber-cyan',      badge: 'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/5'       },
  info:     { dot: 'bg-cyber-green',     text: 'text-cyber-green',     badge: 'text-cyber-green border-cyber-green/30 bg-cyber-green/5'    },
}

const SEVERITY_ORDER: CspSeverity[] = ['critical', 'high', 'medium', 'low', 'info']

function FindingRow({ finding }: { finding: CspResult['findings'][number] }) {
  const sty = SEVERITY_STYLE[finding.severity]
  return (
    <div className="py-3 border-b border-cyber-border/20 last:border-0">
      <div className="flex items-start gap-3">
        <span className={`w-1.5 h-1.5 rounded-full flex-none mt-1.5 ${sty.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs text-cyber-text-hi font-semibold">{finding.issue}</span>
            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${sty.badge}`}>
              {finding.severity.toUpperCase()}
            </span>
            <span className="font-mono text-[9px] text-cyber-muted border border-cyber-border/40 rounded px-1.5 py-0.5">
              {finding.directive}
            </span>
          </div>
          <p className="font-mono text-[10px] text-cyber-muted leading-relaxed">{finding.detail}</p>
        </div>
      </div>
    </div>
  )
}

export default function CspPage() {
  const [query, setQuery]       = useState('')
  const [result, setResult]     = useState<CspResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showDirs, setShowDirs] = useState(false)

  async function lookup(q?: string) {
    const target = (q ?? query).trim()
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/csp?url=${encodeURIComponent(target)}`)
      const data: CspResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  const sortedFindings = result
    ? [...result.findings].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    : []

  const gradeStyle = result ? GRADE_STYLE[result.grade] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-cyan/30 flex items-center justify-center bg-cyber-cyan/5 flex-none">
          <FileCode size={18} className="text-cyber-cyan" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">CSP Analyzer</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Fetch and grade Content-Security-Policy headers. Explains unsafe directives, missing protections, and nonce/hash usage.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Target URL" label="CSP" accent="cyan">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && lookup()}
            placeholder="https://example.com   or   example.com"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
          />
          <button
            onClick={() => lookup()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs rounded hover:bg-cyber-cyan/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <FileCode size={12} />}
            Analyze
          </button>
        </div>

        {!result && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['https://github.com', 'https://google.com', 'https://cloudflare.com'].map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); lookup(ex) }}
                className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-cyan hover:border-cyber-cyan/40 rounded transition-all"
              >
                {ex.replace('https://', '')}
              </button>
            ))}
          </div>
        )}
      </TerminalCard>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded font-mono text-xs text-red-400">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {result && gradeStyle && (
        <div className="space-y-4 animate-slide-up">
          {/* Grade + score */}
          <TerminalCard title="Security Grade" label="CSP" accent="cyan">
            <div className="flex items-center gap-8">
              {/* Grade letter */}
              <div className={`w-20 h-20 rounded-xl border-2 flex items-center justify-center flex-none ${gradeStyle.border} ${gradeStyle.bg}`}>
                <span className={`font-mono text-3xl font-bold ${gradeStyle.color}`}>{result.grade}</span>
              </div>

              {/* Score + bar */}
              <div className="flex-1">
                <div className="flex items-end gap-2 mb-2">
                  <span className={`font-mono text-2xl font-bold ${gradeStyle.color}`}>{result.score}</span>
                  <span className="font-mono text-sm text-cyber-muted mb-0.5">/ 100</span>
                </div>
                <div className="w-full h-2 bg-cyber-border/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      result.score >= 80 ? 'bg-cyber-green' :
                      result.score >= 65 ? 'bg-cyber-cyan' :
                      result.score >= 50 ? 'bg-yellow-400' :
                      result.score >= 30 ? 'bg-cyber-orange' : 'bg-red-400'
                    }`}
                    style={{ width: `${result.score}%` }}
                  />
                </div>
                <p className="font-mono text-[10px] text-cyber-muted mt-2">
                  {result.csp ? 'CSP header present' : result.cspRO ? 'Report-Only mode (not enforced)' : 'No CSP header detected'}
                  {result.nonces.length > 0 && ` · ${result.nonces.length} nonce(s)`}
                  {result.hashes.length > 0 && ` · ${result.hashes.length} hash(es)`}
                </p>
              </div>
            </div>
          </TerminalCard>

          {/* Findings */}
          <TerminalCard title={`Findings (${result.findings.length})`} label="ANALYSIS" accent="none">
            <div className="space-y-0">
              {sortedFindings.map((f, i) => <FindingRow key={i} finding={f} />)}
            </div>
          </TerminalCard>

          {/* Raw CSP header */}
          {(result.csp || result.cspRO) && (
            <TerminalCard title="Raw CSP Header" label="HEADER" accent="none">
              {result.cspRO && !result.csp && (
                <div className="flex items-center gap-2 mb-3">
                  <Info size={12} className="text-cyber-orange" />
                  <span className="font-mono text-[10px] text-cyber-orange">Report-Only — policy is not enforced</span>
                </div>
              )}
              <pre className="font-mono text-[10px] text-cyber-cyan bg-cyber-bg border border-cyber-border/40 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {result.csp ?? result.cspRO}
              </pre>
            </TerminalCard>
          )}

          {/* Parsed directives */}
          {result.directives.length > 0 && (
            <TerminalCard title={`Parsed Directives (${result.directives.length})`} label="PARSE" accent="none">
              <button
                onClick={() => setShowDirs(d => !d)}
                className="flex items-center gap-2 font-mono text-xs text-cyber-muted hover:text-cyber-text transition-colors mb-3"
              >
                {showDirs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showDirs ? 'Collapse' : 'Show parsed directives'}
              </button>
              {showDirs && (
                <div className="space-y-2">
                  {result.directives.map((d, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="font-mono text-[10px] text-cyber-cyan border border-cyber-cyan/30 rounded px-1.5 py-0.5 flex-none">
                        {d.name}
                      </span>
                      <span className="font-mono text-[10px] text-cyber-text leading-relaxed">
                        {d.values.join(' ') || '(empty)'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TerminalCard>
          )}
        </div>
      )}
    </div>
  )
}
