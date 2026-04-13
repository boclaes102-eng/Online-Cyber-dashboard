'use client'
import { useState, useRef, useEffect, Fragment } from 'react'
import {
  Play, Square, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock, Loader2,
  Plus, X, ArrowUp, ArrowDown, Wrench, Save, Trash2,
} from 'lucide-react'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────
type Workflow   = 'domain' | 'ip' | 'webapp' | 'custom'
type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped'
type Severity   = 'critical' | 'high' | 'medium' | 'low' | 'info'

interface StepDef   { id: string; label: string; hint: string }
interface StepState { id: string; label: string; hint: string; status: StepStatus; data?: any; error?: string; ms?: number }
interface Finding   { severity: Severity; title: string; detail: string }
interface SavedCustom { name: string; steps: StepDef[] }

// ─── Master step catalog (all available steps) ────────────────────────────────
const STEP_CATALOG: StepDef[] = [
  { id: 'dns-a',      label: 'DNS — A Records',       hint: 'Resolve IPv4 address' },
  { id: 'dns-mx',     label: 'DNS — MX Records',      hint: 'Mail servers' },
  { id: 'dns-txt',    label: 'DNS — TXT Records',     hint: 'SPF / verification tokens' },
  { id: 'ssl',        label: 'SSL Certificate',       hint: 'Validity, expiry, protocol' },
  { id: 'headers',    label: 'HTTP Headers',          hint: 'CSP, HSTS, X-Frame...' },
  { id: 'waf',        label: 'WAF Detection',         hint: 'Firewall / CDN fingerprint' },
  { id: 'tech',       label: 'Tech Fingerprint',      hint: 'CMS, framework, server' },
  { id: 'subdomains', label: 'Subdomain Enum',        hint: 'crt.sh + HackerTarget' },
  { id: 'emailsec',   label: 'Email Security',        hint: 'SPF, DMARC, DKIM' },
  { id: 'ip',         label: 'IP Intelligence',       hint: 'Geo, ASN, abuse score' },
  { id: 'portscan',   label: 'Port Scan',             hint: 'Shodan / TCP scan' },
  { id: 'reverseip',  label: 'Reverse IP',            hint: 'Co-hosted domains' },
  { id: 'asn',        label: 'BGP / ASN',             hint: 'AS info, prefixes, peers' },
]

const STEP_BY_ID = Object.fromEntries(STEP_CATALOG.map(s => [s.id, s]))

// ─── Preset workflow definitions ─────────────────────────────────────────────
const WF: Record<Exclude<Workflow, 'custom'>, { label: string; description: string; placeholder: string; steps: StepDef[] }> = {
  domain: {
    label: 'Domain Recon',
    description: 'Full passive recon — DNS, SSL, security headers, WAF, tech stack, subdomains, email security, IP intel & port scan.',
    placeholder: 'example.com',
    steps: ['dns-a','dns-mx','dns-txt','ssl','headers','waf','tech','subdomains','emailsec','ip','portscan','reverseip'].map(id => STEP_BY_ID[id]),
  },
  ip: {
    label: 'IP Investigation',
    description: 'Deep-dive an IP — reputation, open ports & services, co-hosted domains, and BGP/ASN info.',
    placeholder: '8.8.8.8',
    steps: ['ip','portscan','reverseip','asn'].map(id => STEP_BY_ID[id]),
  },
  webapp: {
    label: 'Web App Audit',
    description: 'Security audit of a web application — headers grade, WAF, tech stack, SSL, IP intel & email spoofability.',
    placeholder: 'https://example.com',
    steps: ['headers','waf','tech','ssl','dns-a','ip','emailsec'].map(id => STEP_BY_ID[id]),
  },
}

