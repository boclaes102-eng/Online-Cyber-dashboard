'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, CheckCheck, Filter } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import SeverityBadge from '@/components/ui/SeverityBadge'
import Spinner from '@/components/ui/Spinner'

interface Alert {
  id:        string
  type:      string
  severity:  string
  title:     string
  details:   Record<string, unknown>
  readAt:    string | null
  createdAt: string
  asset?:    { value: string; type: string } | null
}

const SEVERITIES = ['', 'critical', 'high', 'medium', 'low', 'info']

export default function AlertsPage() {
  const [alerts,    setAlerts]    = useState<Alert[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [severity,  setSeverity]  = useState('')
  const [unreadOnly,setUnreadOnly]= useState(false)

  const fetchAlerts = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (severity)   params.set('severity', severity)
      if (unreadOnly) params.set('unread', 'true')
      const res  = await fetch(`/api/monitor/alerts?${params}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else setAlerts(data.items ?? [])
    } catch {
      setError('Failed to load alerts')
    } finally { setLoading(false) }
  }, [severity, unreadOnly])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  async function markAllRead() {
    await fetch('/api/monitor/alerts/read-all', { method: 'POST' })
    setAlerts(prev => prev.map(a => ({ ...a, readAt: new Date().toISOString() })))
  }

  async function markRead(id: string) {
    await fetch(`/api/monitor/alerts/${id}/read`, { method: 'POST' })
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, readAt: new Date().toISOString() } : a))
  }

  const unreadCount = alerts.filter(a => !a.readAt).length

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Bell size={16} className="text-cyber-orange" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">Alerts</h1>
          {unreadCount > 0 && (
            <span className="font-mono text-[9px] px-1.5 py-px rounded border text-cyber-orange border-cyber-orange/30 bg-cyber-orange/10">
              {unreadCount} unread
            </span>
          )}
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Threat notifications from monitored assets
        </p>
      </div>

      <TerminalCard title="Filters" accent="none">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={11} className="text-cyber-muted" />
            <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-wider">Severity</span>
          </div>
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
              {s || 'ALL'}
            </button>
          ))}
          <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={e => setUnreadOnly(e.target.checked)}
              className="accent-cyber-cyan"
            />
            <span className="font-mono text-[10px] text-cyber-muted">Unread only</span>
          </label>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 font-mono text-[10px] text-cyber-green hover:text-cyber-green/80 transition-colors"
            >
              <CheckCheck size={11} /> Mark all read
            </button>
          )}
        </div>
      </TerminalCard>

      <TerminalCard title="Alert Feed" label={`${alerts.length} alerts`} accent="none">
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Spinner size={14} /> <span className="font-mono text-xs text-cyber-muted">Loading…</span>
          </div>
        ) : error ? (
          <p className="font-mono text-xs text-cyber-red">{error}</p>
        ) : alerts.length === 0 ? (
          <div className="flex items-center gap-2 py-4">
            <BellOff size={14} className="text-cyber-muted" />
            <span className="font-mono text-xs text-cyber-muted">No alerts match the current filters.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 border rounded transition-colors ${
                  alert.readAt
                    ? 'border-cyber-border bg-cyber-surface/20 opacity-60'
                    : 'border-cyber-border bg-cyber-surface/40'
                }`}
              >
                <div className="flex-none pt-0.5">
                  <SeverityBadge severity={alert.severity.toUpperCase()} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-cyber-text-hi">{alert.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {alert.asset && (
                      <span className="font-mono text-[10px] text-cyber-cyan">{alert.asset.value}</span>
                    )}
                    <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-wider">{alert.type.replace('_', ' ')}</span>
                    <span className="font-mono text-[10px] text-cyber-muted">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                {!alert.readAt && (
                  <button
                    onClick={() => markRead(alert.id)}
                    className="flex-none text-cyber-muted hover:text-cyber-green transition-colors"
                    title="Mark as read"
                  >
                    <CheckCheck size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </TerminalCard>
    </div>
  )
}
