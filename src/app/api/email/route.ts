import { NextRequest, NextResponse } from 'next/server'
import type { EmailOsintResult, DnsRecord } from '@/lib/types'

export const runtime = 'nodejs'

// Common disposable email domains
const DISPOSABLE = new Set([
  'mailinator.com','guerrillamail.com','10minutemail.com','tempmail.com','throwaway.email',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info','spam4.me',
  'yopmail.com','maildrop.cc','fakeinbox.com','dispostable.com','trashmail.com',
  'trashmail.at','trashmail.io','trashmail.me','temp-mail.org','discard.email',
  'mailnesia.com','mailnull.com','spamgourmet.com','spamgourmet.net','jetable.org',
  'nospamfor.us','spamhereplease.com','discardmail.com','spamspot.com','wegwerfmail.de',
])

async function dohTxt(domain: string, name: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`,
      { signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    return (data.Answer ?? []).map((r: { data: string }) =>
      r.data.replace(/^"|"$/g, '').replace(/" "/g, '')
    )
  } catch { return [] }
}

async function dohMx(domain: string): Promise<DnsRecord[]> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      { signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    return (data.Answer ?? []).map((r: { name: string; data: string; TTL: number }) => ({
      type: 'MX', name: r.name.replace(/\.$/, ''), value: r.data.replace(/\.$/, ''), ttl: r.TTL,
    }))
  } catch { return [] }
}

async function checkGravatar(email: string): Promise<boolean> {
  // Server-side MD5 needed — use crypto module
  const { createHash } = await import('crypto')
  const hash = createHash('md5').update(email.trim().toLowerCase()).digest('hex')
  try {
    const res = await fetch(`https://www.gravatar.com/avatar/${hash}?d=404`, {
      method: 'HEAD', signal: AbortSignal.timeout(4000),
    })
    return res.ok
  } catch { return false }
}

async function checkHibpDomain(domain: string): Promise<{ name: string; breachDate: string; dataClasses: string[] }[]> {
  try {
    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breaches?domain=${encodeURIComponent(domain)}`,
      { headers: { 'User-Agent': 'CyberOps-Dashboard' }, signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return []
    const data: { Name: string; BreachDate: string; DataClasses: string[] }[] = await res.json()
    return data.map(b => ({ name: b.Name, breachDate: b.BreachDate, dataClasses: b.DataClasses }))
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email parameter required' }, { status: 400 })

  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!emailRegex.test(email)) {
    return NextResponse.json<EmailOsintResult>({
      email, valid: false, domain: '', disposable: false,
      mx: [], gravatarExists: false, breachChecked: false,
      error: 'Invalid email format',
    })
  }

  const domain = email.split('@')[1]

  const [mx, txtDomain, txtDmarc, gravatarExists, domainBreaches] = await Promise.all([
    dohMx(domain),
    dohTxt(domain, domain),
    dohTxt(domain, `_dmarc.${domain}`),
    checkGravatar(email),
    checkHibpDomain(domain),
  ])

  const spf   = txtDomain.find(t => t.startsWith('v=spf1')) ?? undefined
  const dmarc = txtDmarc.find(t => t.startsWith('v=DMARC1')) ?? undefined

  const result: EmailOsintResult = {
    email,
    valid:         true,
    domain,
    disposable:    DISPOSABLE.has(domain),
    mx,
    spf,
    dmarc,
    gravatarExists,
    domainBreaches: domainBreaches.length ? domainBreaches : undefined,
    breachChecked: true,
  }
  return NextResponse.json(result)
}
