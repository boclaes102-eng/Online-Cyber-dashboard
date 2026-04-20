'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import SeverityBadge from '@/components/ui/SeverityBadge'
import Spinner from '@/components/ui/Spinner'

interface LogEvent {
  id:         string
  source:     string
  category:   string
  action:     string
  severity:   string
  sourceIp:   string | null
  targetIp:   string | null
  targetPort: number | null
  message:    string | null
  createdAt:  string
}

const CATEGORIES = ['', 'auth', 'network', 'threat', 'system', 'recon']
const SEVERITIES = ['', 'critical', 'high', 'medium', 'low', 'info']
const TIME_RANGES = ['1h', '6h', '24h', '7d'] as const

const CATEGORY_COLOR: Record<string, string> = {
  auth:    'text-cyber-cyan',
  network: 'text-cyber-orange',
  threat:  'text-cyber-red',
  system:  'text-cyber-muted',
  recon:   'text-cyber-green',
}

export default function EventsPage() {
  const [events,    setEvents]    = useState<LogEvent[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [category,  setCategory]  = useState('')
  const [severity,  setSeverity]  = useState('')
  const [since,     setSince]     = useState<typeof TIME_RANGES[number]>('24h')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchEvents = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ limit: '100', since })
      if (category) params.set('category', category)
      if (severity) params.set('severity', severity)
      const res  = await fetch(`/api/monitor/events?${params}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else { setEvents(data.data ?? []); setLastRefresh(new Date()) }
    } catch {
      setError('Failed to load events')
    } finally { setLoading(false) }
  }, [category, severity, since])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(fetchEvents, 30_000)
    return () => clearInterval(id)
  }, [fetchEvents])

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity size={16} className="text-cyber-cyan" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">Event Timeline</h1>
          <span className="font-mono text-[9px] px-1.5 py-px rounded border text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/10">
            {events.length} events
          </span>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Security events from all connected sources — refreshes every 30s
        </p>
      </div>

      <TerminalCard title="Filters" accent="none">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-wider w-16 flex-none">Time</span>
            <div className="flex gap-2">
              {TIME_RANGES.map(t => (
                <button
                  key={t}
                  onClick={() => setSince(t)}
                  className={`font-mono text-[10px] px-2 py-px rounded border transition-colors ${
                    since === t
                      ? 'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10'
                      : 'text-cyber-muted border-cyber-border hover:border-cyber-cyan/30'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-wider w-16 flex-none">Category</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c || 'all'}
                  onClick={() => setCategory(c)}
                  className={`font-mono text-[10px] px-2 py-px rounded border transition-colors ${
                    category === c
                      ? 'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10'
                      : 'text-cyber-muted border-cyber-border hover:border-cyber-cyan/30'
                  }`}
                >
                  {c || 'ALL'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-wider w-16 flex-none">Severity</span>
            <div className="flex flex-wrap gap-2">
              {SEVERITIES.map(s => (
                <button
                  key={s || 'all'}
                  onClick={() => setSeverity(s)}
                  className={`font-mono text-[10px] px-2 py-px rounded border transition-colors ${
                    severity === s
                      ? 'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10'
                      : 'text-cyber-muted border-cyber-border hover:border-cyber-cyan/30'
                  }`}
                >
                  {s ? s.toUpperCase() : 'ALL'}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <RefreshCw size={10} className="text-cyber-muted" />
              <span className="font-mono text-[9px] text-cyber-muted" suppressHydrationWarning>
                {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard title="Events" accent="none">
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Spinner size="sm" /> <span className="font-mono text-xs text-cyber-muted">Loading…</span>
          </div>
        ) : error ? (
          <p className="font-mono text-xs text-cyber-red">{error}</p>
        ) : events.length === 0 ? (
          <div className="py-6 text-center">
            <Activity size={20} className="text-cyber-muted mx-auto mb-2" />
            <p className="font-mono text-xs text-cyber-muted">No events in this time range.</p>
            <p className="font-mono text-[10px] text-cyber-muted/60 mt-1">
              Events appear here when your personal website or asset scanner sends data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-cyber-border">
                  {['Time', 'Source', 'Category', 'Action', 'Severity', 'Message'].map(h => (
                    <th key={h} className="pb-2 pr-4 font-mono text-[9px] text-cyber-muted uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40">
                {events.map(ev => (
                  <tr key={ev.id} className="hover:bg-cyber-surface/40 transition-colors">
                    <td className="py-2 pr-4 font-mono text-[10px] text-cyber-muted whitespace-nowrap" suppressHydrationWarning>
                      {new Date(ev.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2 pr-4 font-mono text-[10px] text-cyber-text whitespace-nowrap">
                      {ev.source}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className={`font-mono text-[10px] uppercase ${CATEGORY_COLOR[ev.category] ?? 'text-cyber-muted'}`}>
                        {ev.category}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-mono text-[10px] text-cyber-text-hi whitespace-nowrap">
                      {ev.action.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <SeverityBadge severity={ev.severity.toUpperCase()} size="sm" />
                    </td>
                    <td className="py-2 font-mono text-[10px] text-cyber-muted max-w-xs truncate">
                      {ev.message ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TerminalCard>
    </div>
  )
}
