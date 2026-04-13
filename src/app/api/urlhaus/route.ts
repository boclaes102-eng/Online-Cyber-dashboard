import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export interface UrlhausEntry {
  id:          string
  url:         string
  urlStatus:   'online' | 'offline' | 'unknown'
  host:        string
  dateAdded:   string
  threat:      string
  reporter:    string
  tags:        string[] | null
  reference:   string
}

export interface UrlhausResult {
  query:      string
  queryType:  'url' | 'host'
  found:      boolean
  urlStatus:  'online' | 'offline' | 'unknown' | null
  threat:     string | null
  tags:       string[] | null
  reporter:   string | null
  dateAdded:  string | null
  reference:  string | null
  blacklists: { spamhausDbl: string | null; surbl: string | null } | null
  // for host queries — may return multiple URLs
  urls:       UrlhausEntry[]
  error?:     string
}

async function queryUrlhaus(body: URLSearchParams): Promise<Response> {
  return fetch('https://urlhaus-api.abuse.ch/v1/url/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  })
}

async function queryHostUrlhaus(body: URLSearchParams): Promise<Response> {
  return fetch('https://urlhaus-api.abuse.ch/v1/host/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  })
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json({ error: 'q parameter required' }, { status: 400 })

  // Detect if query looks like a full URL or a hostname/IP
  const isUrl = q.startsWith('http://') || q.startsWith('https://') || q.includes('/')
  const queryType: 'url' | 'host' = isUrl ? 'url' : 'host'

  try {
    if (queryType === 'url') {
      const body = new URLSearchParams({ url: q })
      const res  = await queryUrlhaus(body)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json()

      if (data.query_status === 'no_results' || data.query_status === 'invalid_url') {
        return NextResponse.json({
          query: q, queryType, found: false,
          urlStatus: null, threat: null, tags: null, reporter: null,
          dateAdded: null, reference: null, blacklists: null, urls: [],
        } as UrlhausResult)
      }

      return NextResponse.json({
        query:     q,
        queryType,
        found:     true,
        urlStatus: data.url_status   ?? 'unknown',
        threat:    data.threat       ?? null,
        tags:      data.tags         ?? null,
        reporter:  data.reporter     ?? null,
        dateAdded: data.dateadded    ?? null,
        reference: data.urlhaus_reference ?? null,
        blacklists: data.blacklists ? {
          spamhausDbl: data.blacklists.spamhaus_dbl ?? null,
          surbl:       data.blacklists.surbl        ?? null,
        } : null,
        urls: [],
      } as UrlhausResult)
    } else {
      // Host lookup
      const body = new URLSearchParams({ host: q })
      const res  = await queryHostUrlhaus(body)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json()

      if (data.query_status === 'no_results' || data.query_status === 'invalid_host') {
        return NextResponse.json({
          query: q, queryType, found: false,
          urlStatus: null, threat: null, tags: null, reporter: null,
          dateAdded: null, reference: null, blacklists: null, urls: [],
        } as UrlhausResult)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const urls: UrlhausEntry[] = (data.urls ?? []).slice(0, 50).map((u: any) => ({
        id:        u.id         ?? '',
        url:       u.url        ?? '',
        urlStatus: u.url_status ?? 'unknown',
        host:      data.host    ?? '',
        dateAdded: u.date_added ?? '',
        threat:    u.threat     ?? '',
        reporter:  u.reporter   ?? '',
        tags:      u.tags       ?? null,
        reference: u.urlhaus_reference ?? '',
      }))

      return NextResponse.json({
        query:     q,
        queryType,
        found:     urls.length > 0,
        urlStatus: null,
        threat:    data.urls?.[0]?.threat ?? null,
        tags:      null,
        reporter:  null,
        dateAdded: data.firstseen ?? null,
        reference: data.urlhaus_reference ?? null,
        blacklists: data.blacklists ? {
          spamhausDbl: data.blacklists.spamhaus_dbl ?? null,
          surbl:       data.blacklists.surbl        ?? null,
        } : null,
        urls,
      } as UrlhausResult)
    }
  } catch (e) {
    return NextResponse.json({ error: `Request failed: ${(e as Error).message}` }, { status: 502 })
  }
}