// ─── Severity config ──────────────────────────────────────────────────────────
const SEV_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']
const SEV_STYLE: Record<Severity, { badge: string; border: string; label: string }> = {
  critical: { badge: 'bg-red-500/20 text-red-400 border-red-500/30',         border: 'border-l-red-500',         label: 'CRITICAL' },
  high:     { badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', border: 'border-l-orange-500',      label: 'HIGH' },
  medium:   { badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', border: 'border-l-yellow-500',      label: 'MEDIUM' },
  low:      { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',       border: 'border-l-blue-500',        label: 'LOW' },
  info:     { badge: 'bg-cyber-bg text-cyber-muted border-cyber-border',      border: 'border-l-cyber-border/50', label: 'INFO' },
}

// ─── Findings extractor ───────────────────────────────────────────────────────
function extractFindings(steps: StepState[]): Finding[] {
  const f: Finding[] = []
  for (const s of steps) {
    if (s.status !== 'done' || !s.data) continue
    const d = s.data

    if (s.id === 'ssl') {
      if (d.error && !d.valid)
        f.push({ severity: 'critical', title: 'SSL Connection Failed', detail: d.error })
      else if (d.daysLeft <= 0)
        f.push({ severity: 'critical', title: 'SSL Certificate Expired', detail: `Expired: ${d.expiresAt}` })
      else if (d.daysLeft < 14)
        f.push({ severity: 'high', title: `SSL Expiring in ${d.daysLeft} Days`, detail: `Issuer: ${d.issuer}` })
      else if (d.daysLeft < 30)
        f.push({ severity: 'medium', title: `SSL Expiring in ${d.daysLeft} Days`, detail: 'Renew soon' })
      if (!d.authorized && d.valid)
        f.push({ severity: 'high', title: 'SSL Cert Not Browser-Trusted', detail: d.error ?? 'Self-signed or unknown CA' })
      if (d.protocol === 'TLSv1' || d.protocol === 'TLSv1.1')
        f.push({ severity: 'high', title: `Deprecated TLS: ${d.protocol}`, detail: 'Upgrade to TLS 1.2+ (ideally 1.3)' })
    }

    if (s.id === 'headers') {
      if (d.grade === 'F')
        f.push({ severity: 'high', title: 'Security Headers: Grade F', detail: `Score ${d.score}/100 — multiple headers missing` })
      else if (d.grade === 'D')
        f.push({ severity: 'medium', title: 'Security Headers: Grade D', detail: `Score ${d.score}/100` })
      const missing: string[] = (d.checks ?? []).filter((c: any) => !c.pass).map((c: any) => c.label as string)
      if (missing.includes('Content-Security-Policy'))
        f.push({ severity: 'medium', title: 'Missing CSP Header', detail: 'No XSS / injection protection' })
      if (missing.includes('Strict-Transport-Security'))
        f.push({ severity: 'medium', title: 'Missing HSTS Header', detail: 'HTTP downgrade / MITM risk' })
    }

    if (s.id === 'portscan') {
      const danger: Record<number, string> = {
        21: 'FTP', 23: 'Telnet', 3389: 'RDP', 5900: 'VNC',
        445: 'SMB', 1433: 'MSSQL', 27017: 'MongoDB',
        9200: 'Elasticsearch', 6379: 'Redis', 11211: 'Memcached',
      }
      for (const p of (d.ports ?? [])) {
        if (danger[p])
          f.push({ severity: 'high', title: `Dangerous Port Open: ${p} (${danger[p]})`, detail: 'Should be firewalled from public internet' })
      }
      if (d.vulns?.length)
        f.push({ severity: 'critical', title: `${d.vulns.length} CVE(s) Found via Shodan`, detail: d.vulns.slice(0, 4).join(', ') })
    }

    if (s.id === 'emailsec') {
      if (d.verdict === 'VULNERABLE')
        f.push({ severity: 'high', title: 'Email Domain Spoofable', detail: `Risk ${d.riskScore}/100 — weak SPF/DMARC` })
      else if (d.verdict === 'PARTIAL')
        f.push({ severity: 'medium', title: 'Partial Email Protection', detail: `Risk ${d.riskScore}/100 — gaps in SPF/DMARC` })
      if (!d.dkim?.found)
        f.push({ severity: 'low', title: 'No DKIM Found', detail: 'Not detected on common selectors' })
    }

    if (s.id === 'ip') {
      const score = d.abuseScore ?? 0
      if (score >= 80)      f.push({ severity: 'critical', title: `Abuse Score: ${score}%`, detail: `${d.totalReports ?? '?'} reports — likely malicious IP` })
      else if (score >= 50) f.push({ severity: 'high',     title: `Abuse Score: ${score}%`, detail: `${d.totalReports ?? '?'} abuse reports` })
      else if (score >= 20) f.push({ severity: 'medium',   title: `Abuse Score: ${score}%`, detail: `${d.totalReports ?? '?'} abuse reports` })
    }

    if (s.id === 'waf') {
      if (!d.protected)
        f.push({ severity: 'low',  title: 'No WAF Detected',              detail: 'No web application firewall fingerprinted' })
      else
        f.push({ severity: 'info', title: `WAF/CDN: ${d.detected?.join(', ')}`, detail: 'Traffic is filtered / proxied' })
    }

    if (s.id === 'subdomains' && (d.count ?? 0) > 0)
      f.push({ severity: 'info', title: `${d.count} Subdomains Found`, detail: 'Via crt.sh + HackerTarget (passive)' })

    if (s.id === 'tech' && d.detections?.length > 0)
      f.push({ severity: 'info', title: `Tech Stack: ${d.detections.map((t: any) => t.name).join(', ')}`, detail: `${d.detections.length} components fingerprinted` })
  }
  return f.sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity))
}

// ─── Step icon ────────────────────────────────────────────────────────────────
function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'running') return <Loader2     size={13} className="text-cyber-cyan animate-spin flex-none" />
  if (status === 'done')    return <CheckCircle2 size={13} className="text-green-400 flex-none" />
  if (status === 'error')   return <XCircle      size={13} className="text-red-400 flex-none" />
  if (status === 'skipped') return <span className="w-[13px] h-[13px] flex-none flex items-center justify-center font-mono text-[9px] text-cyber-muted">—</span>
  return                           <Clock        size={13} className="text-cyber-muted/40 flex-none" />
}

