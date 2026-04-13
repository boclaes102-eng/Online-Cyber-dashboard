'use client'
import { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import { clsx } from 'clsx'

type AV = 'N'|'A'|'L'|'P'
type AC = 'L'|'H'
type PR = 'N'|'L'|'H'
type UI = 'N'|'R'
type SC = 'U'|'C'
type CIA = 'N'|'L'|'H'

interface Metrics { av: AV; ac: AC; pr: PR; ui: UI; s: SC; c: CIA; i: CIA; a: CIA }

const DEFAULTS: Metrics = { av:'N', ac:'L', pr:'N', ui:'N', s:'U', c:'N', i:'N', a:'N' }

function roundUp(n: number): number {
  const i = Math.round(n * 100000)
  return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10
}

function calcCvss(m: Metrics): { score: number; severity: string; vector: string } {
  const AV = ({N:0.85,A:0.62,L:0.55,P:0.2} as Record<AV,number>)[m.av]
  const AC = ({L:0.77,H:0.44} as Record<AC,number>)[m.ac]
  const PR = m.s === 'C'
    ? ({N:0.85,L:0.50,H:0.50} as Record<PR,number>)[m.pr]
    : ({N:0.85,L:0.62,H:0.27} as Record<PR,number>)[m.pr]
  const UI = ({N:0.85,R:0.62} as Record<UI,number>)[m.ui]
  const C  = ({N:0.00,L:0.22,H:0.56} as Record<CIA,number>)[m.c]
  const I  = ({N:0.00,L:0.22,H:0.56} as Record<CIA,number>)[m.i]
  const A  = ({N:0.00,L:0.22,H:0.56} as Record<CIA,number>)[m.a]

  const ISC = 1 - (1-C)*(1-I)*(1-A)
  const impact = m.s === 'U'
    ? 6.42 * ISC
    : 7.52*(ISC-0.029) - 3.25*Math.pow(ISC-0.02, 15)
  const exploit = 8.22 * AV * AC * PR * UI

  let score = 0
  if (impact > 0) {
    score = m.s === 'U'
      ? roundUp(Math.min(impact + exploit, 10))
      : roundUp(Math.min(1.08*(impact + exploit), 10))
  }

  const severity = score === 0 ? 'None' : score < 4 ? 'Low' : score < 7 ? 'Medium' : score < 9 ? 'High' : 'Critical'
  const vector = `CVSS:3.1/AV:${m.av}/AC:${m.ac}/PR:${m.pr}/UI:${m.ui}/S:${m.s}/C:${m.c}/I:${m.i}/A:${m.a}`
  return { score, severity, vector }
}

const SEV_STYLE: Record<string, string> = {
  None:     'text-cyber-muted border-cyber-border',
  Low:      'text-green-400 border-green-500/40 bg-green-500/10',
  Medium:   'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
  High:     'text-orange-400 border-orange-500/40 bg-orange-500/10',
  Critical: 'text-red-400 border-red-500/40 bg-red-500/10',
}

type Field = { key: keyof Metrics; label: string; options: { val: string; label: string; desc: string }[] }

const FIELDS: Field[] = [
  { key:'av', label:'Attack Vector',       options:[{val:'N',label:'Network',desc:'Exploitable remotely'},{val:'A',label:'Adjacent',desc:'Local network required'},{val:'L',label:'Local',desc:'Local access required'},{val:'P',label:'Physical',desc:'Physical access required'}] },
  { key:'ac', label:'Attack Complexity',   options:[{val:'L',label:'Low',desc:'No special conditions'},{val:'H',label:'High',desc:'Special conditions exist'}] },
  { key:'pr', label:'Privileges Required', options:[{val:'N',label:'None',desc:'No prior access'},{val:'L',label:'Low',desc:'Basic user privileges'},{val:'H',label:'High',desc:'Admin privileges'}] },
  { key:'ui', label:'User Interaction',    options:[{val:'N',label:'None',desc:'No user needed'},{val:'R',label:'Required',desc:'User must take action'}] },
  { key:'s',  label:'Scope',               options:[{val:'U',label:'Unchanged',desc:'Impact within same component'},{val:'C',label:'Changed',desc:'Impact on other components'}] },
  { key:'c',  label:'Confidentiality',     options:[{val:'N',label:'None',desc:'No data exposure'},{val:'L',label:'Low',desc:'Limited data exposure'},{val:'H',label:'High',desc:'Total data disclosure'}] },
  { key:'i',  label:'Integrity',           options:[{val:'N',label:'None',desc:'No data modification'},{val:'L',label:'Low',desc:'Limited modification'},{val:'H',label:'High',desc:'Total integrity loss'}] },
  { key:'a',  label:'Availability',        options:[{val:'N',label:'None',desc:'No impact'},{val:'L',label:'Low',desc:'Reduced performance'},{val:'H',label:'High',desc:'Complete denial of service'}] },
]

export default function CvssPage() {
  const [metrics, setMetrics] = useState<Metrics>(DEFAULTS)
  const [copied, setCopied]   = useState(false)
  const { score, severity, vector } = calcCvss(metrics)

  function copy() {
    navigator.clipboard.writeText(vector)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">CVSS v3.1 Calculator</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Interactive CVSS v3.1 vector builder — score updates in real time</p>
      </div>

      {/* Score display */}
      <div className="flex items-center gap-6 bg-cyber-surface border border-cyber-border rounded-lg p-4">
        <div className={clsx('w-24 h-24 rounded-lg border-2 flex flex-col items-center justify-center', SEV_STYLE[severity])}>
          <p className="font-mono text-3xl font-bold">{score.toFixed(1)}</p>
          <p className="font-mono text-[9px] tracking-widest uppercase mt-0.5">{severity}</p>
        </div>
        <div className="flex-1">
          <div className="w-full h-2 bg-cyber-bg rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(score/10)*100}%`,
                background: score === 0 ? '#555' : score < 4 ? '#22c55e' : score < 7 ? '#eab308' : score < 9 ? '#f97316' : '#ef4444',
              }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="font-mono text-[10px] text-cyber-muted break-all">{vector}</p>
            <button onClick={copy} className="flex items-center gap-1 font-mono text-[10px] text-cyber-cyan hover:text-cyber-text ml-2 flex-none">
              {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
            </button>
          </div>
        </div>
      </div>

      {/* Metric buttons */}
      <div className="space-y-4">
        {FIELDS.map(f => (
          <div key={f.key} className="bg-cyber-surface border border-cyber-border rounded-lg p-4">
            <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase mb-2">{f.label}</p>
            <div className="flex flex-wrap gap-2">
              {f.options.map(o => (
                <button key={o.val}
                  onClick={() => setMetrics(m => ({ ...m, [f.key]: o.val }))}
                  title={o.desc}
                  className={clsx('px-3 py-1.5 font-mono text-xs rounded border transition-all', metrics[f.key] === o.val
                    ? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30'
                    : 'text-cyber-muted border-cyber-border hover:text-cyber-text hover:border-cyber-text/20')}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setMetrics(DEFAULTS)}
        className="w-full py-2 font-mono text-xs text-cyber-muted border border-cyber-border rounded hover:text-cyber-text hover:border-cyber-text/20 transition-all">
        Reset to defaults
      </button>
    </div>
  )
}
