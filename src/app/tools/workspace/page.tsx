'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Database, Trash2, RefreshCw, ChevronDown, ChevronRight,
  Globe, Search, Layers, Lock, Shield, Terminal,
  Wifi, Network, ScanSearch, Crosshair, Mail, FileSearch,
  ServerCrash, Cpu, ArrowLeftRight,
} from 'lucide-react'

const TOOL_META: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  ip:           { label: 'IP Intelligence',      icon: Globe },
  domain:       { label: 'Domain Analyzer',      icon: Search },
  subdomains:   { label: 'Subdomain Enum',        icon: Layers },
  ssl:          { label: 'SSL Inspector',         icon: Lock },
  headers:      { label: 'HTTP Headers',          icon: Shield },
  portscan:     { label: 'Port Scanner',          icon: Terminal },
  dns:          { label: 'DNS Resolver',          icon: Wifi },
  reverseip:    { label: 'Reverse IP',            icon: Network },
  asn:          { label: 'BGP / ASN',             icon: ScanSearch },
  whoishistory: { label: 'WHOIS History',         icon: Search },
  certs:        { label: 'Cert Transparency',     icon: Shield },
  traceroute:   { label: 'Traceroute',            icon: Network },
  url:          { label: 'URL Scanner',           icon: Crosshair },
  email:        { label: 'Email OSINT',           icon: Mail },
  ioc:          { label: 'IOC Lookup',            icon: FileSearch },
  shodan:       { label: 'Shodan Search',         icon: ServerCrash },
  tech:         { label: 'Tech Fingerprinter',    icon: Cpu },
  waf:          { label: 'WAF Detector',          icon: Shield },
  cors:         { label: 'CORS Checker',          icon: ArrowLeftRight },
}

interface ReconSession {
  id:        string
  tool:      string
  target:    string
  summary:   Record<string, unknown>
  results:   Record<string, unknown>
  tags:      string[]
  notes:     string | null
  createdAt: string
}

interface ApiResp {
  data?: ReconSession[]
  error?: string
  nextCursor?: string | null
  total?: number
}

function ToolBadge({ tool }: { tool: string }) {
  const meta = TOOL_META[tool]
  if (!meta) return <span className="font-mono text-[10px] text-cyber-muted uppercase">{tool}</span>
  const Icon = meta.icon
  return (
    <span className="flex items-center gap-1 font-mono text-[10px] text-cyber-cyan uppercase tracking-wider">
      <Icon size={11} className="text-cyber-cyan" />
      {meta.label}
    </span>
  )
}

function SummaryRow({ k, v }: { k: string; v: unknown }) {
  if (v === null || v === undefined) return null
  const display = Array.isArray(v) ? `[${(v as unknown[]).length} items]` : String(v)
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-wider w-28 flex-none">{k}</span>
      <span className="font-mono text-[10px] text-cyber-text break-all">{display}</span>
    </div>
  )
}

