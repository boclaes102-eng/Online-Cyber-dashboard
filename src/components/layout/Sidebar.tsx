'use client'

import React from 'react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield } from 'lucide-react'
import { clsx } from 'clsx'
import { NAV, ChevronRight } from '@/lib/nav'

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
