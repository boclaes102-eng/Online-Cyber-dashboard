import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { HashType } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Hash detection ─────────────────────────────────────────────────────────
export function detectHashType(hash: string): HashType {
  const h = hash.trim().toLowerCase()
  if (/^[0-9a-f]{32}$/.test(h))  return 'MD5'
  if (/^[0-9a-f]{40}$/.test(h))  return 'SHA1'
  if (/^[0-9a-f]{64}$/.test(h))  return 'SHA256'
  if (/^[0-9a-f]{128}$/.test(h)) return 'SHA512'
  return 'UNKNOWN'
}

// ── IP helpers ─────────────────────────────────────────────────────────────
export function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4) return false
  const [a, b] = parts
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 127 ||
    ip === '::1' ||
    ip === 'localhost'
  )
}

export function isValidIp(ip: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
    ip.split('.').every(p => Number(p) >= 0 && Number(p) <= 255)
}

export function isValidDomain(domain: string): boolean {
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain.trim())
}

// ── Date formatting ────────────────────────────────────────────────────────
export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60)    return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)     return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ── CVSS helpers ───────────────────────────────────────────────────────────
export function severityFromScore(score: number): string {
  if (score >= 9.0) return 'CRITICAL'
  if (score >= 7.0) return 'HIGH'
  if (score >= 4.0) return 'MEDIUM'
  if (score >  0.0) return 'LOW'
  return 'NONE'
}

export function severityColor(sev: string): string {
  switch (sev.toUpperCase()) {
    case 'CRITICAL': return 'text-[#ff3366]'
    case 'HIGH':     return 'text-[#ff6633]'
    case 'MEDIUM':   return 'text-[#ffaa00]'
    case 'LOW':      return 'text-[#00ff88]'
    default:         return 'text-cyber-muted'
  }
}

// ── Crack time estimate ────────────────────────────────────────────────────
export function crackTimeEstimate(searchSpaceBits: number): string {
  // Assume 1 billion guesses/second (GPU cluster)
  const guesses = Math.pow(2, searchSpaceBits)
  const seconds = guesses / 1_000_000_000
  if (seconds < 1)        return '< 1 second'
  if (seconds < 60)       return `${Math.round(seconds)} seconds`
  if (seconds < 3600)     return `${Math.round(seconds / 60)} minutes`
  if (seconds < 86400)    return `${Math.round(seconds / 3600)} hours`
  if (seconds < 2_592_000) return `${Math.round(seconds / 86400)} days`
  if (seconds < 31_536_000) return `${Math.round(seconds / 2_592_000)} months`
  const years = seconds / 31_536_000
  if (years < 1e6)        return `${years.toExponential(1)} years`
  return 'centuries'
}

// ── Number formatting ──────────────────────────────────────────────────────
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}
