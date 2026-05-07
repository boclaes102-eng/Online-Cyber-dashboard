'use client'

import { useState } from 'react'
import { Database, ChevronDown, ChevronUp, AlertOctagon, CheckCircle, AlertTriangle, Info, Search } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import CopyButton from '@/components/ui/CopyButton'
import Spinner from '@/components/ui/Spinner'
import type { ApiProbeResult, AuthTestResult, BackendType, EndpointResult } from '@/app/api/apiprobe/route'

const BACKENDS: { value: BackendType; label: string; urlPlaceholder: string; keyLabel: string; keyPlaceholder: string; hint: string }[] = [
  { value: 'supabase',           label: 'Supabase',            urlPlaceholder: 'https://xxxx.supabase.co',         keyLabel: 'Anon / Service Key',      keyPlaceholder: 'eyJhbGciOi…',                hint: 'Enumerates tables via OpenAPI, falls back to common table names. Detects open RLS policies and leaked table names via error hints.' },
  { value: 'firebase-rtdb',      label: 'Firebase RTDB',       urlPlaceholder: 'https://project.firebaseio.com',   keyLabel: 'Auth Token (optional)',    keyPlaceholder: 'leave blank for anon probe', hint: 'Probes common paths via /.json — exposes data if Firebase rules allow public read.' },
  { value: 'firebase-firestore', label: 'Firebase Firestore',  urlPlaceholder: 'your-firebase-project-id',         keyLabel: 'API Key (optional)',       keyPlaceholder: 'AIza…',                      hint: 'Probes common Firestore collections via the REST API.' },
  { value: 'generic',            label: 'Generic REST',        urlPlaceholder: 'https://api.target.com',           keyLabel: 'Bearer Token / API Key',  keyPlaceholder: 'token or leave blank',       hint: 'Tests /api, /api/v1, /api/v2, /graphql, /swagger.json, /openapi.json and more.' },
  { value: 'auth-test',          label: 'Auth Bypass',         urlPlaceholder: 'https://xxxx.supabase.co',         keyLabel: 'Anon / API Key',          keyPlaceholder: 'eyJhbGciOi…',                hint: 'Tests JWT forgery, alg=none, user enumeration, and privilege escalation via role self-patch. Works on any Supabase project.' },
]

const SEV_AUTH: Record<string, string> = {
  critical: 'text-cyber-red border-cyber-red/40 bg-cyber-red/10',
  high:     'text-cyber-orange border-cyber-orange/40 bg-cyber-orange/10',
  medium:   'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  info:     'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10',
  safe:     'text-cyber-green border-cyber-green/40 bg-cyber-green/10',
}

function StatusPill({ status, accessible, empty }: { status: number; accessible: boolean; empty: boolean }) {
  const cls = accessible && !empty
    ? 'text-cyber-red border-cyber-red/50 bg-cyber-red/10'
    : accessible && empty
    ? 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10'
    : status === 401 || status === 403
    ? 'text-cyber-orange border-cyber-orange/40 bg-cyber-orange/10'
    : 'text-cyber-muted border-cyber-border bg-cyber-surface'
  const label = status === 0 ? 'ERR' : String(status)
  return <span className={`font-mono text-[10px] border rounded px-1.5 py-px flex-none ${cls}`}>{label}</span>
}

