'use client'

import { useState, useMemo, useCallback } from 'react'
import { Regex, Copy, Check, ChevronDown } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import { clsx } from 'clsx'

// ─── Presets ──────────────────────────────────────────────────────────────────
interface Preset {
  label: string
  pattern: string
  flags: string
  desc: string
}

const PRESET_CATEGORIES: { name: string; presets: Preset[] }[] = [
  {
    name: 'Network / IOC',
    presets: [
      { label: 'IPv4 Address',   flags: 'g',  desc: 'Match dotted-quad IPv4 addresses',
        pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b' },
      { label: 'IPv6 Address',   flags: 'gi', desc: 'Match full or compressed IPv6 addresses',
        pattern: '(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}' },
      { label: 'Domain / FQDN',  flags: 'gi', desc: 'Match hostnames and fully-qualified domain names',
        pattern: '\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}\\b' },
      { label: 'URL (HTTP/S)',   flags: 'gi', desc: 'Match http and https URLs',
        pattern: 'https?://[^\\s<>"{}\\\\|^`\\[\\]\']+' },
      { label: 'IP:Port',        flags: 'g',  desc: 'Match IP address with port number',
        pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}:\\d{1,5}\\b' },
      { label: 'MAC Address',    flags: 'gi', desc: 'Match Ethernet MAC addresses (colon or dash separated)',
        pattern: '\\b(?:[0-9A-Fa-f]{2}[:\\-]){5}[0-9A-Fa-f]{2}\\b' },
      { label: 'Email Address',  flags: 'gi', desc: 'Match RFC-5321 email addresses',
        pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}' },
    ],
  },
  {
    name: 'Hashes / Crypto',
    presets: [
      { label: 'MD5 Hash',    flags: 'gi', desc: '32 hex chars',
        pattern: '\\b[0-9a-fA-F]{32}\\b' },
      { label: 'SHA1 Hash',   flags: 'gi', desc: '40 hex chars',
        pattern: '\\b[0-9a-fA-F]{40}\\b' },
      { label: 'SHA256 Hash', flags: 'gi', desc: '64 hex chars',
        pattern: '\\b[0-9a-fA-F]{64}\\b' },
      { label: 'SHA512 Hash', flags: 'gi', desc: '128 hex chars',
        pattern: '\\b[0-9a-fA-F]{128}\\b' },
      { label: 'JWT Token',   flags: 'g',  desc: 'Base64url-encoded JWT (three dot-separated parts)',
        pattern: 'eyJ[A-Za-z0-9_\\-]{10,}\\.eyJ[A-Za-z0-9_\\-]{10,}\\.[A-Za-z0-9_\\-]{20,}' },
      { label: 'Base64',      flags: 'g',  desc: 'Base64-encoded blocks (≥8 chars)',
        pattern: '(?:[A-Za-z0-9+/]{4}){2,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?' },
    ],
  },
  {
    name: 'Attack Patterns',
    presets: [
      { label: 'SQL Injection',   flags: 'gi', desc: 'Common SQL injection markers',
        pattern: "(?:'\\s*(?:OR|AND)\\s*['\"]?\\d|\\bUNION\\b.*\\bSELECT\\b|\\bDROP\\b\\s+\\bTABLE\\b|\\bINSERT\\b\\s+\\bINTO\\b|;\\s*--)" },
      { label: 'XSS Patterns',    flags: 'gi', desc: 'Script tags, event handlers, javascript: URIs',
        pattern: '<script[\\s\\S]*?>|javascript\\s*:|\\bon\\w+\\s*=|<img[^>]+src\\s*=' },
      { label: 'Path Traversal',  flags: 'gi', desc: '../ sequences and URL-encoded variants',
        pattern: '(?:\\.\\.[\\/\\\\]|%2e%2e%2f|%252e%252e%252f|\\.\\.\\.[\\/\\\\])+' },
      { label: 'Cmd Injection',   flags: 'gi', desc: 'Shell metacharacters and common injection sinks',
        pattern: '[;|&`$](?:\\s*\\w)|\\b(?:exec|system|shell_exec|passthru|eval|popen)\\s*\\(' },
      { label: 'SSRF Targets',    flags: 'gi', desc: 'Common SSRF internal target patterns',
        pattern: '(?:169\\.254\\.169\\.254|metadata\\.google\\.internal|localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|\\[::1\\])' },
      { label: 'Open Redirect',   flags: 'gi', desc: 'Common redirect parameter names',
        pattern: '[?&](?:redirect|return|next|url|to|goto|destination|forward|callback|continue|redir)=' },
    ],
  },
  {
    name: 'Log Analysis',
    presets: [
      { label: 'Apache Access Log', flags: 'gm', desc: 'Standard Apache combined log format line',
        pattern: '^(\\S+) \\S+ (\\S+) \\[([^\\]]+)\\] "(\\w+ [^"]*)" (\\d{3}) (\\S+)' },
      { label: 'Nginx Error Log',   flags: 'g',  desc: 'Nginx error log timestamp',
        pattern: '\\d{4}/\\d{2}/\\d{2} \\d{2}:\\d{2}:\\d{2} \\[\\w+\\] \\d+#\\d+:' },
      { label: 'Syslog Line',       flags: 'gm', desc: 'Standard syslog format',
        pattern: '^\\w{3}\\s+\\d{1,2} \\d{2}:\\d{2}:\\d{2} (\\S+) (\\S+)(?:\\[(\\d+)\\])?: ' },
      { label: 'HTTP Status 4xx/5xx', flags: 'g', desc: 'Client and server error status codes in logs',
        pattern: '" [45]\\d{2} ' },
      { label: 'Timestamp (ISO 8601)', flags: 'g', desc: 'ISO 8601 date-time strings',
        pattern: '\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:?\\d{2})?' },
      { label: 'Windows Event ID',  flags: 'gi', desc: 'Windows security event IDs',
        pattern: 'EventID(?:\\s*:|\\s*=)\\s*(\\d{4,5})' },
    ],
  },
  {
    name: 'Threat Intel / CVE',
    presets: [
      { label: 'CVE ID',          flags: 'gi', desc: 'CVE identifier (CVE-YYYY-NNNNN)',
        pattern: 'CVE-\\d{4}-\\d{4,7}' },
      { label: 'MITRE ATT&CK',    flags: 'g',  desc: 'ATT&CK technique IDs (T1059 or T1059.001)',
        pattern: '\\bT\\d{4}(?:\\.\\d{3})?\\b' },
      { label: 'CWE ID',          flags: 'gi', desc: 'Common Weakness Enumeration IDs',
        pattern: '\\bCWE-\\d{1,4}\\b' },
      { label: 'CAPEC ID',        flags: 'gi', desc: 'Common Attack Pattern IDs',
        pattern: '\\bCAPEC-\\d{1,4}\\b' },
    ],
  },
  {
    name: 'Secrets / DLP',
    presets: [
      { label: 'AWS Access Key',    flags: 'g',  desc: 'AWS IAM access key ID',
        pattern: '\\bAKIA[0-9A-Z]{16}\\b' },
      { label: 'Private Key Block', flags: 'gm', desc: 'PEM private key header',
        pattern: '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----' },
      { label: 'Credit Card',       flags: 'g',  desc: 'Visa, Mastercard, Amex, Discover (no Luhn check)',
        pattern: '\\b(?:4[0-9]{12,15}|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b' },
      { label: 'US SSN',            flags: 'g',  desc: 'Social Security Number (NNN-NN-NNNN)',
        pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b' },
      { label: 'Generic API Key',   flags: 'gi', desc: 'Common secret/key/token assignment patterns',
        pattern: '(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)["\']?\\s*[:=]\\s*["\']?([\\w\\-./+]{16,})' },
    ],
  },
]

const DEFAULT_TEST = `192.168.1.105 - admin [12/Nov/2024:13:55:36 +0000] "GET /api/users?id=1' OR 1=1-- HTTP/1.1" 200 1234
User: john@example.com visited https://malware-c2.ru/beacon?redirect=https://evil.com
File hash: d41d8cd98f00b204e9800998ecf8427e (MD5 empty file)
JWT: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMSJ9.dGhpcyBpcyBhIHRlc3Q
CVE-2021-44228 exploited via T1059.001 — Log4Shell RCE
AWS key leaked: AKIAIOSFODNN7EXAMPLE in commit
MAC: 00:1A:2B:3C:4D:5E  port 443 open at 10.0.0.1:443`

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface MatchResult {
  index: number
  length: number
  value: string
  groups: (string | undefined)[]
  groupNames: Record<string, string | undefined>
}

function runRegex(pattern: string, flags: string, text: string): MatchResult[] | string {
  if (!pattern) return []
  try {
    const re = new RegExp(pattern, flags)
    const matches: MatchResult[] = []
    if (flags.includes('g')) {
      let m: RegExpExecArray | null
      re.lastIndex = 0
      while ((m = re.exec(text)) !== null) {
        matches.push({
          index: m.index,
          length: m[0].length,
          value: m[0],
          groups: m.slice(1),
          groupNames: (m.groups ?? {}) as Record<string, string | undefined>,
        })
        if (m[0].length === 0) re.lastIndex++
        if (matches.length >= 500) break
      }
    } else {
      const m = re.exec(text)
      if (m) matches.push({
        index: m.index,
        length: m[0].length,
        value: m[0],
        groups: m.slice(1),
        groupNames: (m.groups ?? {}) as Record<string, string | undefined>,
      })
    }
    return matches
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid regex'
  }
}

// Build highlighted HTML (escaped) for the preview panel
function buildHighlighted(text: string, matches: MatchResult[]): React.ReactNode[] {
  if (!matches.length) return [<span key="all" className="whitespace-pre-wrap text-cyber-text">{text}</span>]
  const nodes: React.ReactNode[] = []
  let last = 0
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    if (m.index > last) {
      nodes.push(<span key={`t${i}`} className="whitespace-pre-wrap text-cyber-text">{text.slice(last, m.index)}</span>)
    }
    if (m.length > 0) {
      nodes.push(
        <mark key={`m${i}`} className="bg-cyber-cyan/25 text-cyber-cyan rounded-sm not-italic">{m.value}</mark>
      )
      last = m.index + m.length
    } else {
      last = m.index + 1
    }
  }
  if (last < text.length) nodes.push(<span key="tail" className="whitespace-pre-wrap text-cyber-text">{text.slice(last)}</span>)
  return nodes
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  function doCopy() {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <button onClick={doCopy} className="text-cyber-muted hover:text-cyber-cyan transition-colors p-0.5">
      {copied ? <Check size={11} className="text-cyber-green" /> : <Copy size={11} />}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const FLAG_INFO: { f: string; desc: string }[] = [
  { f: 'g', desc: 'Global — find all matches' },
  { f: 'i', desc: 'Case insensitive' },
  { f: 'm', desc: 'Multiline — ^ and $ match line boundaries' },
  { f: 's', desc: 'DotAll — . matches newlines' },
]

export default function RegexPage() {
  const [pattern, setPattern]       = useState('')
  const [flags, setFlags]           = useState('g')
  const [testText, setTestText]     = useState(DEFAULT_TEST)
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(false)
  const [showAll, setShowAll]       = useState(false)

  const toggleFlag = useCallback((f: string) => {
    setFlags(prev => prev.includes(f) ? prev.replace(f, '') : prev + f)
  }, [])

  function applyPreset(p: Preset) {
    setPattern(p.pattern)
    setFlags(p.flags)
    setShowPresets(false)
    setShowAll(false)
  }

  const result = useMemo(() => runRegex(pattern, flags, testText), [pattern, flags, testText])
  const isError   = typeof result === 'string'
  const matches   = isError ? [] : result
  const errMsg    = isError ? result : ''

  const validPattern  = pattern && !isError
  const highlighted   = useMemo(() => buildHighlighted(testText, matches), [testText, matches])

  const SHOW_LIMIT = 10
  const visibleMatches = showAll ? matches : matches.slice(0, SHOW_LIMIT)

  // unique match values for quick summary
  const uniqueVals = [...new Set(matches.map(m => m.value))].slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-cyan/30 flex items-center justify-center bg-cyber-cyan/5 flex-none">
          <Regex size={18} className="text-cyber-cyan" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Regex Tester</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Live regex tester with security-focused presets for log analysis, IOC extraction, and WAF rule writing.
          </p>
        </div>
      </div>

      {/* Pattern input */}
      <TerminalCard title="Pattern" label="REGEX" accent="cyan">
        <div className="space-y-3">
          {/* Pattern */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-cyber-muted text-sm select-none">/</span>
            <input
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder="Enter pattern…"
              spellCheck={false}
              className={clsx(
                'flex-1 bg-cyber-bg border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none transition-colors',
                isError && pattern ? 'border-cyber-red/50 focus:border-cyber-red/60'
                  : validPattern  ? 'border-cyber-cyan/40 focus:border-cyber-cyan/60'
                  : 'border-cyber-border focus:border-cyber-cyan/50',
              )}
            />
            <span className="font-mono text-cyber-muted text-sm select-none">/{flags}</span>
            {pattern && <CopyBtn value={`/${pattern}/${flags}`} />}
          </div>

          {isError && pattern && (
            <p className="font-mono text-[10px] text-cyber-red">{errMsg}</p>
          )}

          {/* Flags */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-cyber-muted">Flags:</span>
            {FLAG_INFO.map(({ f, desc }) => (
              <button
                key={f}
                onClick={() => toggleFlag(f)}
                title={desc}
                className={clsx(
                  'font-mono text-[10px] w-6 h-6 rounded border transition-all',
                  flags.includes(f)
                    ? 'bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan'
                    : 'border-cyber-border/60 text-cyber-muted hover:border-cyber-border',
                )}
              >
                {f}
              </button>
            ))}
            <span className="font-mono text-[9px] text-cyber-muted ml-1">hover flags for description</span>
          </div>

          {/* Preset picker */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(v => !v)}
              className="flex items-center gap-1.5 font-mono text-[10px] text-cyber-muted hover:text-cyber-cyan transition-colors border border-cyber-border/60 hover:border-cyber-cyan/30 rounded px-2.5 py-1.5"
            >
              Security Presets
              <ChevronDown size={10} className={clsx('transition-transform', showPresets && 'rotate-180')} />
            </button>

            {showPresets && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-cyber-card border border-cyber-border rounded-md shadow-lg w-80 max-h-96 overflow-y-auto">
                {PRESET_CATEGORIES.map(cat => (
                  <div key={cat.name}>
                    <button
                      onClick={() => setSelectedCat(c => c === cat.name ? null : cat.name)}
                      className="w-full flex items-center justify-between px-3 py-2 font-mono text-[10px] text-cyber-muted hover:text-cyber-cyan hover:bg-cyber-surface/50 transition-colors border-b border-cyber-border/40"
                    >
                      {cat.name}
                      <ChevronDown size={9} className={clsx('transition-transform', selectedCat === cat.name && 'rotate-180')} />
                    </button>
                    {selectedCat === cat.name && (
                      <div className="bg-cyber-bg/50">
                        {cat.presets.map(p => (
                          <button
                            key={p.label}
                            onClick={() => applyPreset(p)}
                            className="w-full text-left px-4 py-2 border-b border-cyber-border/20 last:border-0 hover:bg-cyber-surface/60 transition-colors"
                          >
                            <p className="font-mono text-[10px] text-cyber-cyan">{p.label}</p>
                            <p className="font-mono text-[9px] text-cyber-muted mt-0.5">{p.desc}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </TerminalCard>

      {/* Test input + preview side by side on wider screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Test text */}
        <TerminalCard title="Test Input" label="TEXT" accent="none">
          <textarea
            value={testText}
            onChange={e => setTestText(e.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-border resize-y"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="font-mono text-[9px] text-cyber-muted">{testText.length} chars · {testText.split('\n').length} lines</span>
            <button
              onClick={() => setTestText(DEFAULT_TEST)}
              className="font-mono text-[9px] text-cyber-muted hover:text-cyber-cyan transition-colors"
            >
              Reset to sample
            </button>
          </div>
        </TerminalCard>

        {/* Highlighted preview */}
        <TerminalCard
          title={validPattern
            ? `${matches.length} match${matches.length !== 1 ? 'es' : ''}${matches.length >= 500 ? ' (capped)' : ''}`
            : 'Preview'}
          label={validPattern ? 'MATCHES' : 'PREVIEW'}
          accent={validPattern && matches.length > 0 ? 'cyan' : 'none'}
        >
          <div
            className="font-mono text-xs leading-relaxed max-h-56 overflow-y-auto bg-cyber-bg border border-cyber-border/40 rounded p-3 break-words"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {highlighted}
          </div>
          {validPattern && matches.length > 0 && uniqueVals.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
              <span className="font-mono text-[9px] text-cyber-muted">Matched:</span>
              {uniqueVals.map(v => (
                <span key={v} className="font-mono text-[9px] text-cyber-cyan border border-cyber-cyan/30 rounded px-1.5 py-0.5 truncate max-w-[120px]">
                  {v.length > 24 ? v.slice(0, 24) + '…' : v}
                </span>
              ))}
              {matches.length > uniqueVals.length && (
                <span className="font-mono text-[9px] text-cyber-muted">…</span>
              )}
            </div>
          )}
        </TerminalCard>
      </div>

      {/* Match list */}
      {validPattern && matches.length > 0 && (
        <TerminalCard title={`Match Details (${matches.length})`} label="DETAIL" accent="none">
          <div className="space-y-1">
            {visibleMatches.map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-1.5 border-b border-cyber-border/20 last:border-0 group"
              >
                <span className="font-mono text-[9px] text-cyber-muted w-8 text-right flex-none pt-0.5">#{i + 1}</span>
                <span className="font-mono text-[9px] text-cyber-muted w-16 flex-none pt-0.5">
                  @{m.index}–{m.index + m.length - 1}
                </span>
                <span className="font-mono text-xs text-cyber-cyan flex-1 break-all">{m.value}</span>
                {m.groups.some(g => g !== undefined) && (
                  <div className="flex gap-1 flex-wrap justify-end">
                    {m.groups.map((g, gi) => g !== undefined && (
                      <span key={gi} className="font-mono text-[9px] text-cyber-orange border border-cyber-orange/30 rounded px-1.5 py-0.5">
                        ${gi + 1}: {g.length > 20 ? g.slice(0, 20) + '…' : g}
                      </span>
                    ))}
                  </div>
                )}
                <CopyBtn value={m.value} />
              </div>
            ))}
          </div>
          {matches.length > SHOW_LIMIT && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="mt-2 font-mono text-[10px] text-cyber-muted hover:text-cyber-cyan transition-colors"
            >
              {showAll ? '▲ Show less' : `▼ Show ${matches.length - SHOW_LIMIT} more matches`}
            </button>
          )}
        </TerminalCard>
      )}

      {validPattern && matches.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-cyber-border/10 border border-cyber-border/40 rounded font-mono text-xs text-cyber-muted">
          No matches found in test input.
        </div>
      )}
    </div>
  )
}
