'use client'

import { useState, useEffect, useCallback } from 'react'
import { Siren, CheckCheck, Search, Clock } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import SeverityBadge from '@/components/ui/SeverityBadge'
import Spinner from '@/components/ui/Spinner'

interface Incident {
  id:          string
  title:       string
  severity:    string
  status:      'open' | 'investigating' | 'resolved'
  ruleName:    string
  eventCount:  number
  firstSeenAt: string
  lastSeenAt:  string
  resolvedAt:  string | null
  createdAt:   string
}

const STATUSES  = ['', 'open', 'investigating', 'resolved'] as const
const SEVERITIES = ['', 'critical', 'high', 'medium', 'low', 'info']

const STATUS_STYLE: Record<string, string> = {
  open:          'text-cyber-red border-cyber-red/30 bg-cyber-red/5',
  investigating: 'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5',
  resolved:      'text-cyber-green border-cyber-green/30 bg-cyber-green/5',
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [status,    setStatus]    = useState('')
  const [severity,  setSeverity]  = useState('')
  const [updating,  setUpdating]  = useState<string | null>(null)

  const fetchIncidents = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (status)   params.set('status', status)
      if (severity) params.set('severity', severity)
      const res  = await fetch(`/api/monitor/incidents?${params}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else setIncidents(data.data ?? [])
    } catch {
      setError('Failed to load incidents')
    } finally { setLoading(false) }
  }, [status, severity])

  useEffect(() => { fetchIncidents() }, [fetchIncidents])

  async function updateStatus(id: string, newStatus: Incident['status']) {
    setUpdating(id)
    try {
      await fetch(`/api/monitor/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i))
    } catch { /* silently ignore */ } finally { setUpdating(null) }
  }

  const openCount = incidents.filter(i => i.status === 'open').length

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Siren size={16} className="text-cyber-red" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">Incidents</h1>
          {openCount > 0 && (
            <span className="font-mono text-[9px] px-1.5 py-px rounded border text-cyber-red border-cyber-red/30 bg-cyber-red/10">
              {openCount} open
            </span>
          )}
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Auto-detected incidents from correlation rules
        </p>
      </div>

      <TerminalCard title="Filters" accent="none">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-wider w-16 flex-none">Status</span>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button
                  key={s || 'all'}
                  onClick={() => setStatus(s)}
                  className={`font-mono text-[10px] px-2 py-px rounded border transition-colors ${
                    status === s
                      ? 'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10'
                      : 'text-cyber-muted border-cyber-border hover:border-cyber-cyan/30'
                  }`}
                >
                  {s || 'ALL'}
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
          </div>
        </div>
      </TerminalCard>

      <TerminalCard title="Incident List" label={`${incidents.length} total`} accent="red">
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Spinner size="sm" /> <span className="font-mono text-xs text-cyber-muted">Loading…</span>
          </div>
        ) : error ? (
          <p className="font-mono text-xs text-cyber-red">{error}</p>
        ) : incidents.length === 0 ? (
          <div className="py-6 text-center">
            <CheckCheck size={20} className="text-cyber-green mx-auto mb-2" />
            <p className="font-mono text-xs text-cyber-muted">No incidents match the current filters.</p>
            <p className="font-mono text-[10px] text-cyber-muted/60 mt-1">
              Incidents are created automatically when correlation rules fire.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {incidents.map(inc => (
              <div key={inc.id} className="border border-cyber-border rounded p-3 space-y-2 bg-cyber-surface/20">
                <div className="flex items-start gap-3">
                  <div className="flex-none pt-0.5">
                    <SeverityBadge severity={inc.severity.toUpperCase()} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-cyber-text-hi">{inc.title}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <span className="font-mono text-[9px] text-cyber-muted uppercase tracking-wider">
                        {inc.ruleName.replace(/_/g, ' ')}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[9px] text-cyber-muted">
                        <Search size={9} /> {inc.eventCount} events
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[9px] text-cyber-muted" suppressHydrationWarning>
                        <Clock size={9} /> {new Date(inc.firstSeenAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <span className={`font-mono text-[9px] px-1.5 py-px rounded border flex-none ${STATUS_STYLE[inc.status]}`}>
                    {inc.status}
                  </span>
                </div>

                {inc.status !== 'resolved' && (
                  <div className="flex items-center gap-2 pt-1 border-t border-cyber-border/50">
                    <span className="font-mono text-[9px] text-cyber-muted">Update:</span>
                    {inc.status === 'open' && (
                      <button
                        onClick={() => updateStatus(inc.id, 'investigating')}
                        disabled={updating === inc.id}
                        className="font-mono text-[9px] px-2 py-px rounded border text-cyber-orange border-cyber-orange/30 hover:bg-cyber-orange/10 transition-colors disabled:opacity-50"
                      >
                        → Investigating
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus(inc.id, 'resolved')}
                      disabled={updating === inc.id}
                      className="font-mono text-[9px] px-2 py-px rounded border text-cyber-green border-cyber-green/30 hover:bg-cyber-green/10 transition-colors disabled:opacity-50"
                    >
                      → Resolved
                    </button>
                  </div>
                )}

                {inc.status === 'resolved' && inc.resolvedAt && (
                  <p className="font-mono text-[9px] text-cyber-muted border-t border-cyber-border/50 pt-1" suppressHydrationWarning>
                    Resolved: {new Date(inc.resolvedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </TerminalCard>
    </div>
  )
}
