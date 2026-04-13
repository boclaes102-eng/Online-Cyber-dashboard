'use client'
import { useState } from 'react'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

type TokenType = 'uuid' | 'hex32' | 'hex64' | 'base64' | 'passphrase' | 'pin' | 'apikey'

const WORDS = ['alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india','juliet','kilo','lima','mike','november','oscar','papa','quebec','romeo','sierra','tango','uniform','victor','whiskey','xray','yankee','zulu','cyber','nexus','proxy','vault','shield','ghost','phantom','cipher','falcon','vector','matrix','binary','kernel','sigma','delta','omega','apex','nova','orbit','pulse','quartz','rogue','solar','titan','ultra','vortex','warden','xenon']

const DESCRIPTIONS: Record<TokenType, string> = {
  uuid:       'UUID v4 — universally unique identifier (RFC 4122)',
  hex32:      '32-byte random hex — 256-bit entropy',
  hex64:      '64-byte random hex — 512-bit entropy',
  base64:     '32-byte random Base64url — compact API token',
  passphrase: '5 random words — human-readable, high entropy',
  pin:        '8-digit random PIN — numeric only',
  apikey:     'ck_ prefixed API key — similar to Stripe/Clerk format',
}

function generate(type: TokenType): string {
  const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n))
  const hex = (n: number) => [...rand(n)].map(b => b.toString(16).padStart(2,'0')).join('')

  switch (type) {
    case 'uuid': {
      const b = rand(16)
      b[6] = (b[6] & 0x0f) | 0x40
      b[8] = (b[8] & 0x3f) | 0x80
      const h = [...b].map(x => x.toString(16).padStart(2,'0'))
      return `${h.slice(0,4).join('')}-${h.slice(4,6).join('')}-${h.slice(6,8).join('')}-${h.slice(8,10).join('')}-${h.slice(10).join('')}`
    }
    case 'hex32':      return hex(32)
    case 'hex64':      return hex(64)
    case 'base64': {
      const b = rand(32)
      return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
    }
    case 'passphrase': {
      const a = new Uint32Array(5)
      crypto.getRandomValues(a)
      return [...a].map(n => WORDS[n % WORDS.length]).join('-')
    }
    case 'pin': {
      const a = new Uint32Array(8)
      crypto.getRandomValues(a)
      return [...a].map(n => n % 10).join('')
    }
    case 'apikey':
      return `ck_${hex(24)}`
  }
}

const TYPES: { id: TokenType; label: string }[] = [
  { id:'uuid',       label:'UUID v4'      },
  { id:'hex32',      label:'Hex 256-bit'  },
  { id:'hex64',      label:'Hex 512-bit'  },
  { id:'base64',     label:'Base64url'    },
  { id:'passphrase', label:'Passphrase'   },
  { id:'pin',        label:'PIN (8-digit)'},
  { id:'apikey',     label:'API Key'      },
]

export default function TokensPage() {
  const [type, setType]     = useState<TokenType>('uuid')
  const [token, setToken]   = useState('')
  const [bulk, setBulk]     = useState<string[]>([])
  const [count, setCount]   = useState(5)
  const [copied, setCopied] = useState('')

  function gen() {
    setToken(generate(type))
    setBulk([])
  }

  function genBulk() {
    setBulk(Array.from({ length: count }, () => generate(type)))
    setToken('')
  }

  function copy(val: string) {
    navigator.clipboard.writeText(val)
    setCopied(val); setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">Secure Token Generator</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Generate UUIDs, random hex keys, API tokens and passphrases — uses crypto.getRandomValues</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TYPES.map(t => (
          <button key={t.id} onClick={() => { setType(t.id); setToken(''); setBulk([]) }}
            className={clsx('px-3 py-1.5 font-mono text-xs rounded border transition-all', type === t.id
              ? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30'
              : 'text-cyber-muted border-cyber-border hover:text-cyber-text hover:border-cyber-text/20')}>
            {t.label}
          </button>
        ))}
      </div>

      <p className="font-mono text-[10px] text-cyber-muted">{DESCRIPTIONS[type]}</p>

      <div className="flex gap-3">
        <button onClick={gen}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 rounded font-mono text-xs text-cyber-cyan transition-all">
          <RefreshCw size={13} /> Generate One
        </button>
        <div className="flex items-center gap-2">
          <input type="number" value={count} onChange={e => setCount(Math.max(1, Math.min(50, +e.target.value)))}
            className="w-16 bg-cyber-bg border border-cyber-border rounded px-2 py-2 font-mono text-xs text-cyber-text text-center focus:outline-none focus:border-cyber-cyan/60"
          />
          <button onClick={genBulk}
            className="px-4 py-2.5 font-mono text-xs text-cyber-muted border border-cyber-border rounded hover:text-cyber-text hover:border-cyber-text/20 transition-all">
            Bulk
          </button>
        </div>
      </div>

      {token && (
        <div className="bg-cyber-surface border border-cyber-border rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-sm text-cyber-cyan break-all">{token}</p>
            <button onClick={() => copy(token)}
              className="flex-none text-cyber-muted hover:text-cyber-cyan transition-colors">
              {copied === token ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {bulk.length > 0 && (
        <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-cyber-border flex items-center justify-between">
            <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">{bulk.length} Tokens</p>
            <button onClick={() => copy(bulk.join('\n'))}
              className="flex items-center gap-1 font-mono text-[10px] text-cyber-cyan hover:text-cyber-text">
              {copied === bulk.join('\n') ? <><Check size={10} /> Copied all</> : <><Copy size={10} /> Copy all</>}
            </button>
          </div>
          <div className="divide-y divide-cyber-border max-h-80 overflow-y-auto">
            {bulk.map((t, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2 group hover:bg-cyber-cyan/5">
                <p className="font-mono text-xs text-cyber-text break-all">{t}</p>
                <button onClick={() => copy(t)}
                  className="flex-none ml-3 text-cyber-muted group-hover:text-cyber-cyan transition-colors">
                  {copied === t ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
