'use client'

import { useState, useEffect, useMemo } from 'react'
import { NotebookPen, Plus, Trash2, Tag, ChevronDown, Download, X, Clock } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────
type NoteType = 'finding' | 'ioc' | 'observation' | 'action' | 'note'
type Severity  = 'critical' | 'high' | 'medium' | 'low' | 'info'

interface Note {
  id: string
  target: string
  createdAt: string  // ISO
  type: NoteType
  severity: Severity
  title: string
  body: string
  tags: string[]     // empty array allowed
  tool: string       // optional tool reference
}

interface Engagement {
  id: string; name: string; client: string
  targets: { id: string; value: string; status: 'in' | 'out' }[]
}

const NOTES_KEY    = 'cyberops_notes'
const SCOPE_KEY    = 'cyberops_scope_engagements'

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso)
    const today = new Date(); const yest = new Date(today); yest.setDate(yest.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yest.toDateString())  return 'Yesterday'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso.slice(0, 10) }
}

function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const TYPE_STYLE: Record<NoteType, { label: string; dot: string; badge: string }> = {
  finding:     { label: 'Finding',     dot: 'bg-cyber-red',    badge: 'text-cyber-red border-cyber-red/30'       },
  ioc:         { label: 'IOC',         dot: 'bg-cyber-orange', badge: 'text-cyber-orange border-cyber-orange/30' },
  observation: { label: 'Observation', dot: 'bg-cyber-cyan',   badge: 'text-cyber-cyan border-cyber-cyan/30'     },
  action:      { label: 'Action',      dot: 'bg-cyber-green',  badge: 'text-cyber-green border-cyber-green/30'   },
  note:        { label: 'Note',        dot: 'bg-cyber-muted',  badge: 'text-cyber-muted border-cyber-border/60'  },
}

const SEV_STYLE: Record<Severity, string> = {
  critical: 'text-cyber-red',
  high:     'text-cyber-orange',
  medium:   'text-yellow-400',
  low:      'text-cyber-cyan',
  info:     'text-cyber-muted',
}

