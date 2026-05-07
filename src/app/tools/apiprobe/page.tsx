'use client'

import { useState } from 'react'
import { Database, ChevronDown, ChevronUp, AlertOctagon, CheckCircle, AlertTriangle, Search } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import type { ApiProbeResult, BackendType, EndpointResult } from '@/app/api/apiprobe/route'

const BACKENDS: { value: BackendType; label: string; urlPlaceholder: string; keyLabel: string; keyPlaceholder: string; hint: string }[] = [
  {
    value: 'supabase',
    label: 'Supabase',
    urlPlaceholder: 'https://xxxx.supabase.co',
    keyLabel: 'Anon / Service Key',
    keyPlaceholder: 'eyJhbGciOi...',
    hint: 'Enumerates tables via OpenAPI spec, then queries each with the provided key',
  },
  {
    value: 'firebase-rtdb',
    label: 'Firebase Realtime DB',
    urlPlaceholder: 'https://project-id.firebaseio.com',
    keyLabel: 'Auth Token (optional)',
    keyPlaceholder: 'leave blank for unauthenticated probe',
    hint: 'Probes common paths under /.json — exposes data if rules allow public read',
  },
  {
    value: 'firebase-firestore',
    label: 'Firebase Firestore',
    urlPlaceholder: 'your-project-id',
    keyLabel: 'API Key (optional)',
    keyPlaceholder: 'AIza...',
    hint: 'Probes common Firestore collections via the REST API',
  },
  {
    value: 'generic',
    label: 'Generic REST API',
    urlPlaceholder: 'https://api.target.com',
    keyLabel: 'Bearer Token / API Key',
    keyPlaceholder: 'token or leave blank',
    hint: 'Tests common API paths (/api, /api/v1, /graphql, /swagger.json, etc.)',
  },
]

function StatusBadge({ status }: { status: number }) {
  const cls =
    status === 200 ? 'text-cyber-green border-cyber-green/40 bg-cyber-green/10' :
    status === 401 || status === 403 ? 'text-cyber-orange border-cyber-orange/40 bg-cyber-orange/10' :
    status === 0   ? 'text-cyber-muted border-cyber-border bg-cyber-surface' :
    'text-cyber-muted border-cyber-border bg-cyber-surface'
  return (
    <span className={`font-mono text-[10px] border rounded px-1.5 py-px ${cls}`}>
      {status === 0 ? 'ERR' : status}
    </span>
  )
}

