import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export interface WaybackSnapshot {
  timestamp: string
  date: string
  url: string
  status: string
  mime: string
  archiveUrl: string
}

export interface WaybackResult {
  url: string
  total: number
  earliest?: string
  latest?: string
  latestArchiveUrl?: string
  snapshots: WaybackSnapshot[]
  error?: string
}

function fmtTs(ts: string): string {
  // "20210101120000" → "2021-01-01 12:00:00"
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)} ${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}`
}

export async function GET(req: NextRequest) {
  let rawUrl = req.nextUrl.searchParams.get('url')?.trim()
  if (!rawUrl) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    rawUrl = 'https://' + rawUrl
  }

  // Basic URL validation
  try { new URL(rawUrl) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const cdxEndpoint =
      `https://web.archive.org/cdx/search/cdx` +
      `?url=${encodeURIComponent(rawUrl)}` +
      `&output=json&limit=50&fl=timestamp,original,statuscode,mimetype` +
      `&matchType=exact&collapse=digest`

    const [cdxRes, availRes] = await Promise.all([
      fetch(cdxEndpoint, { signal: AbortSignal.timeout(15_000), next: { revalidate: 300 } }),
      fetch(
        `https://archive.org/wayback/available?url=${encodeURIComponent(rawUrl)}`,
        { signal: AbortSignal.timeout(8_000) },
      ),
    ])

    const cdxRaw: string[][] = cdxRes.ok ? await cdxRes.json() : []
    const availData = availRes.ok ? await availRes.json() : null

    // First row is the header — skip it
    const rows = Array.isArray(cdxRaw) && cdxRaw.length > 1 ? cdxRaw.slice(1) : []

    const snapshots: WaybackSnapshot[] = rows
      .map(([ts, orig, statuscode, mime]) => ({
        timestamp: ts,
        date: fmtTs(ts),
        url: orig,
        status: statuscode,
        mime,
        archiveUrl: `https://web.archive.org/web/${ts}/${orig}`,
      }))
      .reverse() // newest first

    const latestArchiveUrl =
      (availData?.archived_snapshots?.closest?.url as string | undefined) ??
      snapshots[0]?.archiveUrl

    return NextResponse.json<WaybackResult>({
      url: rawUrl,
      total: snapshots.length,
      earliest: snapshots.at(-1)?.date,
      latest: snapshots[0]?.date,
      latestArchiveUrl,
      snapshots,
    })
  } catch (err) {
    return NextResponse.json<WaybackResult>({
      url: rawUrl,
      total: 0,
      snapshots: [],
      error: err instanceof Error ? err.message : 'Fetch failed',
    })
  }
}
