'use client'

import { useState, useEffect, useCallback } from 'react'
import { MonitorCheck, Plus, Trash2, Tag, Clock } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'

type AssetType = 'ip' | 'domain' | 'cidr' | 'url'

interface Asset {
  id:          string
  type:        AssetType
  value:       string
  label:       string | null
  tags:        string[]
  active:      boolean
  lastScanned: string | null
  createdAt:   string
}

const TYPE_COLOR: Record<AssetType, string> = {
  ip:     'text-cyber-cyan   border-cyber-cyan/30   bg-cyber-cyan/5',
  domain: 'text-cyber-green  border-cyber-green/30  bg-cyber-green/5',
  cidr:   'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5',
  url:    'text-cyber-red    border-cyber-red/30    bg-cyber-red/5',
}

export default function AssetsPage() {
  const [assets,  setAssets]  = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [adding,  setAdding]  = useState(false)
  const [form, setForm] = useState({ value: '', type: 'domain' as AssetType, label: '' })
  const [formErr, setFormErr] = useState('')

  const fetchAssets = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/monitor/assets?limit=50')
      const data = await res.json()
      if (data.error) setError(data.error)
      else setAssets(data.items ?? [])
    } catch {
      setError('Failed to load assets')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  async function addAsset() {
    if (!form.value.trim()) { setFormErr('Value is required'); return }
    setAdding(true); setFormErr('')
    try {
      const res  = await fetch('/api/monitor/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: form.value.trim(), type: form.type, label: form.label.trim() || undefined }),
      })
      const data = await res.json()
      if (data.error) { setFormErr(data.error); return }
      setForm({ value: '', type: 'domain', label: '' })
      await fetchAssets()
    } catch {
      setFormErr('Failed to add asset')
    } finally { setAdding(false) }
  }

  async function deleteAsset(id: string) {
    await fetch(`/api/monitor/assets/${id}`, { method: 'DELETE' })
    setAssets(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MonitorCheck size={16} className="text-cyber-cyan" />
          <h1 className="font-mono text-lg font-700 text-cyber-text-hi">Asset Monitor</h1>
        </div>
        <p className="font-mono text-xs text-cyber-muted">
          Register IPs, domains, CIDRs and URLs for continuous threat monitoring
        </p>
      </div>

      <TerminalCard title="Add Asset" accent="cyan">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="cyber-input md:col-span-1"
              placeholder="192.168.1.1 or example.com"
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addAsset()}
            />
            <select
              className="cyber-input"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as AssetType }))}
            >
              <option value="ip">IP Address</option>
              <option value="domain">Domain</option>
              <option value="cidr">CIDR Range</option>
              <option value="url">URL</option>
            </select>
            <input
              className="cyber-input"
              placeholder="Label (optional)"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addAsset()}
            />
          </div>
          {formErr && <p className="font-mono text-xs text-cyber-red">{formErr}</p>}
          <button
            onClick={addAsset}
            disabled={adding}
            className="flex items-center gap-2 px-4 py-1.5 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs rounded hover:bg-cyber-cyan/20 transition-colors disabled:opacity-50"
          >
            {adding ? <Spinner size={12} /> : <Plus size={12} />}
            Add Asset
          </button>
        </div>
      </TerminalCard>

      <TerminalCard title="Monitored Assets" label={`${assets.length} registered`} accent="none">
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Spinner size={14} /> <span className="font-mono text-xs text-cyber-muted">Loading assets…</span>
          </div>
        ) : error ? (
          <p className="font-mono text-xs text-cyber-red">{error}</p>
        ) : assets.length === 0 ? (
          <p className="font-mono text-xs text-cyber-muted">No assets registered yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center gap-3 p-3 border border-cyber-border rounded bg-cyber-surface/40 group">
                <span className={`font-mono text-[9px] px-1.5 py-px rounded border uppercase tracking-wider ${TYPE_COLOR[asset.type]}`}>
                  {asset.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-cyber-text-hi truncate">{asset.value}</p>
                  {asset.label && (
                    <p className="font-mono text-[10px] text-cyber-muted truncate">{asset.label}</p>
                  )}
                </div>
                {asset.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag size={10} className="text-cyber-muted" />
                    {asset.tags.slice(0, 2).map(t => (
                      <span key={t} className="font-mono text-[9px] text-cyber-muted border border-cyber-border rounded px-1">{t}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 text-cyber-muted">
                  <Clock size={10} />
                  <span className="font-mono text-[9px]">
                    {asset.lastScanned
                      ? new Date(asset.lastScanned).toLocaleDateString()
                      : 'Not scanned'}
                  </span>
                </div>
                <button
                  onClick={() => deleteAsset(asset.id)}
                  className="opacity-0 group-hover:opacity-100 text-cyber-muted hover:text-cyber-red transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </TerminalCard>
    </div>
  )
}
