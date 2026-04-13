import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const ip = req.nextUrl.searchParams.get('ip')?.trim()
  if (!ip) return NextResponse.json({ error: 'ip required' }, { status: 400 })

  try {
    const res = await fetch(`https://api.hackertarget.com/reverseiplookup/?q=${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'CyberOps-Scanner/1.0' },
    })
    if (!res.ok) throw new Error(`HackerTarget returned ${res.status}`)
    const text = await res.text()

    if (text.includes('error') || text.includes('API count') || text.includes('No DNS')) {
      return NextResponse.json({ ip, domains: [], count: 0, note: text.trim() })
    }

    const domains = text.split('\n').map(l => l.trim()).filter(Boolean)
    return NextResponse.json({ ip, domains, count: domains.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Lookup failed' }, { status: 500 })
  }
}
