import { NextRequest, NextResponse } from 'next/server'
import type { DomainResult, DnsRecord, CertEntry } from '@/lib/types'

export const runtime = 'nodejs'

const DNS_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA'] as const

async function resolveDns(domain: string, type: string): Promise<DnsRecord[]> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
      { signal: AbortSignal.timeout(6_000), next: { revalidate: 300 } }
    )
    const data = await res.json()
    if (!data.Answer) return []
    return data.Answer.map((r: { name: string; data: string; TTL: number }) => ({
      type,
      name: r.name.replace(/\.$/, ''),
      value: r.data.replace(/\.$/, ''),
      ttl: r.TTL,
    }))
  } catch { return [] }
}

async function fetchCerts(domain: string): Promise<CertEntry[]> {
  try {
    const res = await fetch(
      `https://crt.sh/?q=%.${encodeURIComponent(domain)}&output=json`,
      { signal: AbortSignal.timeout(10_000), next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data: Array<{
      id: number; logged_at: string; not_before: string
      not_after: string; name_value: string; issuer_name: string
    }> = await res.json()

    // Deduplicate by name+issuer
    const seen = new Set<string>()
    return data
      .filter(c => {
        const key = `${c.name_value}|${c.issuer_name}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 30)
      .map(c => ({
        id:         c.id,
        loggedAt:   c.logged_at,
        notBefore:  c.not_before,
        notAfter:   c.not_after,
        name:       c.name_value,
        issuerName: c.issuer_name,
      }))
  } catch { return [] }
}

async function fetchRdap(domain: string) {
  try {
    const res = await fetch(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      { signal: AbortSignal.timeout(8_000), next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.trim().toLowerCase()
  if (!domain) return NextResponse.json({ error: 'domain parameter required' }, { status: 400 })

  try {
    // Fetch DNS records and certs in parallel
    const [dnsResults, certs, rdap] = await Promise.all([
      Promise.all(DNS_TYPES.map(t => resolveDns(domain, t))),
      fetchCerts(domain),
      fetchRdap(domain),
    ])

    const dns: DnsRecord[] = dnsResults.flat()

    // Extract unique subdomains from certs
    const subdomains = [
      ...new Set(
        certs
          .flatMap(c => c.name.split('\n'))
          .map(n => n.replace(/^\*\./, '').trim().toLowerCase())
          .filter(n => n.endsWith(`.${domain}`) || n === domain)
      ),
    ].slice(0, 50)

    // Parse RDAP for WHOIS-like data
    let whois
    if (rdap) {
      const ns = rdap.nameservers?.map((n: { ldhName: string }) => n.ldhName?.toLowerCase()) ?? []
      const events = rdap.events ?? []
      const getEvent = (action: string) =>
        events.find((e: { eventAction: string; eventDate: string }) => e.eventAction === action)?.eventDate
      const registrar = rdap.entities
        ?.find((e: { roles: string[] }) => e.roles?.includes('registrar'))
        ?.vcardArray?.[1]
        ?.find((v: string[]) => v[0] === 'fn')?.[3]

      whois = {
        domain,
        registrar,
        created: getEvent('registration'),
        updated: getEvent('last changed'),
        expires: getEvent('expiration'),
        nameservers: ns,
        status: rdap.status ?? [],
      }
    }

    const result: DomainResult = { domain, dns, whois, certs, subdomains }
    return NextResponse.json<DomainResult>(result)
  } catch (err) {
    return NextResponse.json<DomainResult>({
      domain: domain ?? '',
      dns: [], certs: [], subdomains: [],
      error: err instanceof Error ? err.message : 'Lookup failed',
    })
  }
}
