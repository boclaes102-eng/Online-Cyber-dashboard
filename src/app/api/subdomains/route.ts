import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

interface SubEntry { name: string; source: string }

async function queryCrtSh(domain: string): Promise<string[]> {
  try {
    const res = await fetch(`https://crt.sh/?q=%25.${domain}&output=json`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'CyberOps-Scanner/1.0' },
    })
    if (!res.ok) return []
    const data: { name_value: string }[] = await res.json()
    const names = new Set<string>()
    for (const entry of data) {
      entry.name_value.split('\n').forEach(n => {
        const clean = n.trim().replace(/^\*\./, '').toLowerCase()
        if (clean.endsWith(`.${domain}`) || clean === domain) names.add(clean)
      })
    }
    return [...names]
  } catch { return [] }
}

async function queryHackerTarget(domain: string): Promise<string[]> {
  try {
    const res = await fetch(`https://api.hackertarget.com/hostsearch/?q=${domain}`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'CyberOps-Scanner/1.0' },
    })
    if (!res.ok) return []
    const text = await res.text()
    if (text.includes('error') || text.includes('API count')) return []
    const names: string[] = []
    for (const line of text.split('\n')) {
      const [host] = line.split(',')
      if (host && host.trim().endsWith(domain)) names.push(host.trim().toLowerCase())
    }
    return names
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.trim().toLowerCase()
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })

  const [crtNames, htNames] = await Promise.all([
    queryCrtSh(domain),
    queryHackerTarget(domain),
  ])

  const seen = new Map<string, SubEntry>()

  for (const n of crtNames) {
    if (!seen.has(n)) seen.set(n, { name: n, source: 'crt.sh' })
  }
  for (const n of htNames) {
    if (!seen.has(n)) seen.set(n, { name: n, source: 'HackerTarget' })
    else {
      const e = seen.get(n)!
      if (!e.source.includes('HackerTarget')) e.source += ', HackerTarget'
    }
  }

  const results = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({
    domain,
    count: results.length,
    subdomains: results,
    sources: ['crt.sh (certificate transparency)', 'HackerTarget hostsearch'],
  })
}
