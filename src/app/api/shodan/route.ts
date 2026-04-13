import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export interface ShodanService {
  port:      number
  transport: string
  product:   string | null
  version:   string | null
  module:    string
  banner:    string | null
}

export interface ShodanHost {
  ip:          string
  hostnames:   string[]
  domains:     string[]
  org:         string | null
  isp:         string | null
  asn:         string | null
  country:     string | null
  countryCode: string | null
  city:        string | null
  os:          string | null
  services:    ShodanService[]
  vulns:       string[]
  tags:        string[]
  lastSeen:    string
}

export interface ShodanResult {
  query:    string
  mode:     'search' | 'host'
  total:    number
  hosts:    ShodanHost[]
  credits?: number
  error?:   string
}

const SHODAN_API = 'https://api.shodan.io'
const TIMEOUT    = 15_000
const IP_RE      = /^\d{1,3}(\.\d{1,3}){3}$/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseServices(dataArr: any[]): ShodanService[] {
  return (dataArr ?? []).map((d: any) => ({
    port:      Number(d.port ?? 0),
    transport: d.transport ?? 'tcp',
    product:   d.product   ?? null,
    version:   d.version   ?? null,
    module:    d._shodan?.module ?? '',
    banner:    typeof d.data === 'string' ? d.data.slice(0, 300) : null,
  }))
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.SHODAN_API_KEY ?? ''
  if (!apiKey) {
    return NextResponse.json({
      error: 'SHODAN_API_KEY is not configured. Add it to your .env.local file.',
    }, { status: 503 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json({ error: 'q parameter required' }, { status: 400 })

  // If the query is a bare IP address, use the host lookup endpoint
  const isIp   = IP_RE.test(q)
  const mode: 'host' | 'search' = isIp ? 'host' : 'search'

  try {
    if (mode === 'host') {
      const url = `${SHODAN_API}/shodan/host/${encodeURIComponent(q)}?key=${apiKey}&minify=false`
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) })

      if (res.status === 404) {
        return NextResponse.json({ query: q, mode, total: 0, hosts: [] } as ShodanResult)
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return NextResponse.json({ error: (err as any).error ?? `Shodan HTTP ${res.status}` }, { status: res.status })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d: any = await res.json()

      const host: ShodanHost = {
        ip:          d.ip_str       ?? q,
        hostnames:   d.hostnames    ?? [],
        domains:     d.domains      ?? [],
        org:         d.org          ?? null,
        isp:         d.isp          ?? null,
        asn:         d.asn          ?? null,
        country:     d.country_name ?? null,
        countryCode: d.country_code ?? null,
        city:        d.city         ?? null,
        os:          d.os           ?? null,
        services:    parseServices(d.data ?? []),
        vulns:       Object.keys(d.vulns ?? {}),
        tags:        d.tags         ?? [],
        lastSeen:    d.last_update  ?? '',
      }

      return NextResponse.json({ query: q, mode, total: 1, hosts: [host] } as ShodanResult)
    }

    // Search mode
    const page    = Number(req.nextUrl.searchParams.get('page') ?? '1')
    const url     = `${SHODAN_API}/shodan/host/search?key=${apiKey}&query=${encodeURIComponent(q)}&page=${page}`
    const res     = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: (err as any).error ?? `Shodan HTTP ${res.status}` }, { status: res.status })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()

    // Aggregate multiple banners per IP into one ShodanHost
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ipMap = new Map<string, ShodanHost>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const match of (data.matches ?? []) as any[]) {
      const ip = match.ip_str ?? ''
      if (!ip) continue

      if (!ipMap.has(ip)) {
        ipMap.set(ip, {
          ip,
          hostnames:   match.hostnames    ?? [],
          domains:     match.domains      ?? [],
          org:         match.org          ?? null,
          isp:         match.isp          ?? null,
          asn:         match.asn          ?? null,
          country:     match.country_name ?? null,
          countryCode: match.country_code ?? null,
          city:        match.city         ?? null,
          os:          match.os           ?? null,
          services:    [],
          vulns:       Object.keys(match.vulns ?? {}),
          tags:        match.tags ?? [],
          lastSeen:    match.timestamp ?? '',
        })
      }

      const host = ipMap.get(ip)!
      host.services.push({
        port:      Number(match.port ?? 0),
        transport: match.transport ?? 'tcp',
        product:   match.product   ?? null,
        version:   match.version   ?? null,
        module:    match._shodan?.module ?? '',
        banner:    typeof match.data === 'string' ? match.data.slice(0, 200) : null,
      })
      // Merge vulns
      for (const cve of Object.keys(match.vulns ?? {})) {
        if (!host.vulns.includes(cve)) host.vulns.push(cve)
      }
    }

    const hosts = [...ipMap.values()]

    return NextResponse.json({
      query: q, mode, total: data.total ?? hosts.length, hosts,
    } as ShodanResult)
  } catch (e) {
    return NextResponse.json({ error: `Request failed: ${(e as Error).message}` }, { status: 502 })
  }
}
