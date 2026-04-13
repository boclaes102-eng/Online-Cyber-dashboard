import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export interface PhishTankMatch {
  inDatabase:      boolean
  phishId:         string | null
  verified:        boolean
  valid:           boolean
  phishDetailPage: string | null
  submittedAt:     string | null
}

export interface PhishTankResult {
  url:          string
  verdict:      'phishing' | 'not_found' | 'unknown'
  verdictDetail: string
  phishtank:    PhishTankMatch | null
  error?:       string
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')?.trim() ?? ''
  if (!raw) return NextResponse.json({ error: 'url parameter required' }, { status: 400 })

  const url = raw.startsWith('http') ? raw : `https://${raw}`

  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const apiKey = process.env.PHISHTANK_API_KEY ?? ''

  try {
    const body = new URLSearchParams({ url, format: 'json' })
    if (apiKey) body.set('app_key', apiKey)

    const res = await fetch('https://checkurl.phishtank.com/checkurl/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':   'phishtank/cyberops',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      return NextResponse.json({
        url,
        verdict:       'unknown',
        verdictDetail: `PhishTank returned HTTP ${res.status}. ${apiKey ? '' : 'Consider adding a PHISHTANK_API_KEY environment variable for higher rate limits.'}`,
        phishtank:     null,
      } as PhishTankResult)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()
    const r = data?.results?.url0 ?? data?.results

    if (!r) {
      return NextResponse.json({
        url,
        verdict:       'not_found',
        verdictDetail: 'URL not found in PhishTank database.',
        phishtank:     null,
      } as PhishTankResult)
    }

    const inDatabase = r.in_database === true || r.in_database === 'true'
    const valid      = r.valid === true || r.valid === 'true'

    const match: PhishTankMatch = {
      inDatabase,
      phishId:         r.phish_id      ?? null,
      verified:        r.verified === true || r.verified === 'true',
      valid,
      phishDetailPage: r.phish_detail_page ?? null,
      submittedAt:     r.submitted_at       ?? null,
    }

    let verdict: PhishTankResult['verdict'] = 'not_found'
    let verdictDetail = 'URL is not in the PhishTank database — no phishing reports found.'

    if (inDatabase && valid) {
      verdict       = 'phishing'
      verdictDetail = `Confirmed phishing URL (PhishTank ID: ${match.phishId}). This URL has been verified as a phishing site.`
    } else if (inDatabase) {
      verdict       = 'phishing'
      verdictDetail = `URL is in the PhishTank database (ID: ${match.phishId}), but has not yet been verified by the community.`
    }

    return NextResponse.json({ url, verdict, verdictDetail, phishtank: match } as PhishTankResult)
  } catch (e) {
    return NextResponse.json({
      url,
      verdict:       'unknown',
      verdictDetail: `PhishTank API unavailable: ${(e as Error).message}. ${!apiKey ? 'Adding a PHISHTANK_API_KEY may help with rate limits.' : ''}`,
      phishtank:     null,
    } as PhishTankResult)
  }
}