export default function WorkspacePage() {
  const [sessions, setSessions]   = useState<ReconSession[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [filterTool, setFilter]   = useState('')
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [cursor, setCursor]       = useState<string | null>(null)
  const [hasMore, setHasMore]     = useState(false)

  const load = useCallback(async (reset = false) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ limit: '30' })
      if (filterTool)        params.set('tool', filterTool)
      if (!reset && cursor)  params.set('cursor', cursor)

      const res = await fetch(`/api/monitor/recon-sessions?${params}`)
      const data: ApiResp = await res.json()
      if (data.error) { setError(data.error); return }
      const rows = data.data ?? []
      setSessions(prev => reset ? rows : [...prev, ...rows])
      setCursor(data.nextCursor ?? null)
      setHasMore(!!data.nextCursor)
    } catch {
      setError('Failed to connect to backend — ensure the Threat Intel Platform is running.')
    } finally { setLoading(false) }
  }, [filterTool, cursor])

  useEffect(() => { load(true) }, [filterTool]) // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteSession(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/monitor/recon-sessions/${id}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== id))
    } finally { setDeleting(null) }
  }

  const tools = Array.from(new Set(Object.keys(TOOL_META)))

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database size={16} className="text-cyber-cyan" />
            <h1 className="font-mono text-lg font-700 text-cyber-text-hi">Recon Workspace</h1>
          </div>
          <p className="font-mono text-xs text-cyber-muted">
            Saved recon sessions from the dashboard — load targets into the CyberSuite desktop tool
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="flex items-center gap-1.5 font-mono text-xs text-cyber-cyan border border-cyber-cyan/30 bg-cyber-cyan/5 hover:bg-cyber-cyan/10 rounded px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('')}
          className={`font-mono text-[10px] px-3 py-1 rounded border transition-colors ${
            !filterTool
              ? 'border-cyber-cyan/40 text-cyber-cyan bg-cyber-cyan/10'
              : 'border-cyber-border text-cyber-muted hover:border-cyber-cyan/30 hover:text-cyber-cyan'
          }`}
        >
          All
        </button>
        {tools.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t === filterTool ? '' : t)}
            className={`font-mono text-[10px] px-3 py-1 rounded border transition-colors ${
              filterTool === t
                ? 'border-cyber-cyan/40 text-cyber-cyan bg-cyber-cyan/10'
                : 'border-cyber-border text-cyber-muted hover:border-cyber-cyan/30 hover:text-cyber-cyan'
            }`}
          >
            {TOOL_META[t]?.label ?? t}
          </button>
        ))}
      </div>

      {error && (
        <div className="cyber-card-red p-3 font-mono text-xs text-cyber-red">{error}</div>
      )}

      {/* Session list */}
      {sessions.length === 0 && !loading && !error && (
        <div className="cyber-card p-12 text-center">
          <Database size={32} className="text-cyber-muted mx-auto mb-3" />
          <p className="font-mono text-sm text-cyber-muted">No saved sessions yet</p>
          <p className="font-mono text-[10px] text-cyber-muted mt-1">
            Run a recon tool and click &quot;Save to Workspace&quot; to store results here
          </p>
        </div>
      )}

      <div className="space-y-2">
        {sessions.map(s => {
          const isOpen = expanded === s.id
          return (
            <div key={s.id} className="cyber-card overflow-hidden">
              {/* Row header */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cyber-cyan/3 transition-colors text-left"
                onClick={() => setExpanded(isOpen ? null : s.id)}
              >
                {isOpen ? <ChevronDown size={13} className="text-cyber-cyan flex-none" /> : <ChevronRight size={13} className="text-cyber-muted flex-none" />}
                <ToolBadge tool={s.tool} />
                <span className="font-mono text-xs text-cyber-text-hi flex-1 truncate">{s.target}</span>
                {s.tags.length > 0 && (
                  <div className="flex gap-1 flex-none">
                    {s.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="font-mono text-[9px] text-cyber-muted border border-cyber-border rounded px-1.5 py-px">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <span className="font-mono text-[10px] text-cyber-muted flex-none">
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
                  disabled={deleting === s.id}
                  className="flex-none p-1 text-cyber-muted hover:text-cyber-red transition-colors disabled:opacity-40"
                >
                  <Trash2 size={12} />
                </button>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-cyber-border bg-cyber-surface/30 px-4 py-3 space-y-3">
                  <div>
                    <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-1">Summary</p>
                    {Object.entries(s.summary).map(([k, v]) => (
                      <SummaryRow key={k} k={k} v={v} />
                    ))}
                  </div>

                  {s.notes && (
                    <div>
                      <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-1">Notes</p>
                      <p className="font-mono text-[11px] text-cyber-text">{s.notes}</p>
                    </div>
                  )}

                  <details className="group">
                    <summary className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest cursor-pointer hover:text-cyber-cyan">
                      Full JSON results
                    </summary>
                    <pre className="mt-2 font-mono text-[10px] text-cyber-text overflow-x-auto leading-relaxed max-h-64 overflow-y-auto bg-cyber-bg rounded p-2">
                      {JSON.stringify(s.results, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => load(false)}
          disabled={loading}
          className="w-full cyber-btn"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