// ─── Export notes for a target as Markdown ───────────────────────────────────
function exportMarkdown(target: string, notes: Note[]): void {
  const sorted = [...notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const lines  = [
    `# Investigation Notes — ${target}`,
    `_Exported ${new Date().toISOString()}_`, '',
  ]
  let lastDate = ''
  for (const n of sorted) {
    const date = fmtDate(n.createdAt)
    if (date !== lastDate) { lines.push(`## ${date}`, ''); lastDate = date }
    const ts = TYPE_STYLE[n.type]
    lines.push(`### [${ts.label}${n.severity !== 'info' ? ` / ${n.severity.toUpperCase()}` : ''}] ${n.title}`)
    lines.push(`_${fmtTime(n.createdAt)}${n.tool ? ` · ${n.tool}` : ''}_`, '')
    if (n.body) lines.push(n.body, '')
    if (n.tags.length) lines.push(`Tags: ${n.tags.map(t => `\`${t}\``).join(' ')}`, '')
    lines.push('---', '')
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `notes_${target.replace(/[^a-z0-9]/gi, '_')}.md`
  a.click(); URL.revokeObjectURL(url)
}

// ─── Note card ────────────────────────────────────────────────────────────────
function NoteCard({ note, onDelete }: { note: Note; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const ts = TYPE_STYLE[note.type]

  return (
    <div className="flex gap-3 py-2.5 border-b border-cyber-border/20 last:border-0 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center flex-none pt-1">
        <span className={`w-2 h-2 rounded-full flex-none ${ts.dot}`} />
        <span className="w-px flex-1 bg-cyber-border/20 mt-1" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Header row */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="font-mono text-[9px] text-cyber-muted flex-none">{fmtTime(note.createdAt)}</span>
          <span className={`font-mono text-[9px] border rounded px-1.5 py-0.5 flex-none ${ts.badge}`}>{ts.label}</span>
          {note.severity !== 'info' && (
            <span className={`font-mono text-[9px] font-semibold flex-none ${SEV_STYLE[note.severity]}`}>{note.severity.toUpperCase()}</span>
          )}
          {note.tool && (
            <span className="font-mono text-[9px] text-cyber-muted border border-cyber-border/40 rounded px-1.5 py-0.5 flex-none">{note.tool}</span>
          )}
          <button
            onClick={() => onDelete()}
            className="ml-auto font-mono text-[9px] text-cyber-muted hover:text-cyber-red transition-colors opacity-0 group-hover:opacity-100 flex-none"
          >
            <Trash2 size={10} />
          </button>
        </div>

        {/* Title */}
        <p
          className="font-mono text-xs text-cyber-text-hi cursor-pointer hover:text-cyber-cyan transition-colors"
          onClick={() => setExpanded(v => !v)}
        >
          {note.title}
        </p>

        {/* Body (expandable) */}
        {note.body && (
          expanded
            ? <p className="font-mono text-[10px] text-cyber-muted leading-relaxed whitespace-pre-wrap">{note.body}</p>
            : <p className="font-mono text-[10px] text-cyber-muted truncate cursor-pointer" onClick={() => setExpanded(true)}>
                {note.body.slice(0, 120)}{note.body.length > 120 ? '…' : ''}
              </p>
        )}

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {note.tags.map(t => (
              <span key={t} className="font-mono text-[9px] text-cyber-muted border border-cyber-border/40 rounded px-1.5 py-0.5">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add note form ────────────────────────────────────────────────────────────
interface NewNote { type: NoteType; severity: Severity; title: string; body: string; tagInput: string; tool: string }
const BLANK: NewNote = { type: 'note', severity: 'info', title: '', body: '', tagInput: '', tool: '' }

// ─── Page ─────────────────────────────────────────────────────────────────────
const TOOLS = ['IP Lookup','Domain Analyzer','URL Scanner','Email OSINT','IOC Lookup','Subdomain Enum',
  'Port Scanner','Shodan','ThreatFox','URLhaus','PhishTank','Ransomware Tracker','Auto Scanner','Other']

export default function NotesPage() {
  const [notes, setNotes]             = useState<Note[]>([])
  const [hydrated, setHydrated]       = useState(false)
  const [scopeTargets, setScopeTargets] = useState<string[]>([])
  const [target, setTarget]           = useState('')
  const [showScope, setShowScope]     = useState(false)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState<NewNote>(BLANK)
  const [filterType, setFilterType]   = useState<NoteType | 'all'>('all')
  const [filterSev, setFilterSev]     = useState<Severity | 'all'>('all')
  const [search, setSearch]           = useState('')

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTES_KEY)
      if (raw) setNotes(JSON.parse(raw))
    } catch {}
    try {
      const raw = localStorage.getItem(SCOPE_KEY)
      if (raw) {
        const engagements: Engagement[] = JSON.parse(raw)
        const targets = engagements.flatMap(e => e.targets.filter(t => t.status === 'in').map(t => t.value))
        setScopeTargets([...new Set(targets)])
      }
    } catch {}
    setHydrated(true)
  }, [])

  function saveNotes(updated: Note[]) {
    setNotes(updated)
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(updated)) } catch {}
  }

  function addNote() {
    if (!target.trim() || !form.title.trim()) return
    const tags = form.tagInput.split(',').map(t => t.trim()).filter(Boolean)
    const note: Note = {
      id: makeId(), target: target.trim(), createdAt: new Date().toISOString(),
      type: form.type, severity: form.severity, title: form.title.trim(),
      body: form.body.trim(), tags, tool: form.tool,
    }
    saveNotes([note, ...notes])
    setForm(BLANK); setShowForm(false)
  }

  function deleteNote(id: string) { saveNotes(notes.filter(n => n.id !== id)) }

  function clearTarget() {
    if (!confirm(`Delete all notes for "${target}"? This cannot be undone.`)) return
    saveNotes(notes.filter(n => n.target !== target))
  }

  // Filter + group notes for current target
  const targetNotes = useMemo(() => {
    if (!target.trim()) return []
    return notes.filter(n =>
      n.target === target.trim() &&
      (filterType === 'all' || n.type === filterType) &&
      (filterSev  === 'all' || n.severity === filterSev) &&
      (!search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase()))
    )
  }, [notes, target, filterType, filterSev, search])

  // Group by date label
  const grouped = useMemo(() => {
    const map = new Map<string, Note[]>()
    for (const n of targetNotes) {
      const d = fmtDate(n.createdAt)
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(n)
    }
    return [...map.entries()]
  }, [targetNotes])

  const allTargets = useMemo(() => [...new Set(notes.map(n => n.target))], [notes])

  if (!hydrated) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-cyan/30 flex items-center justify-center bg-cyber-cyan/5 flex-none">
          <NotebookPen size={18} className="text-cyber-cyan" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Investigation Notes</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Per-target timestamped notes and timeline. Stored locally in your browser. Export any target&apos;s notes as Markdown.
          </p>
        </div>
      </div>

      {/* Target selector */}
      <TerminalCard title="Target" label="SCOPE" accent="cyan">
        <div className="flex gap-2 items-start">
          <div className="flex-1 relative">
            <input
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="domain.com, 192.168.1.1, or any identifier…"
              className="w-full bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-cyan/50"
            />
            {/* Existing targets dropdown */}
            {allTargets.filter(t => t !== target && t.includes(target)).length > 0 && target && (
              <div className="absolute top-full left-0 mt-0.5 z-10 bg-cyber-card border border-cyber-border rounded w-full max-h-36 overflow-y-auto">
                {allTargets.filter(t => t !== target && t.includes(target)).map(t => (
                  <button key={t} onClick={() => setTarget(t)}
                    className="w-full text-left px-3 py-1.5 font-mono text-xs text-cyber-muted hover:text-cyber-cyan hover:bg-cyber-surface/50 transition-colors">
                    {t} <span className="text-[9px] text-cyber-border ml-1">({notes.filter(n => n.target === t).length} notes)</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scope dropdown */}
          {scopeTargets.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowScope(v => !v)}
                className="flex items-center gap-1.5 font-mono text-[10px] text-cyber-muted hover:text-cyber-cyan border border-cyber-border/60 hover:border-cyber-cyan/30 rounded px-2.5 py-2 transition-colors whitespace-nowrap">
                From scope <ChevronDown size={10} className={clsx('transition-transform', showScope && 'rotate-180')} />
              </button>
              {showScope && (
                <div className="absolute top-full right-0 mt-1 z-20 bg-cyber-card border border-cyber-border rounded w-52 max-h-48 overflow-y-auto">
                  {scopeTargets.map(t => (
                    <button key={t} onClick={() => { setTarget(t); setShowScope(false) }}
                      className="w-full text-left px-3 py-1.5 font-mono text-xs text-cyber-muted hover:text-cyber-cyan hover:bg-cyber-surface/50 transition-colors">
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {target && (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="font-mono text-[10px] text-cyber-muted">
              {notes.filter(n => n.target === target).length} notes for this target
            </span>
            {notes.filter(n => n.target === target).length > 0 && (
              <>
                <button onClick={() => exportMarkdown(target, notes.filter(n => n.target === target))}
                  className="flex items-center gap-1 font-mono text-[10px] text-cyber-muted hover:text-cyber-cyan transition-colors">
                  <Download size={10} /> Export Markdown
                </button>
                <button onClick={clearTarget}
                  className="flex items-center gap-1 font-mono text-[10px] text-cyber-muted hover:text-cyber-red transition-colors">
                  <Trash2 size={10} /> Clear all for target
                </button>
              </>
            )}
          </div>
        )}
      </TerminalCard>

      {/* Add note */}
      {target && (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 font-mono text-xs text-cyber-muted hover:text-cyber-cyan border border-dashed border-cyber-border/60 hover:border-cyber-cyan/40 rounded px-4 py-2.5 w-full justify-center transition-all"
            >
              <Plus size={13} /> Add note for {target}
            </button>
          ) : (
            <TerminalCard title="New Note" label="ADD" accent="cyan">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">Type</label>
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as NoteType }))}
                      className="w-full mt-0.5 bg-cyber-bg border border-cyber-border rounded px-2 py-1.5 font-mono text-xs text-cyber-text-hi focus:outline-none focus:border-cyber-cyan/40">
                      {(Object.keys(TYPE_STYLE) as NoteType[]).map(v => (
                        <option key={v} value={v}>{TYPE_STYLE[v].label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">Severity</label>
                    <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value as Severity }))}
                      className="w-full mt-0.5 bg-cyber-bg border border-cyber-border rounded px-2 py-1.5 font-mono text-xs text-cyber-text-hi focus:outline-none focus:border-cyber-cyan/40">
                      {(['critical','high','medium','low','info'] as Severity[]).map(v => (
                        <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">Title *</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addNote()}
                    placeholder="Brief description of what you found…"
                    className="w-full mt-0.5 bg-cyber-bg border border-cyber-border rounded px-3 py-1.5 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-cyan/40" />
                </div>

                <div>
                  <label className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">Notes / Details</label>
                  <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={3}
                    placeholder="Evidence, context, screenshots ref, raw output…"
                    className="w-full mt-0.5 bg-cyber-bg border border-cyber-border rounded px-3 py-1.5 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-cyan/40 resize-y" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest flex items-center gap-1"><Tag size={8} /> Tags (comma-separated)</label>
                    <input value={form.tagInput} onChange={e => setForm(p => ({ ...p, tagInput: e.target.value }))}
                      placeholder="sqli, xss, rce"
                      className="w-full mt-0.5 bg-cyber-bg border border-cyber-border rounded px-3 py-1.5 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-cyan/40" />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest">Tool Reference</label>
                    <select value={form.tool} onChange={e => setForm(p => ({ ...p, tool: e.target.value }))}
                      className="w-full mt-0.5 bg-cyber-bg border border-cyber-border rounded px-2 py-1.5 font-mono text-xs text-cyber-text-hi focus:outline-none focus:border-cyber-cyan/40">
                      <option value="">— None —</option>
                      {TOOLS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button onClick={addNote} disabled={!form.title.trim()}
                    className="flex items-center gap-2 px-4 py-1.5 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs rounded hover:bg-cyber-cyan/20 disabled:opacity-40 transition-all">
                    <Clock size={11} /> Add to Timeline
                  </button>
                  <button onClick={() => { setShowForm(false); setForm(BLANK) }}
                    className="flex items-center gap-1 font-mono text-[10px] text-cyber-muted hover:text-cyber-text transition-colors">
                    <X size={10} /> Cancel
                  </button>
                </div>
              </div>
            </TerminalCard>
          )}
        </div>
      )}

      {/* Filter bar */}
      {target && notes.filter(n => n.target === target).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"
            className="bg-cyber-bg border border-cyber-border rounded px-3 py-1.5 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-cyan/40 w-44" />

          <div className="flex gap-1">
            {(['all', ...Object.keys(TYPE_STYLE)] as (NoteType | 'all')[]).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={clsx('font-mono text-[9px] px-2 py-1 rounded border transition-all capitalize',
                  filterType === t ? 'bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan' : 'border-cyber-border/60 text-cyber-muted hover:text-cyber-text')}>
                {t === 'all' ? 'All' : TYPE_STYLE[t as NoteType].label}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            {(['all','critical','high','medium','low','info'] as (Severity | 'all')[]).map(s => (
              <button key={s} onClick={() => setFilterSev(s)}
                className={clsx('font-mono text-[9px] px-2 py-1 rounded border transition-all capitalize',
                  filterSev === s ? 'bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan' : 'border-cyber-border/60 text-cyber-muted hover:text-cyber-text')}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {target && grouped.length > 0 && (
        <TerminalCard title={`Timeline — ${target} (${targetNotes.length} note${targetNotes.length !== 1 ? 's' : ''})`} label="TIMELINE" accent="none">
          <div className="space-y-4">
            {grouped.map(([date, dateNotes]) => (
              <div key={date}>
                <p className="font-mono text-[9px] text-cyber-muted uppercase tracking-widest mb-2">{date}</p>
                <div>
                  {dateNotes.map(n => <NoteCard key={n.id} note={n} onDelete={() => deleteNote(n.id)} />)}
                </div>
              </div>
            ))}
          </div>
        </TerminalCard>
      )}

      {target && grouped.length === 0 && notes.filter(n => n.target === target).length > 0 && (
        <div className="font-mono text-xs text-cyber-muted px-2">No notes match the current filters.</div>
      )}

      {target && notes.filter(n => n.target === target).length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <NotebookPen size={28} className="text-cyber-border" />
          <p className="font-mono text-xs text-cyber-muted">No notes yet for <span className="text-cyber-cyan">{target}</span></p>
          <p className="font-mono text-[10px] text-cyber-muted">Use the form above to add your first note.</p>
        </div>
      )}

      {!target && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <NotebookPen size={28} className="text-cyber-border" />
          <p className="font-mono text-xs text-cyber-muted">Enter a target above to view or add notes.</p>
          {allTargets.length > 0 && (
            <div className="flex gap-1.5 flex-wrap justify-center mt-2">
              {allTargets.map(t => (
                <button key={t} onClick={() => setTarget(t)}
                  className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-cyan hover:border-cyber-cyan/30 rounded transition-all">
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
