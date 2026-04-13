'use client'
import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Download, Copy, Check, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

type TargetType = 'ip' | 'cidr' | 'domain' | 'wildcard' | 'url' | 'range'
type Status = 'in' | 'out'

interface Target {
  id: string
  value: string
  type: TargetType
  status: Status
  note: string
}

interface Engagement {
  id: string
  name: string
  client: string
  targets: Target[]
}

function detectType(value: string): TargetType | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  // CIDR
  if (/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(trimmed)) {
    const [, mask] = trimmed.split('/')
    if (+mask > 32) return null
    return 'cidr'
  }
  // IP range  192.168.1.1-192.168.1.254
  if (/^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) return 'range'
  // IP
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
    const parts = trimmed.split('.').map(Number)
    if (parts.every(p => p <= 255)) return 'ip'
    return null
  }
  // Wildcard domain
  if (trimmed.startsWith('*.')) return 'wildcard'
  // URL
  if (/^https?:\/\//.test(trimmed)) return 'url'
  // Domain
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(trimmed)) return 'domain'
  return null
}

function ipToNum(ip: string): number {
  return ip.split('.').reduce((acc, o) => (acc << 8) + parseInt(o), 0) >>> 0
}

function inCidr(ip: string, cidr: string): boolean {
  const [net, bits] = cidr.split('/')
  const mask = ~(2 ** (32 - +bits) - 1) >>> 0
  return (ipToNum(ip) & mask) === (ipToNum(net) & mask)
}

function inRange(ip: string, range: string): boolean {
  const [start, end] = range.split('-')
  const n = ipToNum(ip)
  return n >= ipToNum(start) && n <= ipToNum(end)
}

function isInScope(query: string, targets: Target[]): { match: boolean; rule?: Target } {
  const q = query.trim()
  const inTargets = targets.filter(t => t.status === 'in')
  for (const t of inTargets) {
    if (t.type === 'ip' && t.value === q) return { match: true, rule: t }
    if (t.type === 'cidr') { try { if (inCidr(q, t.value)) return { match: true, rule: t } } catch { /* */ } }
    if (t.type === 'range') { try { if (inRange(q, t.value)) return { match: true, rule: t } } catch { /* */ } }
    if (t.type === 'domain' && (t.value === q || q.endsWith('.' + t.value))) return { match: true, rule: t }
    if (t.type === 'wildcard') {
      const base = t.value.slice(2)
      if (q === base || q.endsWith('.' + base)) return { match: true, rule: t }
    }
    if (t.type === 'url' && q.startsWith(t.value)) return { match: true, rule: t }
  }
  return { match: false }
}

const TYPE_COLOR: Record<TargetType, string> = {
  ip:       'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  cidr:     'text-blue-400 border-blue-500/30 bg-blue-500/10',
  domain:   'text-green-400 border-green-500/30 bg-green-500/10',
  wildcard: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  url:      'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  range:    'text-orange-400 border-orange-500/30 bg-orange-500/10',
}

const STORAGE_KEY = 'cyberops_scope_engagements'

function uid() {
  return crypto.randomUUID()
}

