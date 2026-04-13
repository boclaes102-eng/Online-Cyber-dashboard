import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export interface TraceHop {
  num: number
  ip: string | null
  hostname: string | null
  avg: number | null
  best: number | null
  worst: number | null
  loss: number
  timeout: boolean
  // Enriched via ip-api.com batch
  org?: string
  as?: string         // "AS15169 Google LLC"
  country?: string
  countryCode?: string
  city?: string
  isPrivate?: boolean
}

export interface TraceResult {
  target: string
  hops: TraceHop[]
  hopCount: number
  reachedTarget: boolean
  error?: string
}

const PRIVATE_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|0\.)/

function isPrivate(ip: string): boolean {
  return PRIVATE_RE.test(ip)
}

// MTR report line: "  1.|-- hostname (ip)   0.0%   10   0.5   0.5   0.4   0.8   0.1"
const MTR_LINE = /^\s*(\d+)\.\|--\s+(.*?)\s{2,}([\d.]+)%\s+\d+\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/

function parseMtrLine(line: string): TraceHop | null {
  const m = line.match(MTR_LINE)
  if (!m) return null

  const num      = parseInt(m[1])
  const hostPart = m[2].trim()
  const loss     = parseFloat(m[3])
  const avg      = parseFloat(m[5])
  const best     = parseFloat(m[6])
  const worst    = parseFloat(m[7])
  const timeout  = hostPart === '???' || loss >= 100

  let ip: string | null = null
  let hostname: string | null = null

  if (!timeout) {
    // "hostname (1.2.3.4)" format
    const withParens = hostPart.match(/^(.+?)\s+\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)$/)
    if (withParens) {
      hostname = withParens[1].trim()
      ip = withParens[2]
      if (hostname === ip) hostname = null
    } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostPart)) {
      ip = hostPart
    } else {
      hostname = hostPart
    }
  }

  return {
    num, ip, hostname,
    avg:     timeout ? null : avg,
    best:    timeout ? null : best,
    worst:   timeout ? null : worst,
    loss,
    timeout,
  }
}

async function enrichIps(ips: string[]): Promise<Record<string, Record<string, string>>> {
  if (ips.length === 0) return {}
  try {
    const res = await fetch(
      'http://ip-api.com/batch?fields=status,query,country,countryCode,org,as,city',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ips.map(ip => ({ query: ip }))),
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!res.ok) return {}
    const data: Record<string, string>[] = await res.json()
    return Object.fromEntries(
      data.filter(d => d.status === 'success').map(d => [d.query, d]),
    )
  } catch {
    return {}
  }
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('target')?.trim()
  if (!target) return NextResponse.json({ error: 'target is required' }, { status: 400 })

  if (!/^[a-zA-Z0-9.\-_]+$/.test(target) || target.length > 253) {
    return NextResponse.json({ error: 'Invalid target — provide a hostname or IPv4 address' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://api.hackertarget.com/mtr/?q=${encodeURIComponent(target)}`,
      { signal: AbortSignal.timeout(35_000) },
    )
    if (!res.ok) throw new Error(`Upstream service returned ${res.status}`)

    const text = await res.text()

    if (
      text.startsWith('error') ||
      text.includes('API count exceeded') ||
      text.includes('Blocked')
    ) {
      return NextResponse.json<TraceResult>({
        target,
        hops: [],
        hopCount: 0,
        reachedTarget: false,
        error: text.trim().slice(0, 200),
      })
    }

    const hops: TraceHop[] = []
    for (const line of text.split('\n')) {
      const hop = parseMtrLine(line)
      if (hop) hops.push(hop)
    }

    // Batch-enrich all public IPs in one request
    const publicIps = [...new Set(
      hops.map(h => h.ip).filter((ip): ip is string => !!ip && !isPrivate(ip)),
    )]
    const enriched = await enrichIps(publicIps)

    for (const hop of hops) {
      if (!hop.ip) continue
      if (isPrivate(hop.ip)) {
        hop.isPrivate = true
      } else if (enriched[hop.ip]) {
        const d = enriched[hop.ip]
        hop.org         = d.org
        hop.as          = d.as
        hop.country     = d.country
        hop.countryCode = d.countryCode
        hop.city        = d.city
        hop.isPrivate   = false
      }
    }

    const lastHop = hops.at(-1)
    const reachedTarget =
      !!lastHop && !lastHop.timeout && lastHop.loss < 50

    return NextResponse.json<TraceResult>({
      target,
      hops,
      hopCount: hops.length,
      reachedTarget,
    })
  } catch (err) {
    return NextResponse.json<TraceResult>({
      target,
      hops: [],
      hopCount: 0,
      reachedTarget: false,
      error: err instanceof Error ? err.message : 'Traceroute failed',
    })
  }
}