// ─── Per-step result renderer ─────────────────────────────────────────────────
function StepResultView({ id, data }: { id: string; data: any }) {
  if (!data) return null
  const mono = 'font-mono text-xs'

  if (id === 'dns-a' || id === 'dns-mx' || id === 'dns-txt') {
    const records: any[] = data.records ?? []
    if (!records.length) return <p className={clsx(mono, 'text-cyber-muted italic')}>No records found</p>
    return (
      <div className="space-y-0.5">
        {records.slice(0, 10).map((r, i) => (
          <p key={i} className={mono}>
            <span className="text-cyber-cyan w-10 inline-block">{r.type}</span>
            <span className="text-cyber-text">{r.value}</span>
            <span className="text-cyber-muted ml-2">TTL {r.ttl}</span>
          </p>
        ))}
        {records.length > 10 && <p className={clsx(mono, 'text-cyber-muted')}>+{records.length - 10} more</p>}
      </div>
    )
  }

  if (id === 'ssl') {
    const valid = data.valid
    return (
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
        {([
          ['Status',   valid ? `Valid — ${data.daysLeft} days left` : 'Invalid / Expired', valid ? 'text-green-400' : 'text-red-400'],
          ['Protocol', `${data.protocol ?? '?'} / ${data.cipher ?? '?'}`, ''],
          ['Issuer',   data.issuer, ''],
          ['Subject',  data.subject, ''],
          ['Expires',  data.expiresAt, ''],
        ] as [string, string, string][]).filter(([, v]) => v).map(([k, v, cls]) => (
          <Fragment key={k}>
            <span className={clsx(mono, 'text-cyber-muted')}>{k}</span>
            <span className={clsx(mono, cls || 'text-cyber-text')}>{v}</span>
          </Fragment>
        ))}
      </div>
    )
  }

  if (id === 'headers') {
    const g = data.grade ?? '?'
    const gColor = ['A+', 'A'].includes(g) ? 'text-green-400' : g === 'B' ? 'text-yellow-400' : 'text-red-400'
    return (
      <div className="space-y-1">
        <p className={clsx(mono, 'font-bold', gColor)}>Grade {g} — {data.score}/100</p>
        {(data.checks ?? []).map((c: any, i: number) => (
          <p key={i} className={clsx(mono, c.pass ? 'text-green-400' : 'text-red-400')}>
            {c.pass ? '✓' : '✗'} {c.label}
          </p>
        ))}
      </div>
    )
  }

  if (id === 'waf') {
    return (
      <div className="space-y-0.5">
        <p className={clsx(mono, data.protected ? 'text-green-400' : 'text-cyber-muted')}>
          {data.protected ? `Protected — ${data.detected?.join(', ')}` : 'No WAF / CDN detected'}
        </p>
        {(data.cnames ?? []).length > 0 && (
          <p className={clsx(mono, 'text-cyber-muted')}>CNAME chain: {data.cnames.join(' → ')}</p>
        )}
        {Object.keys(data.relevantHeaders ?? {}).map(k => (
          <p key={k} className={mono}><span className="text-cyber-cyan mr-2">{k}</span><span className="text-cyber-text truncate">{(data.relevantHeaders as any)[k]}</span></p>
        ))}
      </div>
    )
  }

  if (id === 'tech') {
    const dets: any[] = data.detections ?? []
    if (!dets.length) return <p className={clsx(mono, 'text-cyber-muted italic')}>No technologies detected</p>
    const grouped: Record<string, string[]> = {}
    for (const d of dets) {
      grouped[d.category] = grouped[d.category] ?? []
      grouped[d.category].push(d.name + (d.version ? ` ${d.version}` : ''))
    }
    return (
      <div className="space-y-0.5">
        {Object.entries(grouped).map(([cat, names]) => (
          <p key={cat} className={mono}>
            <span className="text-cyber-cyan w-20 inline-block">{cat}</span>
            <span className="text-cyber-text">{names.join(', ')}</span>
          </p>
        ))}
      </div>
    )
  }

  if (id === 'subdomains') {
    const subs: any[] = data.subdomains ?? []
    return (
      <div className="space-y-0.5">
        <p className={clsx(mono, 'text-cyber-muted')}>{data.count} subdomains found</p>
        {subs.slice(0, 10).map((s, i) => (
          <p key={i} className={clsx(mono, 'text-cyber-text')}>{s.name} <span className="text-cyber-muted">({s.source})</span></p>
        ))}
        {subs.length > 10 && <p className={clsx(mono, 'text-cyber-muted')}>+{subs.length - 10} more</p>}
      </div>
    )
  }

  if (id === 'emailsec') {
    const v = data.verdict ?? '?'
    const vColor = v === 'PROTECTED' ? 'text-green-400' : v === 'PARTIAL' ? 'text-yellow-400' : 'text-red-400'
    return (
      <div className="space-y-0.5">
        <p className={clsx(mono, 'font-bold', vColor)}>{v} — Risk {data.riskScore}/100</p>
        <p className={mono}><span className="text-cyber-muted w-14 inline-block">SPF</span><span className={data.spf?.exists ? 'text-green-400' : 'text-red-400'}>{data.spf?.exists ? data.spf.strictness : 'Missing'}</span></p>
        <p className={mono}><span className="text-cyber-muted w-14 inline-block">DMARC</span><span className={data.dmarc?.record ? 'text-green-400' : 'text-red-400'}>{data.dmarc?.record ? `p=${data.dmarc.policy}` : 'Missing'}</span></p>
        <p className={mono}><span className="text-cyber-muted w-14 inline-block">DKIM</span><span className={data.dkim?.found ? 'text-green-400' : 'text-yellow-400'}>{data.dkim?.found ? `${data.dkim.selectors?.length} selector(s) found` : 'Not found'}</span></p>
        <p className={mono}><span className="text-cyber-muted w-14 inline-block">MTA-STS</span><span className={data.mtaSts?.found ? 'text-green-400' : 'text-cyber-muted'}>{data.mtaSts?.found ? 'Present' : 'Not present'}</span></p>
      </div>
    )
  }

  if (id === 'ip') {
    const risk = data.riskLevel ?? 'LOW'
    const riskColor = risk === 'CRITICAL' ? 'text-red-400' : risk === 'HIGH' ? 'text-orange-400' : risk === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'
    return (
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
        {([
          ['Org',      data.org ?? data.isp],
          ['Location', [data.city, data.country].filter(Boolean).join(', ')],
          ['ASN',      data.as],
          ['Abuse',    data.abuseScore !== undefined ? `${data.abuseScore}% confidence (${data.totalReports ?? 0} reports)` : 'No API key'],
          ['Risk',     risk],
        ] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
          <Fragment key={k}>
            <span className={clsx(mono, 'text-cyber-muted')}>{k}</span>
            <span className={clsx(mono, k === 'Risk' ? riskColor : 'text-cyber-text')}>{v}</span>
          </Fragment>
        ))}
      </div>
    )
  }

  if (id === 'portscan') {
    const services: any[] = data.services ?? []
    if (!services.length) return <p className={clsx(mono, 'text-cyber-muted italic')}>No open ports found ({data.mode})</p>
    const dangerPorts = new Set([21, 23, 3389, 5900, 445, 1433, 27017, 9200, 6379, 11211])
    return (
      <div className="space-y-0.5">
        <p className={clsx(mono, 'text-cyber-muted')}>{services.length} open port(s) via {data.mode}</p>
        {services.slice(0, 14).map((s, i) => (
          <p key={i} className={mono}>
            <span className={clsx('w-12 inline-block', dangerPorts.has(s.port) ? 'text-red-400' : 'text-cyber-cyan')}>{s.port}</span>
            <span className="text-cyber-text">{s.service ?? '?'}{s.product ? ` — ${s.product}${s.version ? ` ${s.version}` : ''}` : ''}</span>
          </p>
        ))}
        {data.vulns?.length > 0 && (
          <p className={clsx(mono, 'text-red-400 mt-1')}>⚠ {data.vulns.length} CVE(s): {data.vulns.slice(0, 3).join(', ')}</p>
        )}
      </div>
    )
  }

  if (id === 'reverseip') {
    const domains: string[] = data.domains ?? []
    return (
      <div className="space-y-0.5">
        <p className={clsx(mono, 'text-cyber-muted')}>{data.count} domain(s) on this IP</p>
        {domains.slice(0, 10).map((d, i) => (
          <p key={i} className={clsx(mono, 'text-cyber-text')}>{d}</p>
        ))}
        {domains.length > 10 && <p className={clsx(mono, 'text-cyber-muted')}>+{domains.length - 10} more</p>}
      </div>
    )
  }

  if (id === 'asn') {
    const asn = data.asn
    if (!asn) return <p className={clsx(mono, 'text-cyber-muted italic')}>No ASN data found</p>
    return (
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
        {([
          ['ASN',      `AS${asn.asn} — ${asn.name}`],
          ['Org',      asn.description],
          ['Country',  asn.countryCode],
          ['RIR',      asn.rir],
          ['IPv4 PFX', String(asn.prefixCount?.ipv4 ?? '?')],
          ['Peers',    String(data.peers?.length ?? 0)],
        ] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
          <Fragment key={k}>
            <span className={clsx(mono, 'text-cyber-muted')}>{k}</span>
            <span className={clsx(mono, 'text-cyber-text')}>{v}</span>
          </Fragment>
        ))}
      </div>
    )
  }

  return null
}

