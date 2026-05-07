import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export interface WhoisEvent {
  action: string
  date: string
}

export interface WhoisHistoryResult {
  domain: string
  registrar?: string
  registrarUrl?: string
  registrarAbuseEmail?: string
  created?: string
  updated?: string
  expires?: string
  nameservers: string[]
  status: string[]
  dnssec?: string
  rawText?: string
  events: WhoisEvent[]
  error?: string
}

function extractField(text: string, ...fields: string[]): string | undefined {
  for (const field of fields) {
    const re = new RegExp(`^${field}:\\s*(.+)$`, 'im')
    const m = text.match(re)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return undefined
}

function extractFieldAll(text: string, ...fields: string[]): string[] {
  for (const field of fields) {
    const re = new RegExp(`^${field}:\\s*(.+)$`, 'gim')
    const matches = [...text.matchAll(re)].map(m => m[1].trim()).filter(Boolean)
    if (matches.length > 0) return matches
  }
  return []
}

function toIso(raw?: string): string | undefined {
  if (!raw) return undefined
  try {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? undefined : d.toISOString()
  } catch { return undefined }
}

// TLD-specific RDAP server overrides for ccTLDs not covered by rdap.org bootstrap
const RDAP_OVERRIDES: Record<string, string> = {
  'be':  'https://rdap.dns.be/domain/',
  'nl':  'https://rdap.domain-registry.nl/domain/',
  'uk':  'https://rdap.nominet.uk/domain/',
  'de':  'https://rdap.denic.de/domain/',
  'fr':  'https://rdap.nic.fr/domain/',
  'eu':  'https://rdap.eu/domain/',
  'au':  'https://rdap.auda.org.au/domain/',
  'ca':  'https://rdap.cira.ca/domain/',
  'br':  'https://rdap.registro.br/domain/',
  'jp':  'https://rdap.jprs.jp/domain/',
  'ch':  'https://rdap.nic.ch/domain/',
  'at':  'https://rdap.nic.at/domain/',
  'pl':  'https://rdap.dns.pl/v1/domain/',
  'se':  'https://rdap.iis.se/domain/',
  'no':  'https://rdap.norid.no/domain/',
  'dk':  'https://rdap.dk-hostmaster.dk/v1/domain/',
  'fi':  'https://rdap.ficora.fi/domain/',
  'nz':  'https://rdap.srs.net.nz/domain/',
  'us':  'https://rdap.arin.net/registry/domain/',
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.trim().toLowerCase()
  if (!domain) return NextResponse.json({ error: 'domain is required' }, { status: 400 })

  if (!/^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
  }

  const tld = domain.split('.').pop() ?? ''
  const rdapBase = RDAP_OVERRIDES[tld] ?? `https://rdap.org/domain/`
  const rdapUrl  = `${rdapBase}${encodeURIComponent(domain)}`

  const [whoisSettled, rdapSettled] = await Promise.allSettled([
    fetch(`https://api.hackertarget.com/whois/?q=${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 3600 },
    }),
    fetch(rdapUrl, {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 3600 },
    }),
  ])

  const rawText =
    whoisSettled.status === 'fulfilled' && whoisSettled.value.ok
      ? await whoisSettled.value.text()
      : ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rdap: any =
    rdapSettled.status === 'fulfilled' && rdapSettled.value.ok
      ? await rdapSettled.value.json()
      : null

  // ── Parse raw WHOIS text ───────────────────────────────────────────────────
  const rawCreated = toIso(extractField(rawText,
    'Creation Date', 'Registered On', 'Domain Registration Date', 'Registered', 'created'))
  const rawUpdated = toIso(extractField(rawText,
    'Updated Date', 'Last Updated On', 'Last Modified', 'modified'))
  const rawExpires = toIso(extractField(rawText,
    'Registry Expiry Date', 'Registrar Registration Expiration Date',
    'Expiry Date', 'Expiration Date', 'paid-till'))

  const rawRegistrar    = extractField(rawText, 'Registrar')
  const rawRegistrarUrl = extractField(rawText, 'Registrar URL')
  const rawAbuseEmail   = extractField(rawText, 'Registrar Abuse Contact Email')
  const rawDnssec       = extractField(rawText, 'DNSSEC')
  const rawNameservers  = extractFieldAll(rawText, 'Name Server').map(ns => ns.toLowerCase())
  const rawStatus       = extractFieldAll(rawText, 'Domain Status').map(s => s.split(/\s+/)[0])

  // ── RDAP enrichment ────────────────────────────────────────────────────────
  const events: WhoisEvent[] = []
  let created  = rawCreated
  let updated  = rawUpdated
  let expires  = rawExpires
  let registrar = rawRegistrar
  const rdapNameservers: string[] = []

  if (rdap) {
    for (const ev of (rdap.events ?? []) as { eventAction: string; eventDate: string }[]) {
      events.push({ action: ev.eventAction, date: ev.eventDate })
    }
    created  = events.find(e => e.action === 'registration')?.date ?? created
    updated  = events.find(e => e.action === 'last changed')?.date ?? updated
    expires  = events.find(e => e.action === 'expiration')?.date   ?? expires

    for (const ns of rdap.nameservers ?? []) {
      rdapNameservers.push((ns.ldhName as string)?.toLowerCase())
    }

    const reg = (rdap.entities ?? []).find((e: { roles: string[] }) => e.roles?.includes('registrar'))
    const fn  = reg?.vcardArray?.[1]?.find((v: string[]) => v[0] === 'fn')
    if (fn) registrar = fn[3]
  }

  return NextResponse.json<WhoisHistoryResult>({
    domain,
    registrar,
    registrarUrl:        rawRegistrarUrl,
    registrarAbuseEmail: rawAbuseEmail,
    created,
    updated,
    expires,
    nameservers: rdapNameservers.length > 0 ? rdapNameservers : rawNameservers.filter(Boolean),
    status:      rawStatus.filter(Boolean),
    dnssec:      rawDnssec,
    rawText:     rawText.slice(0, 5000),
    events,
    ...(!created && !updated && !registrar && nameservers.length === 0 && events.length === 0
      ? { error: 'WHOIS lookup failed or domain not found' } : {}),
  })
}
