'use client'

import { useEffect, useState } from 'react'
import { Skull, AlertTriangle, ExternalLink, Users, RefreshCw } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import Spinner from '@/components/ui/Spinner'
import type { RansomwareResult, RansomwareVictim, RansomwareGroup } from '@/app/api/ransomware/route'

type Tab = 'recent' | 'groups'

function fmtDate(s: string): string {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return s.slice(0, 10) }
}

function VictimRow({ v }: { v: RansomwareVictim }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-cyber-border/20 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-cyber-text-hi truncate">{v.postTitle || v.website || '—'}</span>
          {v.country && (
            <span className="font-mono text-[9px] text-cyber-muted border border-cyber-border/40 rounded px-1">{v.country}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="font-mono text-[10px] text-cyber-red border border-cyber-red/30 rounded px-1.5 py-0.5">{v.groupName}</span>
          {v.activity && <span className="font-mono text-[10px] text-cyber-muted">{v.activity}</span>}
          {v.website && <span className="font-mono text-[10px] text-cyber-cyan truncate max-w-[200px]">{v.website}</span>}
        </div>
      </div>
      <div className="text-right flex-none">
        <p className="font-mono text-[10px] text-cyber-muted">{fmtDate(v.discovered || v.published)}</p>
        {v.postUrl && (
          <a href={v.postUrl} target="_blank" rel="noopener noreferrer" className="text-cyber-muted hover:text-cyber-red transition-colors mt-1 inline-block">
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  )
}

function GroupCard({ g, onSelect }: { g: RansomwareGroup; onSelect: (name: string) => void }) {
  return (
    <div
      className="p-3 rounded border border-cyber-border/40 bg-cyber-bg hover:border-cyber-red/30 hover:bg-cyber-red/3 transition-all cursor-pointer"
      onClick={() => onSelect(g.name)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-cyber-text-hi capitalize">{g.name}</p>
          {g.description && (
            <p className="font-mono text-[10px] text-cyber-muted mt-0.5 line-clamp-2 leading-relaxed">
              {g.description.slice(0, 120)}{g.description.length > 120 ? '…' : ''}
            </p>
          )}
        </div>
        <div className="text-right flex-none">
          <p className="font-mono text-xs text-cyber-red font-semibold">{g.recentPosts}</p>
          <p className="font-mono text-[9px] text-cyber-muted">posts</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {g.locations.slice(0, 3).map(l => (
          <span
            key={l.fqdn}
            className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${l.available ? 'text-cyber-green border-cyber-green/30' : 'text-cyber-muted border-cyber-border/40'}`}
          >
            {l.available ? '● ONLINE' : '○ OFFLINE'}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function RansomwarePage() {
  const [tab, setTab]         = useState<Tab>('recent')
  const [result, setResult]   = useState<RansomwareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')

  async function load(mode: 'recent' | 'groups' | 'group', group?: string) {
    setLoading(true); setError(''); setResult(null)
    try {
      const params = new URLSearchParams({ mode })
      if (group) params.set('group', group)
      const res  = await fetch(`/api/ransomware?${params}`)
      const data: RansomwareResult = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Request failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  // Load on tab switch
  useEffect(() => {
    if (tab === 'recent') load('recent')
    else load('groups')
    setSelectedGroup('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  function handleGroupSelect(name: string) {
    setSelectedGroup(name)
    load('group', name)
  }

  const filteredGroups = (result?.groups ?? []).filter(g =>
    !groupFilter || g.name.toLowerCase().includes(groupFilter.toLowerCase())
  )

  const filteredVictims = selectedGroup
    ? (result?.victims ?? [])
    : (result?.victims ?? []).filter(v =>
        !groupFilter || v.groupName.toLowerCase().includes(groupFilter.toLowerCase())
      )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-red/30 flex items-center justify-center bg-cyber-red/5 flex-none">
          <Skull size={18} className="text-cyber-red" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Ransomware Tracker</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Live ransomware victim feed and group intelligence via ransomware.live. Data updates continuously.
          </p>
        </div>
      </div>

      {/* Tabs + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['recent', 'groups'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-mono text-xs px-3 py-1.5 rounded border transition-all capitalize ${
                tab === t
                  ? 'bg-cyber-red/10 border-cyber-red/30 text-cyber-red'
                  : 'border-cyber-border/60 text-cyber-muted hover:text-cyber-text'
              }`}
            >
              {t === 'recent' ? 'Recent Victims' : 'Groups'}
            </button>
          ))}
          {selectedGroup && (
            <button
              className="font-mono text-xs px-3 py-1.5 rounded border bg-cyber-red/10 border-cyber-red/30 text-cyber-red"
            >
              {selectedGroup}
            </button>
          )}
        </div>
        <button
          onClick={() => {
            if (selectedGroup) load('group', selectedGroup)
            else load(tab)
          }}
          disabled={loading}
          className="flex items-center gap-1.5 font-mono text-[10px] text-cyber-muted hover:text-cyber-text transition-colors disabled:opacity-40"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter input */}
      {(tab === 'groups' && !selectedGroup) || tab === 'recent' ? (
        <input
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
          placeholder={tab === 'recent' ? 'Filter by group name…' : 'Search groups…'}
          className="w-full bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-red/40"
        />
      ) : null}

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded font-mono text-xs text-red-400">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-8 justify-center">
          <Spinner size="sm" />
          <span className="font-mono text-xs text-cyber-muted">Loading ransomware.live feed…</span>
        </div>
      )}

      {/* Recent victims */}
      {!loading && result && (tab === 'recent' || selectedGroup) && (
        <TerminalCard
          title={selectedGroup
            ? `${selectedGroup} victims (${filteredVictims.length})`
            : `Recent Victims — last ${filteredVictims.length} entries`}
          label="FEED"
          accent="red"
        >
          {filteredVictims.length === 0 ? (
            <p className="font-mono text-xs text-cyber-muted">No victims to display.</p>
          ) : (
            <div className="space-y-0 max-h-[600px] overflow-y-auto">
              {filteredVictims.map((v, i) => <VictimRow key={i} v={v} />)}
            </div>
          )}
          {selectedGroup && (
            <button
              onClick={() => { setSelectedGroup(''); load('groups') }}
              className="mt-3 font-mono text-[10px] text-cyber-muted hover:text-cyber-text transition-colors"
            >
              ← Back to group list
            </button>
          )}
        </TerminalCard>
      )}

      {/* Groups */}
      {!loading && result && tab === 'groups' && !selectedGroup && (
        <TerminalCard title={`Active Groups (${filteredGroups.length})`} label="GROUPS" accent="red">
          <div className="flex items-center gap-2 mb-3">
            <Users size={12} className="text-cyber-muted" />
            <span className="font-mono text-[10px] text-cyber-muted">Click a group to see their victims</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {filteredGroups.map(g => <GroupCard key={g.name} g={g} onSelect={handleGroupSelect} />)}
          </div>
        </TerminalCard>
      )}
    </div>
  )
}
