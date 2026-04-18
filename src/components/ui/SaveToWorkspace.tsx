'use client'

import { useState } from 'react'
import { Save, Check, AlertTriangle, Loader2 } from 'lucide-react'

type ReconTool =
  | 'ip' | 'domain' | 'subdomains' | 'ssl' | 'headers' | 'portscan'
  | 'dns' | 'reverseip' | 'asn' | 'whoishistory' | 'certs' | 'traceroute'
  | 'url' | 'email' | 'ioc' | 'shodan' | 'tech' | 'waf' | 'cors'

interface Props {
  tool:    ReconTool
  target:  string
  results: Record<string, unknown>
  summary: Record<string, unknown>
  tags?:   string[]
}

type State = 'idle' | 'saving' | 'saved' | 'error'

export default function SaveToWorkspace({ tool, target, results, summary, tags = [] }: Props) {
  const [state, setState] = useState<State>('idle')

  async function save() {
    setState('saving')
    try {
      const res = await fetch('/api/monitor/recon-sessions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tool, target, results, summary, tags }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setState('saved')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  if (state === 'saved') {
    return (
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyber-green border border-cyber-green/30 bg-cyber-green/5 rounded px-3 py-1.5">
        <Check size={12} />
        Saved to Workspace
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyber-red border border-cyber-red/30 bg-cyber-red/5 rounded px-3 py-1.5">
        <AlertTriangle size={12} />
        Save failed — check backend connection
      </div>
    )
  }

  return (
    <button
      onClick={save}
      disabled={state === 'saving'}
      className="flex items-center gap-1.5 font-mono text-[11px] text-cyber-cyan border border-cyber-cyan/30 bg-cyber-cyan/5 hover:bg-cyber-cyan/10 rounded px-3 py-1.5 transition-colors disabled:opacity-50"
    >
      {state === 'saving' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
      Save to Workspace
    </button>
  )
}
