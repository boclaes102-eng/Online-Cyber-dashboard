'use client'

import { useState, useCallback } from 'react'
import { Terminal, Upload, RefreshCw } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import { md5, md5Buffer } from '@/lib/md5'
import { detectHashType } from '@/lib/utils'

const SHA_ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const
type ShaAlgo = typeof SHA_ALGOS[number]

const ALGO_LABELS: Record<string, string> = {
  MD5: 'MD5',
  'SHA-1': 'SHA-1',
  'SHA-256': 'SHA-256',
  'SHA-384': 'SHA-384',
  'SHA-512': 'SHA-512',
}

async function shaDigest(algo: ShaAlgo, buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest(algo, buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

interface HashOutput {
  MD5:      string
  'SHA-1':  string
  'SHA-256': string
  'SHA-384': string
  'SHA-512': string
}

async function hashText(text: string): Promise<HashOutput> {
  const encoder = new TextEncoder()
  const buf = encoder.encode(text).buffer as ArrayBuffer
  const [s1, s256, s384, s512] = await Promise.all(
    SHA_ALGOS.map(a => shaDigest(a, buf))
  )
  return { MD5: md5(text), 'SHA-1': s1, 'SHA-256': s256, 'SHA-384': s384, 'SHA-512': s512 }
}

async function hashBuffer(buf: ArrayBuffer): Promise<HashOutput> {
  const [s1, s256, s384, s512] = await Promise.all(SHA_ALGOS.map(a => shaDigest(a, buf)))
  return { MD5: md5Buffer(buf), 'SHA-1': s1, 'SHA-256': s256, 'SHA-384': s384, 'SHA-512': s512 }
}

const ACCENT_MAP: Record<string, 'cyan' | 'green' | 'red' | 'none'> = {
  MD5: 'none',
  'SHA-1': 'none',
  'SHA-256': 'cyan',
  'SHA-384': 'green',
  'SHA-512': 'green',
}

export default function HashToolsPage() {
  const [text,    setText]    = useState('')
  const [hashes,  setHashes]  = useState<HashOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  // Compare tab
  const [hashA,   setHashA]   = useState('')
  const [hashB,   setHashB]   = useState('')
  // Identify tab
  const [identInput, setIdentInput] = useState('')

  const identType = identInput.trim() ? detectHashType(identInput.trim()) : null

  const computeText = useCallback(async () => {
    if (!text) return
    setLoading(true); setFileName('')
    try { setHashes(await hashText(text)) }
    finally { setLoading(false) }
  }, [text])

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 100 * 1024 * 1024) { alert('Max file size: 100 MB'); return }
    setLoading(true); setFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      setHashes(await hashBuffer(buf))
    } finally { setLoading(false) }
  }, [])

  const matchAB = hashA && hashB
    ? hashA.trim().toLowerCase() === hashB.trim().toLowerCase()
    : null

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Terminal size={16} className="text-cyber-green" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">Hash Tools</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Generate MD5 / SHA-1 / SHA-256 / SHA-384 / SHA-512 · Identify hash type · Compare hashes — all client-side
        </p>
      </div>

      {/* Generator */}
      <TerminalCard title="Hash Generator" accent="green">
        <div className="space-y-3">
          <div className="flex gap-3">
            <textarea
              rows={3}
              className="cyber-input font-mono text-xs flex-1 resize-none"
              placeholder="Enter text to hash…"
              value={text}
              onChange={e => { setText(e.target.value); setHashes(null); setFileName('') }}
              spellCheck={false}
            />
            <button
              className="cyber-btn flex items-center gap-2 self-start"
              onClick={computeText}
              disabled={loading || !text}
            >
              {loading ? <Spinner size="sm" /> : <RefreshCw size={13} />}
              Hash
            </button>
          </div>

          {/* File drop */}
          <label className="block cursor-pointer">
            <div
              className="border border-dashed border-cyber-border hover:border-cyber-green/40 rounded p-3 text-center transition-colors"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            >
              <Upload size={14} className="mx-auto text-cyber-muted mb-1" />
              <p className="font-mono text-[10px] text-cyber-muted">
                {loading && fileName ? `Hashing ${fileName}…` : 'Drop file or click to hash (max 100 MB, never uploaded)'}
              </p>
            </div>
            <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </label>
        </div>
      </TerminalCard>

      {/* Hash outputs */}
      {hashes && (
        <div className="space-y-4 animate-slide-up">
          {fileName && (
            <div className="flex items-center gap-2 p-2 border border-cyber-green/20 rounded bg-cyber-green/5">
              <span className="font-mono text-[10px] text-cyber-green">FILE</span>
              <span className="font-mono text-[11px] text-cyber-text-hi">{fileName}</span>
            </div>
          )}
          <TerminalCard title="Results" accent="green">
            <div className="space-y-0">
              {(Object.entries(hashes) as [string, string][]).map(([algo, hash]) => (
                <div key={algo} className="py-2.5 border-b border-cyber-border/30 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest">{ALGO_LABELS[algo]}</span>
                    <CopyButton text={hash} />
                  </div>
                  <p className="font-mono text-[11px] text-cyber-text-hi break-all">{hash}</p>
                </div>
              ))}
            </div>
          </TerminalCard>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hash Identifier */}
        <TerminalCard title="Hash Identifier" accent="cyan">
          <div className="space-y-3">
            <input
              className="cyber-input font-mono text-xs w-full"
              placeholder="Paste hash to identify…"
              value={identInput}
              onChange={e => setIdentInput(e.target.value)}
            />
            {identType && (
              <div className={`p-3 border rounded flex items-center justify-between ${
                identType === 'UNKNOWN'
                  ? 'border-cyber-border bg-cyber-surface'
                  : 'border-cyber-cyan/30 bg-cyber-cyan/5'
              }`}>
                <span className="font-mono text-xs text-cyber-muted">Type detected:</span>
                <span className={`font-mono text-sm font-700 ${identType === 'UNKNOWN' ? 'text-cyber-muted' : 'text-cyber-cyan'}`}>
                  {identType}
                </span>
              </div>
            )}
            {identType && identType !== 'UNKNOWN' && (
              <div className="space-y-1">
                {[
                  { type: 'MD5',    bits: '128-bit', len: 32  },
                  { type: 'SHA1',   bits: '160-bit', len: 40  },
                  { type: 'SHA256', bits: '256-bit', len: 64  },
                  { type: 'SHA512', bits: '512-bit', len: 128 },
                ].filter(x => x.type === identType).map(x => (
                  <p key={x.type} className="font-mono text-[10px] text-cyber-muted">
                    {x.bits} · {x.len} hex characters
                  </p>
                ))}
              </div>
            )}
          </div>
        </TerminalCard>

        {/* Hash Comparator */}
        <TerminalCard title="Hash Compare" accent={matchAB === true ? 'green' : matchAB === false ? 'red' : 'none'}>
          <div className="space-y-3">
            <input
              className="cyber-input font-mono text-xs w-full"
              placeholder="Hash A…"
              value={hashA}
              onChange={e => setHashA(e.target.value)}
            />
            <input
              className="cyber-input font-mono text-xs w-full"
              placeholder="Hash B…"
              value={hashB}
              onChange={e => setHashB(e.target.value)}
            />
            {matchAB !== null && (
              <div className={`p-3 border rounded text-center ${
                matchAB
                  ? 'border-cyber-green/30 bg-cyber-green/5'
                  : 'border-cyber-red/30 bg-cyber-red/5'
              }`}>
                <p className={`font-mono text-sm font-700 ${matchAB ? 'text-cyber-green' : 'text-cyber-red'}`}>
                  {matchAB ? 'MATCH' : 'MISMATCH'}
                </p>
                <p className="font-mono text-[10px] text-cyber-muted mt-1">
                  {matchAB ? 'Hashes are identical (case-insensitive)' : 'Hashes differ'}
                </p>
              </div>
            )}
          </div>
        </TerminalCard>
      </div>

      {/* Reference table */}
      {!hashes && (
        <TerminalCard title="Hash Algorithm Reference" accent="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyber-border/30">
                {['Algorithm','Bits','Hex Length','Status'].map(h => (
                  <th key={h} className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest text-left pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { algo: 'MD5',     bits: 128, len: 32,  status: 'Broken',   color: 'text-cyber-red'    },
                { algo: 'SHA-1',   bits: 160, len: 40,  status: 'Deprecated', color: 'text-cyber-orange' },
                { algo: 'SHA-256', bits: 256, len: 64,  status: 'Secure',   color: 'text-cyber-green'  },
                { algo: 'SHA-384', bits: 384, len: 96,  status: 'Secure',   color: 'text-cyber-green'  },
                { algo: 'SHA-512', bits: 512, len: 128, status: 'Secure',   color: 'text-cyber-green'  },
              ].map(r => (
                <tr key={r.algo} className="border-b border-cyber-border/20 last:border-0">
                  <td className="font-mono text-[11px] text-cyber-text-hi py-1.5 pr-4">{r.algo}</td>
                  <td className="font-mono text-[11px] text-cyber-muted py-1.5 pr-4">{r.bits}</td>
                  <td className="font-mono text-[11px] text-cyber-muted py-1.5 pr-4">{r.len}</td>
                  <td className={`font-mono text-[11px] py-1.5 ${r.color}`}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TerminalCard>
      )}
    </div>
  )
}