export default function ScopePage() {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [newEngName, setNewEngName] = useState('')
  const [newEngClient, setNewEngClient] = useState('')
  const [showNewEng, setShowNewEng] = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const [targetNote, setTargetNote] = useState('')
  const [addError, setAddError] = useState('')
  const [validatorQ, setValidatorQ] = useState('')
  const [copied, setCopied] = useState(false)

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data: Engagement[] = JSON.parse(raw)
        setEngagements(data)
        if (data.length) setActiveId(data[0].id)
      }
    } catch { /* */ }
  }, [])

  function save(next: Engagement[]) {
    setEngagements(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function createEngagement() {
    if (!newEngName.trim()) return
    const eng: Engagement = { id: uid(), name: newEngName.trim(), client: newEngClient.trim(), targets: [] }
    const next = [...engagements, eng]
    save(next)
    setActiveId(eng.id)
    setNewEngName(''); setNewEngClient(''); setShowNewEng(false)
  }

  function deleteEngagement(id: string) {
    const next = engagements.filter(e => e.id !== id)
    save(next)
    setActiveId(next.length ? next[0].id : '')
  }

  function updateEngagement(id: string, updater: (e: Engagement) => Engagement) {
    save(engagements.map(e => e.id === id ? updater(e) : e))
  }

  const active = engagements.find(e => e.id === activeId) ?? null

  function addTarget() {
    if (!active) return
    const val = targetInput.trim()
    const type = detectType(val)
    if (!type) { setAddError('Unrecognized format — use IP, CIDR, domain, *.domain, IP range, or URL'); return }
    const target: Target = { id: uid(), value: val, type, status: 'in', note: targetNote.trim() }
    updateEngagement(activeId, e => ({ ...e, targets: [...e.targets, target] }))
    setTargetInput(''); setTargetNote(''); setAddError('')
  }

  function toggleStatus(targetId: string) {
    updateEngagement(activeId, e => ({
      ...e,
      targets: e.targets.map(t => t.id === targetId ? { ...t, status: t.status === 'in' ? 'out' : 'in' } : t)
    }))
  }

  function deleteTarget(targetId: string) {
    updateEngagement(activeId, e => ({ ...e, targets: e.targets.filter(t => t.id !== targetId) }))
  }

  const inScope = active?.targets.filter(t => t.status === 'in') ?? []
  const outScope = active?.targets.filter(t => t.status === 'out') ?? []

  function exportTxt() {
    if (!active) return
    const lines = ['# Scope — ' + active.name + (active.client ? ` (${active.client})` : ''), '', '## IN SCOPE', ...inScope.map(t => t.value + (t.note ? '  # ' + t.note : '')), '', '## OUT OF SCOPE', ...outScope.map(t => t.value + (t.note ? '  # ' + t.note : ''))]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = active.name.replace(/\s+/g, '_') + '_scope.txt'; a.click()
  }

  function copyInScope() {
    navigator.clipboard.writeText(inScope.map(t => t.value).join('\n'))
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const validatorResult = useMemo(() => {
    if (!validatorQ.trim() || !active) return null
    return isInScope(validatorQ.trim(), active.targets)
  }, [validatorQ, active])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">Scope Manager</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Manage engagement targets — IPs, CIDRs, domains, wildcards. Persisted locally in your browser.</p>
      </div>

      {/* Engagement tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {engagements.map(e => (
          <div key={e.id} className="flex items-center gap-1">
            <button onClick={() => setActiveId(e.id)}
              className={clsx('px-3 py-1.5 font-mono text-xs rounded border transition-all', activeId === e.id
                ? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30'
                : 'text-cyber-muted border-cyber-border hover:text-cyber-text')}>
              {e.name}{e.client ? ` · ${e.client}` : ''}
            </button>
            <button onClick={() => deleteEngagement(e.id)} className="text-cyber-muted hover:text-red-400 transition-colors">
              <Trash2 size={11} />
            </button>
          </div>
        ))}
        <button onClick={() => setShowNewEng(v => !v)}
          className="flex items-center gap-1 px-3 py-1.5 font-mono text-xs text-cyber-muted border border-dashed border-cyber-border rounded hover:text-cyber-cyan hover:border-cyber-cyan/30 transition-all">
          <Plus size={11} /> New Engagement
        </button>
      </div>

      {showNewEng && (
        <div className="flex gap-2 flex-wrap items-end">
          <div>
            <label className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest block mb-1">Engagement Name</label>
            <input value={newEngName} onChange={e => setNewEngName(e.target.value)}
              placeholder="Q2 External Pentest"
              className="bg-cyber-bg border border-cyber-border rounded px-3 py-1.5 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60 w-52"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest block mb-1">Client (optional)</label>
            <input value={newEngClient} onChange={e => setNewEngClient(e.target.value)}
              placeholder="Acme Corp"
              className="bg-cyber-bg border border-cyber-border rounded px-3 py-1.5 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60 w-40"
            />
          </div>
          <button onClick={createEngagement}
            className="px-4 py-1.5 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs rounded hover:bg-cyber-cyan/20 transition-all">
            Create
          </button>
        </div>
      )}

      {!active && (
        <p className="font-mono text-xs text-cyber-muted italic">No engagement selected. Create one above.</p>
      )}

      {active && (
        <>
          {/* Add target */}
          <div className="bg-cyber-surface border border-cyber-border rounded-lg p-4 space-y-3">
            <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">Add Target</p>
            <div className="flex gap-2 flex-wrap">
              <input value={targetInput} onChange={e => { setTargetInput(e.target.value); setAddError('') }}
                onKeyDown={e => e.key === 'Enter' && addTarget()}
                placeholder="192.168.1.0/24 · *.example.com · 10.0.0.1-10.0.0.254 · https://app.corp.com"
                className="flex-1 min-w-64 bg-cyber-bg border border-cyber-border rounded px-3 py-1.5 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
              />
              <input value={targetNote} onChange={e => setTargetNote(e.target.value)}
                placeholder="Note (optional)"
                className="w-44 bg-cyber-bg border border-cyber-border rounded px-3 py-1.5 font-mono text-xs text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
              />
              <button onClick={addTarget}
                className="px-4 py-1.5 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs rounded hover:bg-cyber-cyan/20 transition-all">
                <Plus size={12} />
              </button>
            </div>
            {addError && <p className="font-mono text-[10px] text-red-400">{addError}</p>}
          </div>

          {/* Target list */}
          <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-cyber-border flex items-center justify-between">
              <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">
                {active.targets.length} target{active.targets.length !== 1 ? 's' : ''} — {inScope.length} in scope, {outScope.length} out
              </p>
              <div className="flex items-center gap-2">
                <button onClick={copyInScope}
                  className="flex items-center gap-1 font-mono text-[10px] text-cyber-cyan hover:text-cyber-text transition-colors">
                  {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy in-scope</>}
                </button>
                <button onClick={exportTxt}
                  className="flex items-center gap-1 font-mono text-[10px] text-cyber-muted hover:text-cyber-cyan transition-colors">
                  <Download size={10} /> Export .txt
                </button>
              </div>
            </div>
            {active.targets.length === 0 ? (
              <p className="font-mono text-xs text-cyber-muted text-center py-8">No targets yet — add one above</p>
            ) : (
              <div className="divide-y divide-cyber-border max-h-96 overflow-y-auto">
                {active.targets.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-cyber-cyan/5 group">
                    <span className={clsx('font-mono text-[9px] px-1.5 py-0.5 rounded border', TYPE_COLOR[t.type])}>
                      {t.type.toUpperCase()}
                    </span>
                    <span className="font-mono text-xs text-cyber-text-hi flex-1 truncate">{t.value}</span>
                    {t.note && <span className="font-mono text-[10px] text-cyber-muted truncate max-w-[160px]">{t.note}</span>}
                    <button onClick={() => toggleStatus(t.id)}
                      className={clsx('font-mono text-[9px] px-2 py-0.5 rounded border transition-all', t.status === 'in'
                        ? 'text-green-400 border-green-500/30 bg-green-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                        : 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30')}>
                      {t.status === 'in' ? 'IN SCOPE' : 'OUT OF SCOPE'}
                    </button>
                    <button onClick={() => deleteTarget(t.id)} className="text-cyber-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scope validator */}
          <div className="bg-cyber-surface border border-cyber-border rounded-lg p-4 space-y-3">
            <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">Scope Validator</p>
            <div className="flex gap-2">
              <input value={validatorQ} onChange={e => setValidatorQ(e.target.value)}
                placeholder="Enter IP or domain to check..."
                className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-1.5 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
              />
            </div>
            {validatorResult && validatorQ.trim() && (
              <div className={clsx('rounded border px-4 py-3 font-mono text-xs', validatorResult.match
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400')}>
                {validatorResult.match
                  ? <>IN SCOPE — matched rule: <span className="text-cyber-text-hi">{validatorResult.rule?.value}</span> ({validatorResult.rule?.type})</>
                  : 'OUT OF SCOPE — no matching in-scope rule found'
                }
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
