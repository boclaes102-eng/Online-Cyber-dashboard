'use client'
import { useState } from 'react'
import { Copy, Check, ArrowLeftRight } from 'lucide-react'
import { clsx } from 'clsx'

type Mode = 'base64' | 'url' | 'hex' | 'html' | 'rot13' | 'unicode' | 'binary'

const MODES: { id: Mode; label: string }[] = [
  { id: 'base64',  label: 'Base64'   },
  { id: 'url',     label: 'URL'      },
  { id: 'hex',     label: 'Hex'      },
  { id: 'html',    label: 'HTML Entities' },
  { id: 'rot13',   label: 'ROT13'    },
  { id: 'unicode', label: 'Unicode'  },
  { id: 'binary',  label: 'Binary'   },
]

function encode(text: string, mode: Mode): string {
  try {
    switch (mode) {
      case 'base64':  return btoa(unescape(encodeURIComponent(text)))
      case 'url':     return encodeURIComponent(text)
      case 'hex':     return [...new TextEncoder().encode(text)].map(b => b.toString(16).padStart(2, '0')).join(' ')
      case 'html':    return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c))
      case 'rot13':   return text.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13)))
      case 'unicode': return [...text].map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`).join('')
      case 'binary':  return [...new TextEncoder().encode(text)].map(b => b.toString(2).padStart(8,'0')).join(' ')
    }
  } catch { return 'Encoding error' }
}

function decode(text: string, mode: Mode): string {
  try {
    switch (mode) {
      case 'base64':  return decodeURIComponent(escape(atob(text.trim())))
      case 'url':     return decodeURIComponent(text)
      case 'hex':     return new TextDecoder().decode(new Uint8Array(text.trim().split(/\s+/).map(h => parseInt(h, 16))))
      case 'html':    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, e => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[e] ?? e))
      case 'rot13':   return encode(text, 'rot13') // symmetric
      case 'unicode': return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      case 'binary':  return new TextDecoder().decode(new Uint8Array(text.trim().split(/\s+/).map(b => parseInt(b, 2))))
    }
  } catch { return 'Decode error — check input format' }
}

export default function EncoderPage() {
  const [mode, setMode]     = useState<Mode>('base64')
  const [input, setInput]   = useState('')
  const [output, setOutput] = useState('')
  const [dir, setDir]       = useState<'encode' | 'decode'>('encode')
  const [copied, setCopied] = useState(false)

  function run() {
    setOutput(dir === 'encode' ? encode(input, mode) : decode(input, mode))
  }

  function swap() {
    setInput(output)
    setOutput('')
    setDir(d => d === 'encode' ? 'decode' : 'encode')
  }

  function copy() {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">Encoder / Decoder</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Base64, URL, Hex, HTML entities, ROT13, Unicode, Binary — all in one place</p>
      </div>

      {/* Mode selector */}
      <div className="flex flex-wrap gap-1.5">
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setOutput('') }}
            className={clsx('px-3 py-1.5 font-mono text-xs rounded border transition-all', mode === m.id
              ? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30'
              : 'text-cyber-muted border-cyber-border hover:text-cyber-text hover:border-cyber-text/20')}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Direction toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => { setDir('encode'); setOutput('') }}
          className={clsx('px-3 py-1.5 font-mono text-xs rounded border transition-all',
            dir === 'encode' ? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30' : 'text-cyber-muted border-cyber-border hover:text-cyber-text')}>
          Encode
        </button>
        <button onClick={swap} className="text-cyber-muted hover:text-cyber-cyan transition-colors p-1" title="Swap & reverse direction">
          <ArrowLeftRight size={14} />
        </button>
        <button onClick={() => { setDir('decode'); setOutput('') }}
          className={clsx('px-3 py-1.5 font-mono text-xs rounded border transition-all',
            dir === 'decode' ? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30' : 'text-cyber-muted border-cyber-border hover:text-cyber-text')}>
          Decode
        </button>
      </div>

      {/* Input */}
      <div>
        <label className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase block mb-1.5">Input</label>
        <textarea value={input} onChange={e => { setInput(e.target.value); setOutput('') }}
          rows={5} placeholder={dir === 'encode' ? 'Enter text to encode...' : 'Enter encoded text to decode...'}
          className="w-full bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60 resize-none"
        />
      </div>

      <button onClick={run} disabled={!input.trim()}
        className="w-full py-2 bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 rounded font-mono text-xs text-cyber-cyan disabled:opacity-40 transition-all tracking-widest uppercase">
        {dir === 'encode' ? `Encode → ${MODES.find(m => m.id === mode)?.label}` : `Decode from ${MODES.find(m => m.id === mode)?.label}`}
      </button>

      {/* Output */}
      {output && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">Output</label>
            <button onClick={copy}
              className="flex items-center gap-1 font-mono text-[10px] text-cyber-cyan hover:text-cyber-text transition-colors">
              {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
            </button>
          </div>
          <div className="bg-cyber-bg border border-cyber-border rounded px-3 py-3">
            <p className="font-mono text-xs text-cyber-text-hi break-all whitespace-pre-wrap">{output}</p>
          </div>
        </div>
      )}
    </div>
  )
}
