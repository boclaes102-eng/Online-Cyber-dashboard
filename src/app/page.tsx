import Link from 'next/link'
import {
  Globe, Search, Shield, Hash, KeyRound,
  ChevronRight, AlertTriangle, Activity, Database,
} from 'lucide-react'
import type { CveSearchResult } from '@/lib/types'
import SeverityBadge from '@/components/ui/SeverityBadge'
import { formatDate, timeAgo } from '@/lib/utils'

// Fetch latest CVEs server-side, revalidate every 10 min
async function getLatestCves(): Promise<CveSearchResult> {
  try {
    const pubStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z')
    const pubEndDate   = new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z')
    const res = await fetch(
      `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=8&startIndex=0&pubStartDate=${pubStartDate}&pubEndDate=${pubEndDate}`,
      { next: { revalidate: 600 } }
    )
    if (!res.ok) return { totalResults: 0, items: [] }
    const data = await res.json()
    return {
      totalResults: data.totalResults ?? 0,
      items: (data.vulnerabilities ?? []).map((raw: {cve: {
        id: string; published: string; lastModified: string; vulnStatus: string
        descriptions: Array<{lang:string;value:string}>
        metrics?: {
          cvssMetricV31?: Array<{cvssData:{baseScore:number;baseSeverity:string;vectorString:string}}>
          cvssMetricV30?: Array<{cvssData:{baseScore:number;baseSeverity:string;vectorString:string}}>
        }
      }}) => {
        const { cve } = raw
        const m31 = cve.metrics?.cvssMetricV31?.[0]?.cvssData
        const m30 = cve.metrics?.cvssMetricV30?.[0]?.cvssData
        const cvssData = m31 ?? m30
        return {
          id:           cve.id,
          published:    cve.published,
          lastModified: cve.lastModified,
          vulnStatus:   cve.vulnStatus,
          description:  cve.descriptions.find(d=>d.lang==='en')?.value ?? '',
          severity:     cvssData?.baseSeverity ?? 'UNKNOWN',
          cvss:         cvssData ? { version: m31?'3.1':'3.0', baseScore: cvssData.baseScore, baseSeverity: cvssData.baseSeverity, vectorString: cvssData.vectorString } : undefined,
          references:   [],
          cwe:          [],
          affectedProducts: [],
        }
      }).reverse(),
    }
  } catch { return { totalResults: 0, items: [] } }
}

const TOOLS = [
  { href: '/tools/ip',       icon: Globe,    label: 'IP Intelligence',  desc: 'Geo, ASN, abuse score, threat context for any IP address.',  accent: 'cyan'   },
  { href: '/tools/domain',   icon: Search,   label: 'Domain Analyzer',  desc: 'WHOIS, DNS records, SSL certs, certificate transparency.',   accent: 'cyan'   },
  { href: '/tools/cve',      icon: Shield,   label: 'CVE Explorer',     desc: 'Search and filter the NVD vulnerability database.',          accent: 'orange' },
  { href: '/tools/hash',     icon: Hash,     label: 'Hash Scanner',     desc: 'VirusTotal + MalwareBazaar lookup for any hash.',            accent: 'red'    },
  { href: '/tools/password', icon: KeyRound, label: 'Password Auditor', desc: 'Entropy, pattern detection, HIBP breach check, crack time.', accent: 'green'  },
]

const ACCENT_CARD: Record<string, string> = {
  cyan:   'border-cyber-cyan/20 hover:border-cyber-cyan/50 hover:shadow-cyan',
  orange: 'border-cyber-orange/20 hover:border-cyber-orange/40',
  red:    'border-cyber-red/20 hover:border-cyber-red/40',
  green:  'border-cyber-green/20 hover:border-cyber-green/40',
}
const ACCENT_ICON: Record<string, string> = {
  cyan:   'text-cyber-cyan',
  orange: 'text-cyber-orange',
  red:    'text-cyber-red',
  green:  'text-cyber-green',
}

