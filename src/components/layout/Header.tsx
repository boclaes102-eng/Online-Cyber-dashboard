'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useClerk } from '@clerk/nextjs'
import { Clock, Activity, LogOut } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/':                      'Overview',
  '/tools/ip':              'IP Intelligence',
  '/tools/domain':          'Domain Analyzer',
  '/tools/url':             'URL Scanner',
  '/tools/email':           'Email OSINT',
  '/tools/cve':             'CVE Explorer',
  '/tools/hash':            'Hash Scanner',
  '/tools/ioc':             'IOC Lookup',
  '/tools/password':        'Password Auditor',
  '/tools/hashtools':       'Hash Tools',
  '/tools/jwt':             'JWT Analyzer',
  '/tools/dns':             'DNS Resolver',
  '/tools/ssl':             'SSL Inspector',
  '/tools/portscan':        'Port Scanner',
  // New tools
  '/tools/subdomains':      'Subdomain Enumerator',
  '/tools/reverseip':       'Reverse IP Lookup',
  '/tools/tech':            'Tech Fingerprinter',
  '/tools/dorks':           'Google Dork Builder',
  '/tools/headers':         'HTTP Security Headers',
  '/tools/waf':             'WAF / Firewall Detector',
  '/tools/emailsec':        'Email Security',
  '/tools/exploits':        'Exploit Search',
  '/tools/cvss':            'CVSS Calculator',
  '/tools/defaultcreds':    'Default Credentials DB',
  '/tools/payloads':        'Payload Generator',
  '/tools/encoder':         'Encoder / Decoder',
  '/tools/tokens':          'Token Generator',
  '/tools/asn':             'BGP / ASN Analyzer',
  '/tools/scope':           'Scope Manager',
  '/tools/automation':      'Automation Scanner',
}

export default function Header() {
  const pathname    = usePathname()
  const router      = useRouter()
  const { signOut } = useClerk()
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  async function logout() {
    await signOut()
    router.push('/sign-in')
  }

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', { hour12: false }))
      setDate(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const title = PAGE_TITLES[pathname] ?? 'CyberOps'

  return (
    <header className="h-11 flex-none flex items-center justify-between px-6 bg-cyber-surface border-b border-cyber-border">
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">
          CYBEROPS
        </span>
        <span className="text-cyber-border font-mono">›</span>
        <span className="font-mono text-xs text-cyber-text-hi tracking-wide">
          {title}
        </span>
      </div>

      {/* Right — status + clock */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <Activity size={11} className="text-cyber-green" />
          <span className="font-mono text-[10px] text-cyber-green tracking-widest uppercase">
            Operational
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-cyber-muted">
          <Clock size={11} />
          <span className="font-mono text-[10px] tracking-wider">
            {date} &nbsp; {time}
          </span>
        </div>
        <button
          onClick={logout}
          title="Log out"
          className="flex items-center gap-1.5 text-cyber-muted hover:text-red-400 transition-colors"
        >
          <LogOut size={11} />
          <span className="font-mono text-[10px] tracking-widest uppercase">Logout</span>
        </button>
      </div>
    </header>
  )
}
