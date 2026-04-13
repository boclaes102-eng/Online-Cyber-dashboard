import { NextRequest, NextResponse } from 'next/server'

// ─── Auth ────────────────────────────────────────────────────────────────────
const PUBLIC_PATHS = ['/login', '/api/auth']

// ─── Rate limiting ────────────────────────────────────────────────────────────
/**
 * Sliding-window in-memory rate limiter.
 * Default : 60 req / min per IP
 * Key routes: 20 req / min per IP (routes that consume paid API keys)
 *
 * NOTE: Each serverless instance owns its own Map. This is best-effort
 * protection against casual hammering. For a hard global cap, replace
 * the Map with Upstash Redis (@upstash/ratelimit).
 */
const WINDOW_MS     = 60_000  // 1-minute rolling window
const DEFAULT_LIMIT = 60
const KEY_LIMIT     = 20      // routes that burn external API keys

const KEY_ROUTES = new Set([
  '/api/ip',
  '/api/ioc',
  '/api/hash',
  '/api/url',
  '/api/portscan',
  '/api/exploits',
  '/api/emailsec',
  '/api/breach',
  '/api/username',   // spawns ~20 parallel outbound requests per call
  '/api/traceroute',    // long-running MTR + batch ip-api.com enrichment
  '/api/cors',          // makes outbound requests with spoofed Origin headers
  '/api/robots',        // fetches remote robots.txt + sitemap
  '/api/openredirect',  // parallel outbound requests per parameter tested
  '/api/csp',           // outbound fetch to target URL
  '/api/shodan',        // outbound Shodan API query
  '/api/urlhaus',       // outbound abuse.ch URLhaus POST
  '/api/phishtank',     // outbound PhishTank POST
  '/api/threatfox',     // outbound ThreatFox POST
  '/api/ransomware',    // outbound ransomware.live fetch
])

// key = "ip:route" → sorted list of request timestamps
const store = new Map<string, number[]>()
let lastCleanup = Date.now()

function maybeClean() {
  const now = Date.now()
  if (now - lastCleanup < 5 * 60_000) return
  lastCleanup = now
  for (const [key, times] of store) {
    const fresh = times.filter(t => now - t < WINDOW_MS)
    if (fresh.length === 0) store.delete(key)
    else store.set(key, fresh)
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}

function applyRateLimit(req: NextRequest): NextResponse | null {
  maybeClean()

  const { pathname } = req.nextUrl
  const ip       = getClientIp(req)
  const route    = '/' + pathname.split('/').slice(1, 3).join('/')  // /api/ip
  const limit    = KEY_ROUTES.has(route) ? KEY_LIMIT : DEFAULT_LIMIT
  const now      = Date.now()
  const storeKey = `${ip}:${route}`
  const stamps   = (store.get(storeKey) ?? []).filter(t => now - t < WINDOW_MS)

  if (stamps.length >= limit) {
    const retryAfter = Math.ceil((stamps[0] + WINDOW_MS - now) / 1000)
    return new NextResponse(
      JSON.stringify({
        error: `Rate limit exceeded — max ${limit} requests/min. Retry in ${retryAfter}s.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type':      'application/json',
          'Retry-After':       String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((stamps[0] + WINDOW_MS) / 1000)),
        },
      }
    )
  }

  stamps.push(now)
  store.set(storeKey, stamps)
  return null
}

// ─── Combined middleware ──────────────────────────────────────────────────────
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ① Rate-limit all API routes (before auth check, so 429s are still returned
  //    even for unauthenticated hammering attempts)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
    const blocked = applyRateLimit(req)
    if (blocked) return blocked
  }

  // ② Auth guard — allow login page and auth endpoints through
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token       = req.cookies.get('cyberops_auth')?.value
  const allowedKeys = (process.env.DASHBOARD_API_KEYS ?? '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)

  if (!token || !allowedKeys.includes(token)) {
    const loginUrl = new URL('/login', req.url)
    if (pathname !== '/') loginUrl.searchParams.set('from', pathname)
    const res = NextResponse.redirect(loginUrl)
    res.cookies.delete('cyberops_auth')
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