// ─── Custom workflow builder component ────────────────────────────────────────
const CUSTOM_STORAGE_KEY = 'cyberops_custom_workflows'

function CustomWorkflowBuilder({
  steps,
  onChange,
}: {
  steps: StepDef[]
  onChange: (steps: StepDef[]) => void
}) {
  const [savedList, setSavedList] = useState<SavedCustom[]>([])
  const [saveName, setSaveName]   = useState('')

  // Load saved workflows from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_STORAGE_KEY)
      if (raw) setSavedList(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  function persistSaved(list: SavedCustom[]) {
    setSavedList(list)
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(list))
  }

  function addStep(step: StepDef) {
    if (steps.find(s => s.id === step.id)) return   // no duplicates
    onChange([...steps, step])
  }

  function removeStep(id: string) {
    onChange(steps.filter(s => s.id !== id))
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const next = [...steps]
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= next.length) return
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    onChange(next)
  }

  function saveWorkflow() {
    if (!saveName.trim() || steps.length === 0) return
    const entry: SavedCustom = { name: saveName.trim(), steps }
    const next = [...savedList.filter(s => s.name !== entry.name), entry]
    persistSaved(next)
    setSaveName('')
  }

  function loadWorkflow(saved: SavedCustom) {
    onChange(saved.steps)
  }

  function deleteSaved(name: string) {
    persistSaved(savedList.filter(s => s.name !== name))
  }

  const selectedIds = new Set(steps.map(s => s.id))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_1fr] gap-4">
        {/* ── Step library ── */}
        <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-cyber-border">
            <p className="font-mono text-[9px] text-cyber-muted tracking-widest uppercase">Step Library</p>
          </div>
          <div className="p-2 space-y-1">
            {STEP_CATALOG.map(step => {
              const selected = selectedIds.has(step.id)
              return (
                <button
                  key={step.id}
                  onClick={() => selected ? removeStep(step.id) : addStep(step)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-all font-mono text-xs',
                    selected
                      ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20'
                      : 'text-cyber-text hover:bg-cyber-cyan/5 hover:text-cyber-cyan border border-transparent',
                  )}
                >
                  <span className={clsx('flex-none', selected ? 'text-cyber-cyan' : 'text-cyber-muted')}>
                    {selected ? <X size={11} /> : <Plus size={11} />}
                  </span>
                  <span className="flex-1 truncate">{step.label}</span>
                  <span className="text-[9px] text-cyber-muted truncate">{step.hint}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Selected steps / order ── */}
        <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-cyber-border flex items-center justify-between">
            <p className="font-mono text-[9px] text-cyber-muted tracking-widest uppercase">
              Workflow ({steps.length} steps)
            </p>
            {steps.length > 0 && (
              <button onClick={() => onChange([])} className="font-mono text-[9px] text-red-400 hover:text-red-300 transition-colors">
                Clear all
              </button>
            )}
          </div>
          <div className="p-2 space-y-1 min-h-[120px]">
            {steps.length === 0 ? (
              <p className="font-mono text-[10px] text-cyber-muted italic px-2 py-3">
                Click steps in the library to add them here.
              </p>
            ) : (
              steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="flex items-center gap-1 px-2 py-1.5 rounded bg-cyber-bg border border-cyber-border"
                >
                  <span className="font-mono text-[9px] text-cyber-muted w-4 flex-none text-right">{idx + 1}</span>
                  <span className="font-mono text-xs text-cyber-text-hi flex-1 truncate ml-1">{step.label}</span>
                  <button onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                    className="text-cyber-muted hover:text-cyber-text disabled:opacity-20 transition-colors flex-none p-0.5">
                    <ArrowUp size={10} />
                  </button>
                  <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1}
                    className="text-cyber-muted hover:text-cyber-text disabled:opacity-20 transition-colors flex-none p-0.5">
                    <ArrowDown size={10} />
                  </button>
                  <button onClick={() => removeStep(step.id)}
                    className="text-cyber-muted hover:text-red-400 transition-colors flex-none p-0.5">
                    <X size={10} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Save / load presets ── */}
      <div className="bg-cyber-surface border border-cyber-border rounded-lg p-3 space-y-3">
        <p className="font-mono text-[9px] text-cyber-muted tracking-widest uppercase">Saved Workflows</p>

        {/* Save row */}
        <div className="flex gap-2">
          <input
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveWorkflow()}
            placeholder="Workflow name…"
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-2.5 py-1.5 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
          />
          <button
            onClick={saveWorkflow}
            disabled={!saveName.trim() || steps.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs rounded hover:bg-cyber-cyan/20 disabled:opacity-40 transition-all"
          >
            <Save size={11} /> Save
          </button>
        </div>

        {/* Saved list */}
        {savedList.length === 0 ? (
          <p className="font-mono text-[10px] text-cyber-muted italic">No saved workflows yet.</p>
        ) : (
          <div className="space-y-1">
            {savedList.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <button
                  onClick={() => loadWorkflow(s)}
                  className="flex-1 text-left font-mono text-xs text-cyber-text hover:text-cyber-cyan transition-colors truncate"
                >
                  {s.name}
                  <span className="text-cyber-muted ml-2">({s.steps.length} steps)</span>
                </button>
                <button onClick={() => deleteSaved(s.name)}
                  className="text-cyber-muted hover:text-red-400 transition-colors flex-none">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AutomationPage() {
  const [workflow,      setWorkflow]      = useState<Workflow>('domain')
  const [target,        setTarget]        = useState('')
  const [scanning,      setScanning]      = useState(false)
  const [stepStates,    setStepStates]    = useState<StepState[]>([])
  const [findings,      setFindings]      = useState<Finding[]>([])
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set())
  const [done,          setDone]          = useState(false)
  const [customSteps,   setCustomSteps]   = useState<StepDef[]>([])

  const abortRef = useRef(false)
  const acRef    = useRef<AbortController | null>(null)
  const stepsRef = useRef<StepState[]>([])

  function updateStep(id: string, partial: Partial<StepState>) {
    setStepStates(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...partial } : s)
      stepsRef.current = next
      return next
    })
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function fetchStep(
    id: string,
    domain: string,
    baseUrl: string,
    ip: string | null,
    signal: AbortSignal,
  ): Promise<any> {
    const enc = encodeURIComponent
    const endpoints: Record<string, string | null> = {
      'dns-a':      `/api/dns?name=${enc(domain)}&type=A`,
      'dns-mx':     `/api/dns?name=${enc(domain)}&type=MX`,
      'dns-txt':    `/api/dns?name=${enc(domain)}&type=TXT`,
      'ssl':        `/api/ssl?host=${enc(domain)}`,
      'headers':    `/api/headers?url=${enc(baseUrl)}`,
      'waf':        `/api/waf?url=${enc(baseUrl)}`,
      'tech':       `/api/tech?url=${enc(baseUrl)}`,
      'subdomains': `/api/subdomains?domain=${enc(domain)}`,
      'emailsec':   `/api/emailsec?domain=${enc(domain)}`,
      'ip':         ip ? `/api/ip?ip=${enc(ip)}` : null,
      'portscan':   ip ? `/api/portscan?ip=${enc(ip)}` : null,
      'reverseip':  ip ? `/api/reverseip?ip=${enc(ip)}` : null,
      'asn':        ip ? `/api/asn?q=${enc(ip)}` : null,
    }
    const endpoint = endpoints[id]
    if (!endpoint) throw new Error('NO_IP')
    const res = await fetch(endpoint, { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  async function startScan() {
    const activeSteps = workflow === 'custom' ? customSteps : WF[workflow as Exclude<Workflow, 'custom'>].steps
    if (!target.trim() || scanning || activeSteps.length === 0) return

    abortRef.current = false
    acRef.current    = new AbortController()
    setScanning(true)
    setDone(false)
    setFindings([])
    setExpanded(new Set())

    const raw    = target.trim()
    const isIp   = /^\d{1,3}(\.\d{1,3}){3}$/.test(raw)
    const isHttp = raw.startsWith('http://') || raw.startsWith('https://')

    let domain  = raw
    let baseUrl = raw
    if (isHttp) {
      try { domain = new URL(raw).hostname } catch { /* keep raw */ }
      baseUrl = raw
    } else if (!isIp) {
      baseUrl = `https://${raw}`
    }

    let resolvedIp: string | null = isIp ? raw : null

    const wfSteps = activeSteps
    const initial: StepState[] = wfSteps.map(s => ({ ...s, status: 'pending' }))
    setStepStates(initial)
    stepsRef.current = initial

    const signal = acRef.current.signal

    // Phase 1: run dns-a first if needed to resolve IP
    const hasDnsA = wfSteps.some(s => s.id === 'dns-a')
    const needsIp = wfSteps.some(s => ['ip', 'portscan', 'reverseip', 'asn'].includes(s.id))

    if (hasDnsA && !resolvedIp) {
      updateStep('dns-a', { status: 'running' })
      const t = Date.now()
      try {
        const data = await fetchStep('dns-a', domain, baseUrl, null, signal)
        resolvedIp = data.records?.[0]?.value ?? null
        updateStep('dns-a', { status: 'done', data, ms: Date.now() - t })
      } catch (err: any) {
        updateStep('dns-a', { status: err?.name === 'AbortError' ? 'skipped' : 'error', error: String(err), ms: Date.now() - t })
      }
    } else if (!hasDnsA && needsIp && !resolvedIp) {
      // No dns-a step but we need IP — try to resolve it silently
      try {
        const data = await fetchStep('dns-a', domain, baseUrl, null, signal)
        resolvedIp = data.records?.[0]?.value ?? null
      } catch { /* silently skip */ }
    }

    if (abortRef.current) { setScanning(false); setDone(true); return }

    // Phase 2: run all remaining steps in parallel
    const remaining = wfSteps.filter(s => s.id !== 'dns-a')

    setStepStates(prev => {
      const next = prev.map(s => remaining.some(r => r.id === s.id) ? { ...s, status: 'running' as StepStatus } : s)
      stepsRef.current = next
      return next
    })

    await Promise.all(remaining.map(async (stepDef) => {
      if (abortRef.current) {
        updateStep(stepDef.id, { status: 'skipped' })
        return
      }
      const t = Date.now()
      try {
        const data = await fetchStep(stepDef.id, domain, baseUrl, resolvedIp, signal)
        if (!abortRef.current) updateStep(stepDef.id, { status: 'done', data, ms: Date.now() - t })
      } catch (err: any) {
        if (abortRef.current) return
        const msg = err instanceof Error ? err.message : String(err)
        if (msg === 'NO_IP')
          updateStep(stepDef.id, { status: 'skipped', error: 'Could not resolve IP', ms: Date.now() - t })
        else
          updateStep(stepDef.id, { status: 'error', error: msg, ms: Date.now() - t })
      }
    }))

    setFindings(extractFindings(stepsRef.current))
    setScanning(false)
    setDone(true)
  }

  function stopScan() {
    abortRef.current = true
    acRef.current?.abort()
    setScanning(false)
    setDone(true)
    setFindings(extractFindings(stepsRef.current))
  }

  // Derived
  const isCustom       = workflow === 'custom'
  const activeSteps    = isCustom ? customSteps : WF[workflow as Exclude<Workflow, 'custom'>].steps
  const wfDescription  = isCustom
    ? (customSteps.length === 0 ? 'Select steps from the library below, then enter a target and run.' : `${customSteps.length} step(s) selected — ready to scan.`)
    : WF[workflow as Exclude<Workflow, 'custom'>].description
  const wfPlaceholder  = isCustom ? 'domain, IP, or URL' : WF[workflow as Exclude<Workflow, 'custom'>].placeholder
  const critCount  = findings.filter(f => f.severity === 'critical').length
  const highCount  = findings.filter(f => f.severity === 'high').length
  const totalRisk  = findings.filter(f => f.severity !== 'info').length

  const ALL_WORKFLOWS: { id: Workflow; label: string }[] = [
    { id: 'domain',  label: 'Domain Recon' },
    { id: 'ip',      label: 'IP Investigation' },
    { id: 'webapp',  label: 'Web App Audit' },
    { id: 'custom',  label: 'Custom Builder' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">Automation Scanner</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Chain multiple tools in one automated run — no manual steps needed</p>
      </div>

      {/* Workflow selector */}
      <div className="flex gap-2 flex-wrap">
        {ALL_WORKFLOWS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => {
              if (!scanning) {
                setWorkflow(id)
                setStepStates([])
                setFindings([])
                setDone(false)
              }
            }}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 font-mono text-xs rounded border transition-all',
              workflow === id
                ? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30'
                : 'text-cyber-muted border-cyber-border hover:text-cyber-text hover:border-cyber-text/20',
              scanning && workflow !== id && 'opacity-40 cursor-not-allowed',
              id === 'custom' && 'border-dashed',
            )}
          >
            {id === 'custom' && <Wrench size={11} />}
            {label}
          </button>
        ))}
      </div>

      <p className="font-mono text-[10px] text-cyber-muted">{wfDescription}</p>

      {/* Custom workflow builder */}
      {isCustom && !scanning && (
        <CustomWorkflowBuilder steps={customSteps} onChange={setCustomSteps} />
      )}

      {/* Target input + action button */}
      <div className="flex gap-3">
        <input
          value={target}
          onChange={e => setTarget(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !scanning && startScan()}
          placeholder={`Target — e.g. ${wfPlaceholder}`}
          disabled={scanning}
          className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2.5 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60 disabled:opacity-60"
        />
        {scanning ? (
          <button
            onClick={stopScan}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs rounded hover:bg-red-500/20 transition-all"
          >
            <Square size={12} /> Stop
          </button>
        ) : (
          <button
            onClick={startScan}
            disabled={!target.trim() || (isCustom && customSteps.length === 0)}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs rounded hover:bg-cyber-cyan/20 disabled:opacity-40 transition-all"
          >
            <Play size={12} /> Run Scan
          </button>
        )}
      </div>

      {/* Steps list */}
      {stepStates.length > 0 && (
        <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-cyber-border flex items-center justify-between">
            <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">
              {activeSteps.length} Steps
            </p>
            {scanning && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-cyber-cyan">
                <Loader2 size={10} className="animate-spin" /> Running…
              </span>
            )}
            {done && !scanning && (
              <span className="font-mono text-[10px] text-green-400">✓ Complete</span>
            )}
          </div>
          <div className="divide-y divide-cyber-border">
            {stepStates.map(step => (
              <div key={step.id}>
                <button
                  onClick={() => step.status === 'done' && toggleExpand(step.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    step.status === 'done' ? 'hover:bg-cyber-cyan/5 cursor-pointer' : 'cursor-default',
                  )}
                >
                  <StepIcon status={step.status} />
                  <span className={clsx(
                    'font-mono text-xs flex-1',
                    step.status === 'done'    ? 'text-cyber-text-hi' :
                    step.status === 'running' ? 'text-cyber-cyan' :
                    step.status === 'error'   ? 'text-red-400' :
                    step.status === 'skipped' ? 'text-cyber-muted' :
                    'text-cyber-muted/50',
                  )}>
                    {step.label}
                  </span>
                  <span className="font-mono text-[10px] text-cyber-muted">{step.hint}</span>
                  {step.ms !== undefined && (
                    <span className="font-mono text-[10px] text-cyber-muted w-14 text-right">{step.ms}ms</span>
                  )}
                  {step.status === 'error' && (
                    <span className="font-mono text-[10px] text-red-400 max-w-[180px] truncate">{step.error}</span>
                  )}
                  {step.status === 'done' && (
                    expanded.has(step.id)
                      ? <ChevronDown  size={11} className="text-cyber-muted flex-none" />
                      : <ChevronRight size={11} className="text-cyber-muted flex-none" />
                  )}
                </button>

                {step.status === 'done' && expanded.has(step.id) && (
                  <div className="px-8 pb-3 pt-1 bg-cyber-bg/50 border-t border-cyber-border/50">
                    <StepResultView id={step.id} data={step.data} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings panel */}
      {done && findings.length > 0 && (
        <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-cyber-border flex items-center justify-between">
            <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">
              Findings — {findings.length} total
            </p>
            <div className="flex items-center gap-3">
              {critCount > 0 && <span className="font-mono text-[10px] text-red-400">{critCount} CRITICAL</span>}
              {highCount > 0 && <span className="font-mono text-[10px] text-orange-400">{highCount} HIGH</span>}
              {totalRisk === 0 && <span className="font-mono text-[10px] text-green-400">No risks found</span>}
            </div>
          </div>
          <div className="divide-y divide-cyber-border">
            {findings.map((f, i) => {
              const st = SEV_STYLE[f.severity]
              return (
                <div key={i} className={clsx('flex items-start gap-3 px-4 py-2.5 border-l-2', st.border)}>
                  <span className={clsx('font-mono text-[9px] px-1.5 py-0.5 rounded border flex-none mt-0.5', st.badge)}>
                    {st.label}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-cyber-text-hi">{f.title}</p>
                    <p className="font-mono text-[10px] text-cyber-muted mt-0.5">{f.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {done && findings.length === 0 && (
        <div className="bg-cyber-surface border border-green-500/20 rounded-lg px-4 py-3 flex items-center gap-3">
          <CheckCircle2 size={14} className="text-green-400 flex-none" />
          <p className="font-mono text-xs text-green-400">Scan complete — no findings detected.</p>
        </div>
      )}
    </div>
  )
}
