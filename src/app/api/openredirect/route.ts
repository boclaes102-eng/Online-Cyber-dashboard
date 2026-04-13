import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export interface RedirectTest {
  param:      string
  testUrl:    string
  status:     number | null
  location:   string | null
  vulnerable: boolean
  finding:    string
}

export interface OpenRedirectResult {
  url:             string
  tests:           RedirectTest[]
  vulnerable:      boolean
  vulnerableParams: string[]
  error?:          string
}

// .invalid is an IANA-reserved TLD — safe as a canary since it cannot be registered
const CANARY_HOST = 'cyberops-canary.invalid'
const CANARY_URL  = `https://${CANARY_HOST}/redir-test`

const PARAMS = [
  'redirect', 'redirect_uri', 'redirect_url', 'redirectUrl',
  'url', 'next', 'to', 'return', 'returnUrl', 'return_url',
  'redir', 'destination', 'dest', 'goto', 'continue',
  'forward', 'target', 'link', 'out', 'ref',
  'location', 'back', 'successUrl', 'cancelUrl',
  'ReturnUrl', 'callback',
]

const TIMEOUT_MS = 8_000

async function testParam(baseUrl: string, param: string): Promise<RedirectTest> {
  const u = new URL(baseUrl)
  u.searchParams.set(param, CANARY_URL)
  const testUrl = u.toString()

  try {
    const res = await fetch(testUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CyberOps/1.0)' },
    })

    const status   = res.status
    const location = res.headers.get('location')

    let vulnerable = false
    let finding    = `${status} — no redirect`

    if (location) {
      try {
        const locUrl = new URL(location, baseUrl)
        if (locUrl.hostname === CANARY_HOST) {
          vulnerable = true
          finding    = `VULNERABLE: ${status} → canary host confirmed open redirect`
        } else if ([301, 302, 303, 307, 308].includes(status)) {
          finding = `${status} → ${locUrl.hostname} (not canary, parameter may be processed)`
        }
      } catch {
        finding = `${status} — malformed Location header`
      }
    } else if ([301, 302, 303, 307, 308].includes(status)) {
      finding = `${status} — redirect without Location header`
    }

    return { param, testUrl, status, location, vulnerable, finding }
  } catch {
    return { param, testUrl, status: null, location: null, vulnerable: false, finding: 'Timeout / connection failed' }
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')?.trim() ?? ''
  if (!raw) return NextResponse.json({ error: 'url parameter required' }, { status: 400 })

  let targetUrl: URL
  try {
    targetUrl = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    if (!['http:', 'https:'].includes(targetUrl.protocol)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const url = targetUrl.toString()

  // Test all parameters in parallel
  const tests = await Promise.all(PARAMS.map(p => testParam(url, p)))

  const vulnTests      = tests.filter(t => t.vulnerable)
  const vulnerableParams = vulnTests.map(t => t.param)

  return NextResponse.json({
    url,
    tests,
    vulnerable: vulnTests.length > 0,
    vulnerableParams,
  } as OpenRedirectResult, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
