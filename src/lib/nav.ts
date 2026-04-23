import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Globe, Search, Shield, Hash, KeyRound, FileSearch,
  Wifi, Lock, ChevronRight, Radio, Crosshair, Terminal, Cpu, ShieldAlert,
  ScanSearch, Network, MailCheck, Bug, Calculator, KeySquare, Code2, Coins,
  Layers, Swords, Binary, Target, Zap, ShieldCheck, User, Archive, Fingerprint,
  Route, History, Flag, ArrowLeftRight, Bot, CornerDownRight, FileCode, Database,
  Unlink, Fish, FlaskConical, Skull, GitCompare, Regex, FileDown, NotebookPen,
  MonitorCheck, BellRing, FolderOpen, Activity, Siren,
} from 'lucide-react'

export type NavItem = { label: string; href: string; icon: LucideIcon; soon?: boolean }
export type NavSection = { section: string; items: NavItem[] }

export const NAV: NavSection[] = [
  {
    section: 'DASHBOARD',
    items: [
      { label: 'Overview', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    section: 'AUTOMATION',
    items: [
      { label: 'Auto Scanner', href: '/tools/automation', icon: Zap },
    ],
  },
  {
    section: 'INTELLIGENCE',
    items: [
      { label: 'IP Lookup',       href: '/tools/ip',     icon: Globe      },
      { label: 'Domain Analyzer', href: '/tools/domain', icon: Search     },
      { label: 'URL Scanner',     href: '/tools/url',    icon: Crosshair  },
      { label: 'Email OSINT',     href: '/tools/email',  icon: Radio      },
      { label: 'IOC Lookup',      href: '/tools/ioc',    icon: FileSearch },
    ],
  },
  {
    section: 'RECON',
    items: [
      { label: 'Subdomain Enum',    href: '/tools/subdomains',   icon: Layers      },
      { label: 'Reverse IP',        href: '/tools/reverseip',    icon: Network     },
      { label: 'BGP / ASN',         href: '/tools/asn',          icon: ScanSearch  },
      { label: 'DNS Resolver',      href: '/tools/dns',          icon: Wifi        },
      { label: 'Cert Transparency', href: '/tools/certs',        icon: ShieldCheck },
      { label: 'Username OSINT',    href: '/tools/username',     icon: User        },
      { label: 'Wayback Machine',   href: '/tools/wayback',      icon: Archive     },
      { label: 'Favicon Hash',      href: '/tools/favicon',      icon: Fingerprint },
      { label: 'Traceroute',        href: '/tools/traceroute',   icon: Route       },
      { label: 'WHOIS History',     href: '/tools/whoishistory', icon: History     },
      { label: 'BGP Hijack Check',  href: '/tools/bgphijack',    icon: Flag        },
      { label: 'Google Dorks',      href: '/tools/dorks',        icon: Search      },
      { label: 'Scope Manager',     href: '/tools/scope',        icon: Target      },
    ],
  },
  {
    section: 'WEB ANALYSIS',
    items: [
      { label: 'HTTP Headers',       href: '/tools/headers',      icon: ShieldAlert      },
      { label: 'WAF Detector',       href: '/tools/waf',          icon: Shield           },
      { label: 'Tech Fingerprinter', href: '/tools/tech',         icon: Cpu              },
      { label: 'SSL Inspector',      href: '/tools/ssl',          icon: Lock             },
      { label: 'Port Scanner',       href: '/tools/portscan',     icon: Terminal         },
      { label: 'CORS Checker',       href: '/tools/cors',         icon: ArrowLeftRight   },
      { label: 'Robots.txt Parser',  href: '/tools/robots',       icon: Bot              },
      { label: 'Open Redirect',      href: '/tools/openredirect', icon: CornerDownRight  },
      { label: 'CSP Analyzer',       href: '/tools/csp',          icon: FileCode         },
    ],
  },
  {
    section: 'THREAT INTEL',
    items: [
      { label: 'CVE Explorer',       href: '/tools/cve',          icon: Shield       },
      { label: 'Hash Scanner',       href: '/tools/hash',         icon: Hash         },
      { label: 'Exploit Search',     href: '/tools/exploits',     icon: Bug          },
      { label: 'Default Creds',      href: '/tools/defaultcreds', icon: KeySquare    },
      { label: 'Shodan Search',      href: '/tools/shodan',       icon: Database     },
      { label: 'URLhaus Lookup',     href: '/tools/urlhaus',      icon: Unlink       },
      { label: 'PhishTank Check',    href: '/tools/phishtank',    icon: Fish         },
      { label: 'ThreatFox IOC',      href: '/tools/threatfox',    icon: FlaskConical },
      { label: 'Ransomware Tracker', href: '/tools/ransomware',   icon: Skull        },
    ],
  },
  {
    section: 'EMAIL / PKI',
    items: [
      { label: 'Email Security', href: '/tools/emailsec', icon: MailCheck },
    ],
  },
  {
    section: 'ANALYSIS',
    items: [
      { label: 'Password Audit',      href: '/tools/password',  icon: KeyRound   },
      { label: 'Hash Tools',          href: '/tools/hashtools', icon: Terminal   },
      { label: 'Fuzzy Hash (SSDEEP)', href: '/tools/ssdeep',    icon: GitCompare },
      { label: 'JWT Analyzer',        href: '/tools/jwt',       icon: Lock       },
      { label: 'CVSS Calculator',     href: '/tools/cvss',      icon: Calculator },
    ],
  },
  {
    section: 'UTILITIES',
    items: [
      { label: 'Payload Generator', href: '/tools/payloads', icon: Swords   },
      { label: 'Encoder / Decoder', href: '/tools/encoder',  icon: Code2    },
      { label: 'Token Generator',   href: '/tools/tokens',   icon: Coins    },
      { label: 'Hex / Binary',      href: '/tools/hexbin',   icon: Binary   },
      { label: 'Regex Tester',      href: '/tools/regex',    icon: Regex    },
    ],
  },
  {
    section: 'WORKSPACE',
    items: [
      { label: 'Recon Sessions', href: '/tools/workspace', icon: FolderOpen },
    ],
  },
  {
    section: 'ASSET MONITOR',
    items: [
      { label: 'Assets',          href: '/tools/monitor/assets',          icon: MonitorCheck },
      { label: 'Alerts',          href: '/tools/monitor/alerts',          icon: BellRing     },
      { label: 'Vulnerabilities', href: '/tools/monitor/vulnerabilities', icon: ShieldAlert  },
    ],
  },
  {
    section: 'SIEM',
    items: [
      { label: 'Event Timeline', href: '/tools/monitor/events',    icon: Activity },
      { label: 'Incidents',      href: '/tools/monitor/incidents', icon: Siren    },
    ],
  },
  {
    section: 'REPORTING',
    items: [
      { label: 'Report Builder',      href: '/tools/export', icon: FileDown    },
      { label: 'Investigation Notes', href: '/tools/notes',  icon: NotebookPen },
    ],
  },
]

// All tool items excluding the dashboard Overview
export const toolCount = NAV.flatMap(s => s.items).filter(i => i.href !== '/').length

export { ChevronRight }
