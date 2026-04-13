'use client'

import { usePathname } from 'next/navigation'
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
  const pathname       = usePathname()
  const { signOut }    = useClerk()
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [glitching, setGlitching] = useState(false)

  async function logout() {
    setGlitching(true)
    // Let the glitch animation play, then sign out and hard-reload
    setTimeout(async () => {
      await signOut()
      // Hard reload so the server layout re-evaluates auth and hides sidebar
      window.location.href = '/sign-in'
    }, 550)
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
    <>
      {/* Glitch-out logout overlay */}
      {glitching && (
        <div className="fixed inset-0 z-[9999] pointer-events-none animate-glitch-out origin-center">
          {/* CRT scan lines */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,245,212,0.04) 3px, rgba(0,245,212,0.04) 4px)',
            }}
          />
          {/* Red tint during glitch */}
          <div className="absolute inset-0 bg-[#ff3366]/8" />
          {/* Cyan flash bar */}
          <div className="absolute left-0 right-0 h-[2px] top-1/2 bg-[#00f5d4]/60 blur-[1px]" />
        </div>
      )}

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
            disabled={glitching}
            title="Log out"
            className="flex items-center gap-1.5 text-cyber-muted hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <LogOut size={11} />
            <span className="font-mono text-[10px] tracking-widest uppercase">Logout</span>
          </button>
        </div>
      </header>
    </>
  )
}
