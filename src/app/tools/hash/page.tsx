'use client'

import { useState } from 'react'
import { Hash, Search, Upload, AlertTriangle, CheckCircle, XCircle, ExternalLink, ShieldAlert } from 'lucide-react'
import type { HashResult } from '@/lib/types'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import { detectHashType } from '@/lib/utils'

function computeFileSha256(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async e => {
      try {
        const buffer = e.target?.result as ArrayBuffer
        const hashBuf = await crypto.subtle.digest('SHA-256', buffer)
        const hex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('')
        resolve(hex)
      } catch (err) { reject(err) }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

export default function HashPage() {
  const [hash,    setHash]    = useState('')
  const [result,  setResult]  = useState<HashResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [hashing, setHashing] = useState(false)

  const detectedType = hash.trim() ? detectHashType(hash.trim()) : null

  async function scan(h?: string) {
    const target = (h ?? hash).trim().toLowerCase()
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`/api/hash?hash=${encodeURIComponent(target)}`)
      const data: HashResult = await res.json()
      if (data.error && !data.virustotal && !data.malwarebazaar) setError(data.error)
      else setResult(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed') }
    finally { setLoading(false) }
  }

  async function handleFile(file: File) {
    if (file.size > 50 * 1024 * 1024) { setError('File too large (max 50 MB)'); return }
    setHashing(true); setError('')
    try {
      const sha256 = await computeFileSha256(file)
      setHash(sha256)
      await scan(sha256)
    } catch { setError('Failed to hash file') }
    finally { setHashing(false) }
  }

  const vt = result?.virustotal
  const mb = result?.malwarebazaar
  const isMalicious = (vt?.malicious ?? 0) > 0

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Hash size={16} className="text-cyber-red" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">Hash Scanner</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          VirusTotal + MalwareBazaar reputation lookup for MD5 / SHA1 / SHA256 / SHA512
        </p>
      </div>

      {/* Input */}
      <TerminalCard title="Hash / File Input" accent="red">
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                className="cyber-input font-mono"
                placeholder="Enter MD5, SHA1, SHA256, or SHA512 hash…"
                value={hash}
                onChange={e => setHash(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && scan()}
              />
              {detectedType && detectedType !== 'UNKNOWN' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] text-cyber-cyan border border-cyber-cyan/30 rounded px-1.5 py-px">
                  {detectedType}
                </span>
              )}
            </div>
            <button className="cyber-btn cyber-btn-red flex items-center gap-2" onClick={() => scan()} disabled={loading || hashing}>
              {loading ? <Spinner size="sm" /> : <Search size={13} />}
              {loading ? 'Scanning' : 'Scan'}
            </button>
          </div>

          {/* File drop zone */}
          <label className="block cursor-pointer">
            <div
              className="border border-dashed border-cyber-border hover:border-cyber-red/40 rounded p-4 text-center transition-colors"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            >
              <Upload size={16} className="mx-auto text-cyber-muted mb-2" />
              <p className="font-mono text-[11px] text-cyber-muted">
                {hashing ? 'Computing SHA-256…' : 'Drop file here or click to compute hash client-side (max 50 MB)'}
              </p>
              <p className="font-mono text-[9px] text-cyber-muted/60 mt-1">
                File content is NOT uploaded — only its SHA-256 hash is sent to the API.
              </p>
            </div>
            <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </label>
        </div>
      </TerminalCard>

      {error && (
        <div className="cyber-card-red p-3 flex items-center gap-2">
          <AlertTriangle size={13} className="text-cyber-red flex-none" />
          <span className="font-mono text-xs text-cyber-red">{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Verdict banner */}
          <div className={`cyber-card p-4 border ${isMalicious ? 'border-cyber-red/50' : 'border-cyber-green/30'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isMalicious
                  ? <ShieldAlert size={20} className="text-cyber-red" />
                  : <CheckCircle size={20} className="text-cyber-green" />}
                <div>
                  <p className={`font-mono text-sm font-700 ${isMalicious ? 'text-cyber-red' : 'text-cyber-green'}`}>
                    {isMalicious ? 'MALICIOUS DETECTED' : vt?.found ? 'CLEAN' : 'NOT IN DATABASE'}
                  </p>
                  {vt?.threatLabel && (
                    <p className="font-mono text-xs text-cyber-muted mt-0.5">{vt.threatLabel}</p>
                  )}
                </div>
              </div>
              <span className="font-mono text-[10px] border border-cyber-border rounded px-2 py-1 text-cyber-muted">
                {result.hashType}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <p className="font-mono text-[11px] text-cyber-muted break-all flex-1">{result.hash}</p>
              <CopyButton text={result.hash} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* VirusTotal */}
            <TerminalCard
              title="VirusTotal"
              accent={vt?.error ? 'none' : vt?.malicious ? 'red' : vt?.found ? 'green' : 'none'}
            >
              {vt?.error ? (
                <p className="font-mono text-xs text-cyber-muted">{vt.error}</p>
              ) : vt?.found ? (
                <div className="space-y-3">
                  {/* Detection ratio */}
                  <div className="text-center py-2">
                    <p className={`font-mono text-4xl font-700 ${vt.malicious > 0 ? 'text-cyber-red' : 'text-cyber-green'}`}>
                      {vt.malicious}/{vt.total}
                    </p>
                    <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">engines detected</p>
                  </div>
                  {/* Breakdown */}
                  <div className="space-y-1.5">
                    {[
                      { label: 'Malicious',  count: vt.malicious,  color: 'text-cyber-red'   },
                      { label: 'Suspicious', count: vt.suspicious, color: 'text-cyber-orange' },
                      { label: 'Harmless',   count: vt.harmless,   color: 'text-cyber-green'  },
                      { label: 'Undetected', count: vt.undetected, color: 'text-cyber-muted'  },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex justify-between items-center py-1 border-b border-cyber-border/30">
                        <span className="font-mono text-[11px] text-cyber-muted">{label}</span>
                        <span className={`font-mono text-[12px] font-600 ${color}`}>{count}</span>
                      </div>
                    ))}
                  </div>
                  {vt.lastAnalysis && (
                    <p className="font-mono text-[9px] text-cyber-muted">Last scan: {vt.lastAnalysis}</p>
                  )}
                  {vt.permalink && (
                    <a href={vt.permalink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-[10px] text-cyber-cyan hover:underline">
                      <ExternalLink size={10} /> View full report on VirusTotal
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle size={13} className="text-cyber-muted" />
                  <span className="font-mono text-xs text-cyber-muted">Not found in VirusTotal database.</span>
                </div>
              )}
            </TerminalCard>

            {/* MalwareBazaar */}
            <TerminalCard
              title="MalwareBazaar"
              accent={mb?.found ? 'red' : 'none'}
            >
              {mb?.found ? (
                <div className="space-y-0">
                  {[
                    { label: 'File name',  value: mb.fileName },
                    { label: 'File type',  value: mb.fileType },
                    { label: 'Size',       value: mb.fileSize ? `${(mb.fileSize / 1024).toFixed(1)} KB` : undefined },
                    { label: 'First seen', value: mb.firstSeen },
                    { label: 'Last seen',  value: mb.lastSeen  },
                    { label: 'Signature',  value: mb.signature },
                  ].map(({ label, value }) => value ? (
                    <div key={label} className="flex gap-3 py-1.5 border-b border-cyber-border/30 last:border-0">
                      <span className="font-mono text-[11px] text-cyber-muted w-24 flex-none uppercase tracking-wider">{label}</span>
                      <span className="font-mono text-[11px] text-cyber-text-hi break-all">{value}</span>
                    </div>
                  ) : null)}
                  {mb.tags && mb.tags.length > 0 && (
                    <div className="pt-2">
                      <div className="flex flex-wrap gap-1.5">
                        {mb.tags.map(t => (
                          <span key={t} className="font-mono text-[10px] border border-cyber-red/30 text-cyber-red bg-cyber-red/5 rounded px-2 py-0.5">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle size={13} className="text-cyber-muted" />
                  <span className="font-mono text-xs text-cyber-muted">Not found in MalwareBazaar.</span>
                </div>
              )}
            </TerminalCard>
          </div>
        </div>
      )}

      {/* Example hashes */}
      {!result && !loading && (
        <div className="space-y-2">
          <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">Example known-malicious hashes (safe to test)</p>
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'WannaCry SHA256', hash: '24d004a104d4d54034dbcffc2a4b19a11f39008a575aa614ea04703480b1022c' },
              { label: 'Mirai MD5',       hash: 'c9a77f35b984f2fac1b8f05a4ce87f66' },
            ].map(({ label, hash: h }) => (
              <button key={h} onClick={() => { setHash(h); scan(h) }}
                className="flex items-center gap-3 text-left p-2 border border-cyber-border hover:border-cyber-red/40 rounded transition-colors group">
                <span className="font-mono text-[10px] text-cyber-muted w-36 flex-none">{label}</span>
                <span className="font-mono text-[10px] text-cyber-muted group-hover:text-cyber-text transition-colors truncate">{h}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
