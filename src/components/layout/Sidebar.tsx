'use client'

import React from 'react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Globe,
  Search,
  Shield,
  Hash,
  KeyRound,
  FileSearch,
  Wifi,
  Lock,
  ChevronRight,
  Radio,
  Crosshair,
  Terminal,
  Cpu,
  ShieldAlert,
  ScanSearch,
  Network,
  MailCheck,
  Bug,
  Calculator,
  KeySquare,
  Code2,
  Coins,
  Layers,
  Swords,
  Binary,
  Target,
  Zap,
  ShieldCheck,
  User,
  Archive,
  Fingerprint,
  Route,
  History,
  Flag,
  ArrowLeftRight,
  Bot,
  CornerDownRight,
  FileCode,
  Database,
  Unlink,
  Fish,
  FlaskConical,
  Skull,
  GitCompare,
  Regex,
  FileDown,
  NotebookPen,
  MonitorCheck,
  BellRing,
} from 'lucide-react'
import { clsx } from 'clsx'

const NAV = [
  {
    section: 'DASHBOARD',
    items: [
      { label: 'Overview',            href: '/',                     icon: LayoutDashboard },
    ],
  },
  {
    section: 'AUTOMATION',
    items: [
      { label: 'Auto Scanner',        href: '/tools/automation',     icon: Zap },
    ],
  },
  {
    section: 'INTELLIGENCE',
    items: [
      { label: 'IP Lookup',           href: '/tools/ip',             icon: Globe },
      { label: 'Domain Analyzer',     href: '/tools/domain',         icon: Search },
      { label: 'URL Scanner',         href: '/tools/url',            icon: Crosshair },
      { label: 'Email OSINT',         href: '/tools/email',          icon: Radio },
      { label: 'IOC Lookup',          href: '/tools/ioc',            icon: FileSearch },
    ],
  },
  {
    section: 'RECON',
    items: [
      { label: 'Subdomain Enum',      href: '/tools/subdomains',     icon: Layers },
      { label: 'Reverse IP',          href: '/tools/reverseip',      icon: Network },
      { label: 'BGP / ASN',           href: '/tools/asn',            icon: ScanSearch },
      { label: 'DNS Resolver',        href: '/tools/dns',            icon: Wifi },
      { label: 'Cert Transparency',   href: '/tools/certs',          icon: ShieldCheck },
      { label: 'Username OSINT',      href: '/tools/username',       icon: User },
      { label: 'Wayback Machine',     href: '/tools/wayback',        icon: Archive },
      { label: 'Favicon Hash',        href: '/tools/favicon',        icon: Fingerprint },
      { label: 'Traceroute',          href: '/tools/traceroute',     icon: Route },
      { label: 'WHOIS History',       href: '/tools/whoishistory',   icon: History },
      { label: 'BGP Hijack Check',    href: '/tools/bgphijack',      icon: Flag },
      { label: 'Google Dorks',        href: '/tools/dorks',          icon: Search },
      { label: 'Scope Manager',       href: '/tools/scope',          icon: Target },
    ],
  },
  {
    section: 'WEB ANALYSIS',
    items: [
      { label: 'HTTP Headers',        href: '/tools/headers',        icon: ShieldAlert },
      { label: 'WAF Detector',        href: '/tools/waf',            icon: Shield },
      { label: 'Tech Fingerprinter',  href: '/tools/tech',           icon: Cpu },
      { label: 'SSL Inspector',       href: '/tools/ssl',            icon: Lock },
      { label: 'Port Scanner',        href: '/tools/portscan',       icon: Terminal },
      { label: 'CORS Checker',        href: '/tools/cors',           icon: ArrowLeftRight },
      { label: 'Robots.txt Parser',   href: '/tools/robots',         icon: Bot },
      { label: 'Open Redirect',       href: '/tools/openredirect',   icon: CornerDownRight },
      { label: 'CSP Analyzer',        href: '/tools/csp',            icon: FileCode },
    ],
  },
  {
    section: 'THREAT INTEL',
    items: [
      { label: 'CVE Explorer',        href: '/tools/cve',            icon: Shield },
      { label: 'Hash Scanner',        href: '/tools/hash',           icon: Hash },
      { label: 'Exploit Search',      href: '/tools/exploits',       icon: Bug },
      { label: 'Default Creds',       href: '/tools/defaultcreds',   icon: KeySquare },
      { label: 'Shodan Search',       href: '/tools/shodan',         icon: Database },
      { label: 'URLhaus Lookup',      href: '/tools/urlhaus',        icon: Unlink },
      { label: 'PhishTank Check',     href: '/tools/phishtank',      icon: Fish },
      { label: 'ThreatFox IOC',       href: '/tools/threatfox',      icon: FlaskConical },
      { label: 'Ransomware Tracker',  href: '/tools/ransomware',     icon: Skull },
    ],
  },
  {
    section: 'EMAIL / PKI',
    items: [
      { label: 'Email Security',      href: '/tools/emailsec',       icon: MailCheck },
    ],
  },
  {
    section: 'ANALYSIS',
    items: [
      { label: 'Password Audit',      href: '/tools/password',       icon: KeyRound },
      { label: 'Hash Tools',          href: '/tools/hashtools',      icon: Terminal },
      { label: 'Fuzzy Hash (SSDEEP)', href: '/tools/ssdeep',         icon: GitCompare },
      { label: 'JWT Analyzer',        href: '/tools/jwt',            icon: Lock },
      { label: 'CVSS Calculator',     href: '/tools/cvss',           icon: Calculator },
    ],
  },
  {
    section: 'UTILITIES',
    items: [
      { label: 'Payload Generator',   href: '/tools/payloads',       icon: Swords },
      { label: 'Encoder / Decoder',   href: '/tools/encoder',        icon: Code2 },
      { label: 'Token Generator',     href: '/tools/tokens',         icon: Coins },
      { label: 'Hex / Binary',        href: '/tools/hexbin',         icon: Binary },
      { label: 'Regex Tester',        href: '/tools/regex',          icon: Regex },
    ],
  },
  {
    section: 'ASSET MONITOR',
    items: [
      { label: 'Assets',           href: '/tools/monitor/assets',          icon: MonitorCheck },
      { label: 'Alerts',           href: '/tools/monitor/alerts',          icon: BellRing     },
      { label: 'Vulnerabilities',  href: '/tools/monitor/vulnerabilities', icon: ShieldAlert  },
    ],
  },
  {
    section: 'REPORTING',
    items: [
      { label: 'Report Builder',      href: '/tools/export',         icon: FileDown },
      { label: 'Investigation Notes', href: '/tools/notes',          icon: NotebookPen },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-none flex flex-col bg-cyber-surface border-r border-cyber-border overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded border border-cyber-cyan/40 flex items-center justify-center bg-cyber-cyan/5">
            <Shield size={14} className="text-cyber-cyan" />
          </div>
          <div>
            <p className="font-mono text-xs font-700 tracking-widest text-cyber-text-hi uppercase">
              CyberOps
            </p>
            <p className="font-mono text-[9px] text-cyber-muted tracking-widest uppercase">
              Operations Ctr
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-4">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="px-2 mb-1 font-mono text-[9px] font-600 tracking-[0.2em] text-cyber-muted uppercase">
              {section}
            </p>
            <ul className="space-y-0.5">
              {items.map(({ label, href, icon: Icon, soon }: { label: string; href: string; icon: LucideIcon; soon?: boolean }) => {
                const active = pathname === href
                return (
                  <li key={href}>
                    <Link
                      href={soon ? '#' : href}
                      className={clsx(
                        'flex items-center gap-2.5 px-2 py-1.5 rounded text-xs font-mono transition-all group',
                        active
                          ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20'
                          : soon
                            ? 'text-cyber-muted cursor-not-allowed opacity-50'
                            : 'text-cyber-text hover:text-cyber-cyan hover:bg-cyber-cyan/5',
                      )}
                      onClick={e => soon && e.preventDefault()}
                    >
                      <Icon
                        size={13}
                        className={clsx(
                          active ? 'text-cyber-cyan' : 'text-cyber-muted group-hover:text-cyber-cyan',
                        )}
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {soon && (
                        <span className="text-[8px] font-mono text-cyber-muted border border-cyber-border rounded px-1 py-px">
                          SOON
                        </span>
                      )}
                      {active && <ChevronRight size={10} className="text-cyber-cyan" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Status bar */}
      <div className="px-4 py-3 border-t border-cyber-border">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse-slow" />
          <span className="font-mono text-[9px] text-cyber-green tracking-widest uppercase">
            System Online
          </span>
        </div>
        <p className="font-mono text-[8px] text-cyber-muted mt-0.5 tracking-wider">
          All modules operational
        </p>
      </div>
    </aside>
  )
}
