import { NextRequest, NextResponse } from 'next/server'

// ─── Rate limiting ────────────────────────────────────────────────────────────
const WINDOW_MS     = 60_000
const DEFAULT_LIMIT = 60
const KEY_LIMIT     = 20

const KEY_ROUTES = new Set([
  '/api/ip',
  '/api/ioc',
  '/api/hash',
  '/api/url',
  '/api/portscan',
  '/api/exploits',
  '/api/emailsec',
  '/api/breach',
  '/api/username',
  '/api/traceroute',
  '/api/cors',
  '/api/robots',
  '/api/openredirect',
  '/api/csp',
  '/api/shodan',
  '/api/urlhaus',
  '/api/phishtank',
  '/api/threatfox',
  '/api/ransomware',
])

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

export function middleware(req: NextRequest): NextResponse | undefined {
  if (!req.nextUrl.pathname.startsWith('/api/')) return

  maybeClean()
  const { pathname } = req.nextUrl
  const ip       = getClientIp(req)
  const route    = '/' + pathname.split('/').slice(1, 3).join('/')
  const limit    = KEY_ROUTES.has(route) ? KEY_LIMIT : DEFAULT_LIMIT
  const now      = Date.now()
  const storeKey = `${ip}:${route}`
  const stamps   = (store.get(storeKey) ?? []).filter(t => now - t < WINDOW_MS)

  if (stamps.length >= limit) {
    const retryAfter = Math.ceil((stamps[0] + WINDOW_MS - now) / 1000)
    return new NextResponse(
      JSON.stringify({ error: `Rate limit exceeded — max ${limit} requests/min. Retry in ${retryAfter}s.` }),
      {
        status: 429,
        headers: {
          'Content-Type':          'application/json',
          'Retry-After':           String(retryAfter),
          'X-RateLimit-Limit':     String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(Math.ceil((stamps[0] + WINDOW_MS) / 1000)),
        },
      }
    )
  }

  stamps.push(now)
  store.set(storeKey, stamps)
}

export const config = {
  matcher: ['/api/:path*'],
}
