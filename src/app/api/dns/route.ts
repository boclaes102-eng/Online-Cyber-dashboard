import { NextRequest, NextResponse } from 'next/server'
import type { DnsResolveResult, DnsRecord } from '@/lib/types'

export const runtime = 'nodejs'

const SERVERS = [
  { name: 'Google',     url: 'https://dns.google/resolve'                              },
  { name: 'Cloudflare', url: 'https://cloudflare-dns.com/dns-query'                    },
  { name: 'Quad9',      url: 'https://dns.quad9.net:5053/dns-query'                    },
]

async function queryDoh(baseUrl: string, name: string, type: string): Promise<DnsRecord[]> {
  const res = await fetch(`${baseUrl}?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`, {
    headers: { Accept: 'application/dns-json' },
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) return []
  const data = await res.json()
  if (!data.Answer) return []
  return (data.Answer as { name: string; data: string; TTL: number; type: number }[]).map(r => ({
    type,
    name: r.name.replace(/\.$/, ''),
    value: r.data.replace(/\.$/, ''),
    ttl: r.TTL,
  }))
}

function toArpaName(ip: string): string {
  const parts = ip.split('.')
  if (parts.length === 4) return parts.reverse().join('.') + '.in-addr.arpa'
  // IPv6 — expand and reverse nibbles
  const expanded = ip.split(':').map(h => h.padStart(4, '0')).join('')
  return expanded.split('').reverse().join('.') + '.ip6.arpa'
}

export async function GET(req: NextRequest) {
  const sp   = req.nextUrl.searchParams
  const name = sp.get('name')?.trim().toLowerCase()
  const type = (sp.get('type') ?? 'A').toUpperCase()

  if (!name) return NextResponse.json({ error: 'name parameter required' }, { status: 400 })

  const queryName = type === 'PTR' ? toArpaName(name) : name

  try {
    const results = await Promise.allSettled(
      SERVERS.map(s => queryDoh(s.url, queryName, type))
    )

    // Merge & deduplicate records from all servers
    const seen   = new Set<string>()
    const merged: DnsRecord[] = []
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        r.value.forEach(rec => {
          const key = `${rec.type}|${rec.name}|${rec.value}`
          if (!seen.has(key)) { seen.add(key); merged.push(rec) }
        })
      }
    })

    const result: DnsResolveResult = { query: name, type, records: merged }
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json<DnsResolveResult>({
      query: name, type, records: [],
      error: err instanceof Error ? err.message : 'Query failed',
    })
  }
}
