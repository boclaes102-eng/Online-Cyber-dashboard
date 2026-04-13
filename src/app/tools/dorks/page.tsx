'use client'
import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'

interface DorkFields {
  site: string; inurl: string; intitle: string; intext: string; filetype: string
  ext: string; before: string; after: string; extra: string
}

const TEMPLATES = [
  { label: 'Admin panels',     fields: { inurl: 'admin login', site: '', intitle: '', intext: '', filetype: '', ext: '', before: '', after: '', extra: '' } },
  { label: 'Exposed env files', fields: { filetype: 'env', intitle: '', inurl: '', intext: '', site: '', ext: '', before: '', after: '', extra: '' } },
  { label: 'Config files',     fields: { filetype: 'conf', inurl: 'config', intitle: '', intext: '', site: '', ext: '', before: '', after: '', extra: '' } },
  { label: 'SQL dumps',        fields: { filetype: 'sql', inurl: '', intitle: '', intext: '', site: '', ext: '', before: '', after: '', extra: '' } },
  { label: 'Open directories', fields: { intitle: 'index of', inurl: '', intext: '', filetype: '', site: '', ext: '', before: '', after: '', extra: '' } },
  { label: 'Login pages',      fields: { intitle: 'login', inurl: 'login', intext: '', filetype: '', site: '', ext: '', before: '', after: '', extra: '' } },
  { label: 'Camera feeds',     fields: { intitle: 'webcam', inurl: '', intext: '', filetype: '', site: '', ext: '', before: '', after: '', extra: '' } },
  { label: 'WordPress xmlrpc', fields: { inurl: 'xmlrpc.php', filetype: '', intitle: '', intext: '', site: '', ext: '', before: '', after: '', extra: '' } },
]

const EMPTY: DorkFields = { site:'', inurl:'', intitle:'', intext:'', filetype:'', ext:'', before:'', after:'', extra:'' }

function buildDork(f: DorkFields): string {
  const parts: string[] = []
  if (f.site)     parts.push(`site:${f.site}`)
  if (f.inurl)    parts.push(`inurl:${f.inurl.includes(' ') ? `"${f.inurl}"` : f.inurl}`)
  if (f.intitle)  parts.push(`intitle:${f.intitle.includes(' ') ? `"${f.intitle}"` : f.intitle}`)
  if (f.intext)   parts.push(`intext:${f.intext.includes(' ') ? `"${f.intext}"` : f.intext}`)
  if (f.filetype) parts.push(`filetype:${f.filetype}`)
  if (f.ext)      parts.push(`ext:${f.ext}`)
  if (f.before)   parts.push(`before:${f.before}`)
  if (f.after)    parts.push(`after:${f.after}`)
  if (f.extra)    parts.push(f.extra)
  return parts.join(' ')
}

const FIELDS: { key: keyof DorkFields; label: string; placeholder: string }[] = [
  { key:'site',     label:'site:',     placeholder:'example.com' },
  { key:'inurl',    label:'inurl:',    placeholder:'admin login' },
  { key:'intitle',  label:'intitle:',  placeholder:'index of' },
  { key:'intext',   label:'intext:',   placeholder:'password' },
  { key:'filetype', label:'filetype:', placeholder:'pdf' },
  { key:'ext',      label:'ext:',      placeholder:'sql' },
  { key:'before',   label:'before:',   placeholder:'2023-01-01' },
  { key:'after',    label:'after:',    placeholder:'2020-01-01' },
  { key:'extra',    label:'custom:',   placeholder:'intitle:"camera" OR "webcam"' },
]

export default function DorksPage() {
  const [fields, setFields] = useState<DorkFields>(EMPTY)
  const [copied, setCopied] = useState(false)

  const dork = buildDork(fields)

  function set(key: keyof DorkFields, val: string) {
    setFields(f => ({ ...f, [key]: val }))
  }

  function copy() {
    if (!dork) return
    navigator.clipboard.writeText(dork)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  function openGoogle() {
    if (!dork) return
    window.open(`https://www.google.com/search?q=${encodeURIComponent(dork)}`, '_blank', 'noopener')
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">Google Dork Builder</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Build advanced Google search operators — no API needed</p>
      </div>

      {/* Templates */}
      <div>
        <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase mb-2">Quick Templates</p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map(t => (
            <button key={t.label} onClick={() => setFields(t.fields as DorkFields)}
              className="px-2.5 py-1 font-mono text-[10px] text-cyber-muted border border-cyber-border rounded hover:text-cyber-cyan hover:border-cyber-cyan/30 transition-colors">
              {t.label}
            </button>
          ))}
          <button onClick={() => setFields(EMPTY)}
            className="px-2.5 py-1 font-mono text-[10px] text-red-400 border border-red-500/20 rounded hover:border-red-500/40 transition-colors">
            Clear
          </button>
        </div>
      </div>

      {/* Operator inputs */}
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label className="font-mono text-[10px] text-cyber-cyan tracking-widest uppercase block mb-1">{f.label}</label>
            <input value={fields[f.key]} onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full bg-cyber-bg border border-cyber-border rounded px-3 py-1.5 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
            />
          </div>
        ))}
      </div>

      {/* Preview */}
      <div>
        <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase mb-2">Generated Dork</p>
        <div className="bg-cyber-bg border border-cyber-border rounded-lg px-4 py-3 min-h-[48px] flex items-center">
          {dork
            ? <p className="font-mono text-sm text-cyber-cyan break-all flex-1">{dork}</p>
            : <p className="font-mono text-xs text-cyber-muted italic">Fill in operators above to build your dork</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={copy} disabled={!dork}
          className="flex-1 flex items-center justify-center gap-2 py-2 font-mono text-xs text-cyber-muted border border-cyber-border rounded hover:text-cyber-cyan hover:border-cyber-cyan/30 disabled:opacity-40 transition-all">
          {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Dork</>}
        </button>
        <button onClick={openGoogle} disabled={!dork}
          className="flex-1 flex items-center justify-center gap-2 py-2 font-mono text-xs text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/30 rounded hover:bg-cyber-cyan/20 disabled:opacity-40 transition-all">
          <ExternalLink size={12} /> Open in Google
        </button>
      </div>
    </div>
  )
}
