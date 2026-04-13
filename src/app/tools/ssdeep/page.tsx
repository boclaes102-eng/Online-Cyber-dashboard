'use client'

import { useState } from 'react'
import { GitCompare, AlertTriangle, Info } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { SsdeepResult, SsdeepCompare } from '@/app/api/ssdeep/route'

// Valid-format example hashes (blocksize 96 — one char differs in each segment)
const EXAMPLES = {
  similar: [
    '96:BNFmhEqIqkBH5NdQ3Zr9Xp7FmTWcTtHm7DW:BNFmhEqIqkBH5NdQ3ZrXpFmTWcTtHmDW',
    '96:BNFmhEqIqkBH5NdQ3Zr9Xp7FmTWcTtHz7DW:BNFmhEqIqkBH5NdQ3ZrXpFmTWcTtHzDW',
  ],
  incompatible: [
    '3:aBcDeFgHiJkL:aBcDeF',
    '192:XyZAbCdEfGhIjKlMnOpQrStUvWx:XyZAbCdEfGhIjKl',
  ],
}

function scoreColor(score: number, comparable: boolean) {
  if (!comparable) return { bar: 'bg-cyber-border', text: 'text-cyber-muted' }
  if (score >= 80) return { bar: 'bg-cyber-red',    text: 'text-cyber-red'    }
  if (score >= 50) return { bar: 'bg-cyber-orange', text: 'text-cyber-orange' }
  if (score >= 20) return { bar: 'bg-yellow-400',   text: 'text-yellow-400'   }
  return              { bar: 'bg-cyber-green',   text: 'text-cyber-green'  }
}

function ScoreBar({ score, comparable }: { score: number; comparable: boolean }) {
  const { bar, text } = scoreColor(score, comparable)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-cyber-muted">Similarity Score</span>
        <span className={`font-mono text-3xl font-bold ${text}`}>
          {comparable ? `${score}%` : '—'}
        </span>
      </div>
      <div className="w-full h-2.5 bg-cyber-border/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: comparable ? `${score}%` : '0%' }}
        />
      </div>
    </div>
  )
}