function ResultRow({ r }: { r: EndpointResult }) {
  const [exp, setExp] = useState(false)
  const hasData = r.accessible && !r.empty && r.sample && r.sample.length > 0

  return (
    <div className="border-b border-cyber-border/20 last:border-0 py-2">
      <div className="flex items-center gap-2">
        {hasData
          ? <AlertOctagon size={11} className="text-cyber-red flex-none" />
          : r.accessible && r.empty
          ? <AlertTriangle size={11} className="text-yellow-400 flex-none" />
          : r.hint
          ? <Info size={11} className="text-cyber-cyan flex-none" />
          : r.status === 401 || r.status === 403
          ? <AlertTriangle size={11} className="text-cyber-orange flex-none" />
          : <CheckCircle size={11} className="text-cyber-muted flex-none" />
        }

        <StatusPill status={r.status} accessible={r.accessible} empty={r.empty} />

        <span className={`font-mono text-xs flex-1 ${hasData ? 'text-cyber-red font-bold' : r.accessible && r.empty ? 'text-yellow-400' : 'text-cyber-muted'}`}>
          {r.label}
        </span>

        {hasData && r.columns.length > 0 && (
          <span className="font-mono text-[9px] text-cyber-muted truncate max-w-[200px]">
            {r.columns.join(', ')}
          </span>
        )}
        {r.accessible && !r.empty && (
          <span className="font-mono text-[10px] text-cyber-muted">{r.responseSize}b</span>
        )}
        {hasData && (
          <button onClick={() => setExp(p => !p)} className="text-cyber-cyan hover:text-cyber-text transition-colors flex-none">
            {exp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {r.hint && (
        <p className="font-mono text-[10px] text-cyber-cyan ml-5 mt-0.5">
          Hint: table &apos;{r.hint}&apos; leaked via error response
        </p>
      )}
      {r.error && !r.accessible && !r.hint && (
        <p className="font-mono text-[10px] text-cyber-muted ml-5 mt-0.5">{r.error}</p>
      )}
      {r.accessible && r.empty && (
        <p className="font-mono text-[10px] text-yellow-400/70 ml-5 mt-0.5">Table exists — RLS filters anon to empty result</p>
      )}

      {exp && r.sample && (
        <div className="mt-2 ml-5 relative">
          <pre className="font-mono text-[10px] text-cyber-text bg-cyber-bg border border-cyber-border rounded p-2 overflow-x-auto max-h-64">
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
  const [type,         setType]        = useState<BackendType>('supabase')
  const [url,          setUrl]         = useState('')
  const [apiKey,       setApiKey]      = useState('')
  const [headers,      setHeaders]     = useState('')
  const [profileTable, setProfileTable]= useState('profiles')
  const [result,       setResult]      = useState<ApiProbeResult | AuthTestResult | null>(null)
  const [loading,      setLoading]     = useState(false)
  const [error,        setError]       = useState('')

  const backend = BACKENDS.find(b => b.value === type)!

  async function probe() {
    if (!url.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const params = new URLSearchParams({ type, url: url.trim(), key: apiKey.trim(), headers: headers.trim(), profileTable: profileTable.trim() })
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

  const isAuthTest = result?.backendType === 'auth-test'
  const authResult = isAuthTest ? result as AuthTestResult : null
  const probeResult = !isAuthTest ? result as ApiProbeResult | null : null
  const open     = probeResult?.results.filter(r => r.accessible && !r.empty) ?? []
  const rls      = probeResult?.results.filter(r => r.accessible && r.empty)  ?? []
  const blocked  = probeResult?.results.filter(r => !r.accessible && (r.status === 401 || r.status === 403)) ?? []

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
          <div className="grid grid-cols-4 gap-1.5">
            {BACKENDS.map(b => (
              <button key={b.value}
                onClick={() => { setType(b.value); setUrl(''); setApiKey('') }}
                className={`font-mono text-[10px] border rounded px-2 py-1.5 transition-colors ${
                  type === b.value
                    ? 'border-cyber-cyan/60 text-cyber-cyan bg-cyber-cyan/10'
                    : 'border-cyber-border text-cyber-muted hover:border-cyber-cyan/30 hover:text-cyber-text'
                }`}
              >{b.label}</button>
            ))}
          </div>
          <p className="font-mono text-[10px] text-cyber-muted">{backend.hint}</p>

          <div>
            <label className="font-mono text-[10px] text-cyber-muted mb-1 block">
              {type === 'firebase-firestore' ? 'Firebase Project ID' : 'Base URL'}
            </label>
            <input className="cyber-input font-mono w-full" placeholder={backend.urlPlaceholder}
              value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key==='Enter' && probe()} />
          </div>

          <div>
            <label className="font-mono text-[10px] text-cyber-muted mb-1 block">{backend.keyLabel}</label>
            <input className="cyber-input font-mono w-full" placeholder={backend.keyPlaceholder}
              value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>

          {type === 'generic' && (
            <div>
              <label className="font-mono text-[10px] text-cyber-muted mb-1 block">Extra Headers (JSON)</label>
              <input className="cyber-input font-mono w-full" placeholder='{"X-Custom": "value"}'
                value={headers} onChange={e => setHeaders(e.target.value)} />
            </div>
          )}
          {type === 'auth-test' && (
            <div>
              <label className="font-mono text-[10px] text-cyber-muted mb-1 block">Profile table name</label>
              <input className="cyber-input font-mono w-full" placeholder='profiles'
                value={profileTable} onChange={e => setProfileTable(e.target.value)} />
            </div>
          )}

          <button className="cyber-btn flex items-center gap-2 w-full justify-center"
            onClick={probe} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <Search size={13} />}
            {loading ? 'Probing…' : 'Probe'}
          </button>
        </div>
      </TerminalCard>

      {error && <div className="cyber-card-red p-3 font-mono text-xs text-cyber-red">{error}</div>}

      {authResult && (
        <div className="space-y-4 animate-slide-up">
          <TerminalCard title="Auth Bypass Test Results" accent="orange">
            <div className="space-y-0">
              {authResult.tests.map((t, i) => (
                <div key={i} className="py-2 border-b border-cyber-border/20 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[10px] border rounded px-1.5 py-px flex-none ${SEV_AUTH[t.severity]}`}>
                      {t.result}
                    </span>
                    <span className="font-mono text-xs text-cyber-text-hi">{t.label}</span>
                  </div>
                  <p className="font-mono text-[10px] text-cyber-muted ml-0 mt-0.5">{t.detail}</p>
                </div>
              ))}
            </div>
          </TerminalCard>
        </div>
      )}

      {probeResult && (
        <div className="space-y-4 animate-slide-up">
          {/* Summary */}
          <div className={`p-4 rounded-md border ${open.length > 0 ? 'border-cyber-red/30 bg-cyber-red/5' : 'border-cyber-green/30 bg-cyber-green/5'}`}>
            <div className="flex items-center gap-2 mb-2">
              {open.length > 0 ? <AlertOctagon size={14} className="text-cyber-red" /> : <CheckCircle size={14} className="text-cyber-green" />}
              <span className={`font-mono text-sm font-bold ${open.length > 0 ? 'text-cyber-red' : 'text-cyber-green'}`}>
                {open.length > 0 ? `${open.length} endpoint(s) returning data` : 'No open endpoints found'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[10px] text-cyber-muted">
              <span>Schema reachable: {probeResult.schemaReachable ? '✓ yes' : '✗ no (fallback used)'}</span>
              <span>Tables probed: {probeResult.tablesProbed}</span>
              <span className="text-cyber-red">Open (data returned): {open.length}</span>
              <span className="text-yellow-400">RLS protected (empty): {rls.length}</span>
              <span className="text-cyber-orange">Blocked 401/403: {blocked.length}</span>
              <span className="text-cyber-cyan">Hints leaked: {probeResult.discoveredTables.length}</span>
            </div>
          </div>

          {/* Storage bucket */}
          {probeResult.storageBucket && (
            <div className="cyber-card p-3 border border-cyber-orange/30 bg-cyber-orange/5">
              <p className="font-mono text-[10px] text-cyber-orange font-bold mb-0.5">PUBLIC STORAGE BUCKET DETECTED</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs text-cyber-text-hi break-all">{probeResult.storageBucket}</p>
                <CopyButton text={probeResult.storageBucket!} />
              </div>
            </div>
          )}

          {/* Discovered table names via hints */}
          {probeResult.discoveredTables.length > 0 && (
            <div className="cyber-card p-3 border border-cyber-cyan/30 bg-cyber-cyan/5">
              <p className="font-mono text-[10px] text-cyber-cyan font-bold mb-1">TABLE NAMES LEAKED VIA ERROR HINTS</p>
              <div className="flex flex-wrap gap-1.5">
                {probeResult.discoveredTables.map(t => (
                  <span key={t} className="font-mono text-[10px] border border-cyber-cyan/30 text-cyber-cyan rounded px-2 py-0.5">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          <TerminalCard title={`Results (${probeResult.results.length} probed)`} accent="cyan">
            <div>
              {probeResult.results.map((r, i) => <ResultRow key={i} r={r} />)}
            </div>
          </TerminalCard>
        </div>
      )}
    </div>
  )
}