function ResultRow({ r }: { r: EndpointResult }) {
  const [exp, setExp] = useState(false)
  return (
    <div className="border-b border-cyber-border/20 last:border-0 py-2">
      <div className="flex items-center gap-2">
        {r.accessible
          ? <CheckCircle size={11} className="text-cyber-green flex-none" />
          : r.status === 401 || r.status === 403
          ? <AlertTriangle size={11} className="text-cyber-orange flex-none" />
          : <AlertOctagon size={11} className="text-cyber-muted flex-none" />
        }
        <StatusBadge status={r.status} />
        <span className={`font-mono text-xs flex-1 truncate ${r.accessible ? 'text-cyber-green' : 'text-cyber-muted'}`}>
          {r.label}
        </span>
        {r.accessible && (
          <span className="font-mono text-[10px] text-cyber-muted">{r.responseSize}b</span>
        )}
        {r.accessible && r.sample && (
          <button onClick={() => setExp(p => !p)} className="text-cyber-cyan hover:text-cyber-text transition-colors">
            {exp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
      {r.error && !r.accessible && (
        <p className="font-mono text-[10px] text-cyber-muted ml-6 mt-0.5">{r.error}</p>
      )}
      {exp && r.sample && (
        <div className="mt-2 ml-6 relative">
          <pre className="font-mono text-[10px] text-cyber-text bg-cyber-bg border border-cyber-border rounded p-2 overflow-x-auto max-h-48">
            {JSON.stringify(r.sample, null, 2)}
          </pre>
          <div className="absolute top-1.5 right-1.5">
            <CopyButton text={JSON.stringify(r.sample, null, 2)} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ApiProbePage() {
  const [type,    setType]    = useState<BackendType>('supabase')
  const [url,     setUrl]     = useState('')
  const [apiKey,  setApiKey]  = useState('')
  const [headers, setHeaders] = useState('')
  const [result,  setResult]  = useState<ApiProbeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const backend = BACKENDS.find(b => b.value === type)!

  async function probe() {
    if (!url.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const params = new URLSearchParams({ type, url: url.trim(), key: apiKey.trim(), headers: headers.trim() })
      const res  = await fetch(`/api/apiprobe?${params}`)
      const data: ApiProbeResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const accessible = result?.results.filter(r => r.accessible) ?? []
  const blocked    = result?.results.filter(r => !r.accessible && (r.status === 401 || r.status === 403)) ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Database size={16} className="text-cyber-cyan" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">API / DB Prober</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Probe backend APIs and databases — Supabase, Firebase, or any REST API
        </p>
      </div>

      <TerminalCard title="Target" accent="cyan">
        <div className="space-y-3">
          {/* Backend selector */}
          <div className="grid grid-cols-4 gap-1.5">
            {BACKENDS.map(b => (
              <button
                key={b.value}
                onClick={() => { setType(b.value); setUrl(''); setApiKey('') }}
                className={`font-mono text-[10px] border rounded px-2 py-1.5 transition-colors ${
                  type === b.value
                    ? 'border-cyber-cyan/60 text-cyber-cyan bg-cyber-cyan/10'
                    : 'border-cyber-border text-cyber-muted hover:border-cyber-cyan/30 hover:text-cyber-text'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <p className="font-mono text-[10px] text-cyber-muted">{backend.hint}</p>

          {/* URL */}
          <div>
            <label className="font-mono text-[10px] text-cyber-muted mb-1 block">
              {type === 'firebase-firestore' ? 'Firebase Project ID' : 'Base URL'}
            </label>
            <input
              className="cyber-input font-mono w-full"
              placeholder={backend.urlPlaceholder}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && probe()}
            />
          </div>

          {/* API Key */}
          <div>
            <label className="font-mono text-[10px] text-cyber-muted mb-1 block">{backend.keyLabel}</label>
            <input
              className="cyber-input font-mono w-full"
              placeholder={backend.keyPlaceholder}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          </div>

          {/* Extra headers for generic */}
          {type === 'generic' && (
            <div>
              <label className="font-mono text-[10px] text-cyber-muted mb-1 block">
                Extra Headers (JSON, optional)
              </label>
              <input
                className="cyber-input font-mono w-full"
                placeholder='{"X-Custom-Header": "value"}'
                value={headers}
                onChange={e => setHeaders(e.target.value)}
              />
            </div>
          )}

          <button
            className="cyber-btn flex items-center gap-2 w-full justify-center"
            onClick={probe}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : <Search size={13} />}
            {loading ? 'Probing…' : 'Probe'}
          </button>
        </div>
      </TerminalCard>

      {error && (
        <div className="cyber-card-red p-3 font-mono text-xs text-cyber-red">{error}</div>
      )}

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Summary */}
          <div className={`p-4 rounded-md border font-mono ${
            accessible.length > 0
              ? 'border-cyber-red/30 bg-cyber-red/5'
              : 'border-cyber-green/30 bg-cyber-green/5'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {accessible.length > 0
                ? <AlertOctagon size={14} className="text-cyber-red" />
                : <CheckCircle size={14} className="text-cyber-green" />}
              <span className={`text-sm font-bold ${accessible.length > 0 ? 'text-cyber-red' : 'text-cyber-green'}`}>
                {accessible.length > 0
                  ? `${accessible.length} endpoint(s) accessible`
                  : 'No accessible endpoints found'}
              </span>
            </div>
            <div className="flex gap-4 text-[10px] text-cyber-muted mt-1">
              <span>Schema: {result.schemaReachable ? '✓ reachable' : '✗ unreachable'}</span>
              <span>Accessible: {accessible.length}</span>
              <span>Blocked (401/403): {blocked.length}</span>
              <span>Total tested: {result.results.length}</span>
            </div>
          </div>

          {/* Results */}
          <TerminalCard title={`Endpoints (${result.results.length})`} accent="cyan">
            <div>
              {result.results.map((r, i) => <ResultRow key={i} r={r} />)}
            </div>
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
