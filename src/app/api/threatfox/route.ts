import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export interface ThreatFoxIoc {
  id:               string
  ioc:              string
  iocType:          string
  iocTypeDesc:      string
  threatType:       string
  threatTypeDesc:   string
  malware:          string
  malwarePrintable: string
  malwareMwmpUrl:   string | null
  confidence:       number
  firstSeen:        string
  lastSeen:         string | null
  reporter:         string
  reference:        string | null
  tags:             string[] | null
}

export interface ThreatFoxResult {
  query:     string
  queryType: string
  iocs:      ThreatFoxIoc[]
  total:     number
  error?:    string
}

function detectType(q: string): string {
  if (/^[0-9a-f]{64}$/i.test(q))  return 'sha256_hash'
  if (/^[0-9a-f]{40}$/i.test(q))  return 'sha1_hash'
  if (/^[0-9a-f]{32}$/i.test(q))  return 'md5_hash'
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(q)) return 'ip:port'
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(q))     return 'ip'
  if (/^https?:\/\//.test(q))     return 'url'
  return 'domain'
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json({ error: 'q parameter required' }, { status: 400 })
  if (q.length < 3) return NextResponse.json({ error: 'Query too short' }, { status: 400 })

  const queryType = detectType(q)

  try {
    const res = await fetch('https://threatfox-api.abuse.ch/api/v1/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'search_ioc', search_term: q }),
      signal: AbortSignal.timeout(15_000),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()

    if (data.query_status === 'no_results') {
      return NextResponse.json({ query: q, queryType, iocs: [], total: 0 } as ThreatFoxResult)
    }

    if (data.query_status !== 'ok') {
      return NextResponse.json({ error: `ThreatFox: ${data.query_status}` }, { status: 502 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iocs: ThreatFoxIoc[] = (data.data ?? []).slice(0, 30).map((d: any) => ({
      id:               String(d.id ?? ''),
      ioc:              d.ioc              ?? '',
      iocType:          d.ioc_type         ?? '',
      iocTypeDesc:      d.ioc_type_desc    ?? '',
      threatType:       d.threat_type      ?? '',
      threatTypeDesc:   d.threat_type_desc ?? '',
      malware:          d.malware          ?? '',
      malwarePrintable: d.malware_printable ?? d.malware ?? '',
      malwareMwmpUrl:   d.malware_mwmp     ?? null,
      confidence:       Number(d.confidence_level ?? 0),
      firstSeen:        d.first_seen       ?? '',
      lastSeen:         d.last_seen        ?? null,
      reporter:         d.reporter         ?? '',
      reference:        d.reference        ?? null,
      tags:             Array.isArray(d.tags) ? d.tags : null,
    }))

    return NextResponse.json({ query: q, queryType, iocs, total: iocs.length } as ThreatFoxResult)
  } catch (e) {
    return NextResponse.json({ error: `Request failed: ${(e as Error).message}` }, { status: 502 })
  }
}