export default function SsdeepPage() {
  const [h1, setH1]       = useState('')
  const [h2, setH2]       = useState('')
  const [result, setResult] = useState<SsdeepResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  async function compare() {
    if (!h1.trim() || !h2.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/ssdeep?mode=compare&h1=${encodeURIComponent(h1.trim())}&h2=${encodeURIComponent(h2.trim())}`)
      const data: SsdeepResult = await res.json()
      if ('error' in data && data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  function loadExample(pair: string[]) {
    setH1(pair[0]); setH2(pair[1]); setResult(null); setError('')
  }

  const cmp: SsdeepCompare | null =
    result && 'mode' in result && result.mode === 'compare' ? result.compare : null

  const accentColor = cmp
    ? (cmp.score >= 80 ? 'red' : cmp.score >= 50 ? 'orange' : 'green') as 'red' | 'orange' | 'green'
    : 'cyan'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-cyan/30 flex items-center justify-center bg-cyber-cyan/5 flex-none">
          <GitCompare size={18} className="text-cyber-cyan" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Fuzzy Hash Comparison (SSDEEP)</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Compare SSDEEP / spamsum hashes to measure file similarity. Used in malware triage to identify related samples and variants.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Hash Inputs" label="SSDEEP" accent="cyan">
        <div className="space-y-3">
          {([
            { label: 'Hash 1', value: h1, set: setH1 },
            { label: 'Hash 2', value: h2, set: setH2 },
          ] as const).map(({ label, value, set }) => (
            <div key={label}>
              <p className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-1">{label}</p>
              <input
                value={value}
                onChange={e => set(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && compare()}
                placeholder="96:hashSegment1:hashSegment2"
                className="w-full bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-cyan/50"
              />
            </div>
          ))}

          <button
            onClick={compare}
            disabled={loading || !h1.trim() || !h2.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs rounded hover:bg-cyber-cyan/20 disabled:opacity-40 transition-all"
          >
            {loading ? <Spinner size="sm" /> : <GitCompare size={12} />}
            Compare Hashes
          </button>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="font-mono text-[10px] text-cyber-muted">Load example:</span>
            <button
              onClick={() => loadExample(EXAMPLES.similar)}
              className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-cyan hover:border-cyber-cyan/40 rounded transition-all"
            >
              Similar files (high score)
            </button>
            <button
              onClick={() => loadExample(EXAMPLES.incompatible)}
              className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-cyan hover:border-cyber-cyan/40 rounded transition-all"
            >
              Incompatible blocksizes
            </button>
          </div>

          <p className="font-mono text-[9px] text-cyber-muted leading-relaxed">
            SSDEEP hashes are available from VirusTotal (file details page), MalwareBazaar, or by running{' '}
            <span className="text-cyber-cyan">ssdeep -r &lt;file&gt;</span> locally.
          </p>
        </div>
      </TerminalCard>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded font-mono text-xs text-red-400">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {cmp && (
        <div className="space-y-4 animate-slide-up">
          {/* Score */}
          <TerminalCard title="Similarity Result" label="SCORE" accent={accentColor}>
            <ScoreBar score={cmp.score} comparable={cmp.comparable} />
            <p className="font-mono text-xs text-cyber-text mt-3 leading-relaxed">{cmp.interpretation}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="font-mono text-[9px] text-cyber-muted">Block relation:</span>
              <span className={`font-mono text-[9px] border rounded px-1.5 py-0.5 ${
                cmp.comparable
                  ? 'text-cyber-cyan border-cyber-cyan/30'
                  : 'text-cyber-muted border-cyber-border/60'
              }`}>
                {cmp.relation === 'equal'  ? 'Equal block sizes — direct comparison'   :
                 cmp.relation === 'double' ? 'h2 block size = 2× h1 — cross comparison' :
                 cmp.relation === 'half'   ? 'h1 block size = 2× h2 — cross comparison' :
                 'Incompatible — cannot compare'}
              </span>
            </div>
            {!cmp.comparable && (
              <div className="flex items-start gap-2 mt-3 p-2.5 bg-cyber-border/10 rounded border border-cyber-border/40">
                <Info size={11} className="text-cyber-muted flex-none mt-0.5" />
                <p className="font-mono text-[10px] text-cyber-muted leading-relaxed">
                  SSDEEP can only compare hashes with equal block sizes or a 2× difference.
                  The block size is chosen based on input file length, so files of very different sizes may not be comparable.
                </p>
              </div>
            )}
          </TerminalCard>

          {/* Hash breakdowns */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: 'Hash 1', h: cmp.h1 },
              { label: 'Hash 2', h: cmp.h2 },
            ].map(({ label, h }) => (
              <TerminalCard key={label} title={label} label="PARSED" accent="none">
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { k: 'Block Size', v: String(h.blocksize) },
                      { k: 'Seg 1 Len', v: `${h.hash1.length}` },
                      { k: 'Seg 2 Len', v: `${h.hash2.length}` },
                    ].map(({ k, v }) => (
                      <div key={k}>
                        <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">{k}</p>
                        <p className="font-mono text-xs text-cyber-text-hi">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-0.5">Segment 1</p>
                    <p className="font-mono text-[10px] text-cyber-cyan break-all leading-relaxed">{h.hash1 || '(empty)'}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-0.5">Segment 2</p>
                    <p className="font-mono text-[10px] text-cyber-cyan break-all leading-relaxed">{h.hash2 || '(empty)'}</p>
                  </div>
                </div>
              </TerminalCard>
            ))}
          </div>

          {/* Algorithm info */}
          <TerminalCard title="Algorithm Notes" label="INFO" accent="none">
            <div className="space-y-2">
              {[
                {
                  key: 'SSDEEP',
                  val: 'Context-triggered piecewise hashing (CTPH). Developed by Jesse Kornblum. Generates a rolling hash over the file and captures digest snapshots at trigger points.',
                },
                {
                  key: 'Scoring',
                  val: 'Score 0–100 based on edit distance between hash segments. ≥80 = very likely same family. 40–79 = shared code blocks. <20 = probably unrelated.',
                },
                {
                  key: 'Use cases',
                  val: 'Malware variant clustering, identifying repacked samples, DFIR triage, correlating unpacked payloads back to known threats.',
                },
              ].map(({ key, val }) => (
                <div key={key} className="flex gap-3 items-start">
                  <span className="font-mono text-[9px] text-cyber-cyan border border-cyber-cyan/30 rounded px-1.5 py-0.5 flex-none whitespace-nowrap">{key}</span>
                  <p className="font-mono text-[10px] text-cyber-muted leading-relaxed">{val}</p>
                </div>
              ))}
            </div>
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