function countConnectedApis(): number {
  const keys = [
    process.env.NVD_API_KEY,
    process.env.VT_API_KEY,
    process.env.ABUSEIPDB_API_KEY,
    process.env.OTX_API_KEY,
    process.env.SHODAN_API_KEY,
    process.env.PHISHTANK_API_KEY,
    process.env.THREAT_INTEL_API_KEY,
  ]
  return keys.filter(Boolean).length
}

export default async function DashboardPage() {
  const { items: cves, totalResults } = await getLatestCves()
  const apisConnected = countConnectedApis()

  return (
    <div className="space-y-8">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
          <span className="font-mono text-[10px] text-cyber-green tracking-widest uppercase">
            All systems operational
          </span>
        </div>
        <h1 className="font-mono text-2xl font-700 text-cyber-text-hi tracking-tight">
          CyberOps Dashboard
        </h1>
        <p className="text-sm text-cyber-muted mt-1 font-mono">
          Personal security operations centre — OSINT, threat intel &amp; analysis tools.
        </p>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Shield,         label: 'CVEs in NVD',       value: totalResults > 0 ? `${(totalResults/1000).toFixed(0)}K+` : '—', color: 'text-cyber-orange' },
          { icon: Activity,       label: 'Active Modules',    value: '5',        color: 'text-cyber-green' },
          { icon: Database,       label: 'APIs Connected',    value: String(apisConnected), color: 'text-cyber-cyan'  },
          { icon: AlertTriangle,  label: 'Threat Level',      value: 'MONITOR',  color: 'text-cyber-orange' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="cyber-card px-4 py-3 flex items-center gap-3">
            <Icon size={16} className={`${color} flex-none`} />
            <div>
              <p className={`font-mono text-sm font-700 ${color}`}>{value}</p>
              <p className="font-mono text-[9px] text-cyber-muted tracking-wider uppercase">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tool cards ────────────────────────────────────────────────── */}
      <div>
        <h2 className="font-mono text-xs text-cyber-muted tracking-widest uppercase mb-3">
          Available Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TOOLS.map(({ href, icon: Icon, label, desc, accent }) => (
            <Link
              key={href}
              href={href}
              className={`cyber-card p-4 flex flex-col gap-3 transition-all duration-200 group ${ACCENT_CARD[accent]}`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-8 h-8 rounded border border-current/20 bg-current/5 flex items-center justify-center ${ACCENT_ICON[accent]}`}>
                  <Icon size={15} />
                </div>
                <ChevronRight size={13} className="text-cyber-muted group-hover:text-cyber-text transition-colors mt-1" />
              </div>
              <div>
                <p className="font-mono text-sm font-600 text-cyber-text-hi">{label}</p>
                <p className="font-mono text-[11px] text-cyber-muted mt-1 leading-relaxed">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Live CVE feed ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-red animate-pulse" />
            <h2 className="font-mono text-xs text-cyber-muted tracking-widest uppercase">
              Latest CVEs — NVD Live Feed
            </h2>
          </div>
          <Link href="/tools/cve" className="font-mono text-[10px] text-cyber-cyan hover:underline flex items-center gap-1">
            View all <ChevronRight size={10} />
          </Link>
        </div>

        <div className="cyber-card divide-y divide-cyber-border/50">
          {cves.length === 0 && (
            <div className="px-4 py-8 text-center font-mono text-xs text-cyber-muted">
              Could not load CVE feed — NVD API rate limit or network issue.
            </div>
          )}
          {cves.map(cve => (
            <div key={cve.id} className="px-4 py-3 flex items-start gap-4 hover:bg-cyber-surface/40 transition-colors group">
              <div className="flex-none pt-0.5">
                <SeverityBadge severity={cve.severity} score={cve.cvss?.baseScore} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-600 text-cyber-cyan">{cve.id}</span>
                  <span className="font-mono text-[9px] text-cyber-muted">{formatDate(cve.published)}</span>
                </div>
                <p className="font-mono text-[11px] text-cyber-text mt-0.5 line-clamp-2 leading-relaxed">
                  {cve.description}
                </p>
              </div>
              <div className="flex-none hidden md:block">
                <span className="font-mono text-[9px] text-cyber-muted">{timeAgo(cve.published)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
