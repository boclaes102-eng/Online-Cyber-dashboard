import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export interface CorsTest {
  origin: string
  label: string
  acao: string | null
  acac: boolean
  acam: string | null
  reflected: boolean
  vulnerable: boolean
  severity: 'critical' | 'high' | 'medium' | 'info' | 'safe'
  finding: string
}

export interface CorsResult {
  url: string
  tests: CorsTest[]
  verdict: 'safe' | 'misconfigured' | 'vulnerable'
  verdictDetail: string
  error?: string
}

const TIMEOUT_MS = 10_000

async function testOrigin(url: string, origin: string, label: string): Promise<CorsTest> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Origin: origin, Accept: '*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    const acao = res.headers.get('access-control-allow-origin')
    const acac = res.headers.get('access-control-allow-credentials')?.toLowerCase() === 'true'
    const acam = res.headers.get('access-control-allow-methods')

    const reflected  = !!acao && acao === origin
    const isNull     = acao === 'null'
    const isWildcard = acao === '*'

    let vulnerable = false
    let severity: CorsTest['severity'] = 'safe'
    let finding = 'No CORS header — cross-origin requests blocked by default'

    if (isWildcard) {
      severity = 'info'
      finding  = 'Wildcard ACAO (*) — credentials cannot be included, low risk for public APIs'
    } else if (reflected && acac) {
      vulnerable = true
      severity   = 'critical'
      finding    = 'CRITICAL: Origin reflected + Access-Control-Allow-Credentials: true — credentialed cross-origin reads possible'
    } else if (reflected) {
      vulnerable = true
      severity   = 'high'
      finding    = 'Origin reflected in ACAO — cross-origin reads of this resource are allowed (no credentials)'
    } else if (isNull && acac) {
      vulnerable = true
      severity   = 'critical'
      finding    = 'CRITICAL: ACAO: null + credentials allowed — exploitable via sandboxed iframe on any page'
    } else if (isNull) {
      vulnerable = true
      severity   = 'medium'
      finding    = 'ACAO: null — potentially exploitable via data: URI or sandboxed iframes'
    } else if (acao) {
      severity = 'info'
      finding  = `Static allowlist: ${acao}`
    }

    return { origin, label, acao, acac, acam, reflected, vulnerable, severity, finding }
  } catch {
    return {
      origin, label, acao: null, acac: false, acam: null,
      reflected: false, vulnerable: false, severity: 'safe',
      finding: 'Request failed or timed out',
    }
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

  const url      = targetUrl.toString()
  const hostname = targetUrl.hostname

  const testCases: { origin: string; label: string }[] = [
    { origin: 'https://evil.attacker.com',            label: 'Arbitrary origin'         },
    { origin: 'null',                                  label: 'null origin'              },
    { origin: `https://sub.${hostname}`,               label: 'Subdomain of target'      },
    { origin: `https://${hostname}.attacker.com`,      label: 'Pre-domain spoof'         },
    { origin: `https://attacker.com`,                  label: 'Random third party'       },
  ]

  const tests = await Promise.all(testCases.map(({ origin, label }) => testOrigin(url, origin, label)))

  const critical    = tests.filter(t => t.vulnerable && t.acac)
  const vulnerable  = tests.filter(t => t.vulnerable)

  let verdict: CorsResult['verdict']
  let verdictDetail: string

  if (critical.length > 0) {
    verdict       = 'vulnerable'
    verdictDetail = 'Critical CORS misconfiguration — arbitrary origins can make credentialed requests (cookies, tokens). Session hijack and CSRF escalation are possible.'
  } else if (vulnerable.length > 0) {
    verdict       = 'misconfigured'
    verdictDetail = 'CORS policy reflects arbitrary origins. Without ACAC:true, cookies are excluded, but unauthenticated cross-origin reads are possible.'
  } else {
    verdict       = 'safe'
    verdictDetail = 'No reflected-origin or null-origin issues found. ACAO is absent, static, or wildcard without credentials.'
  }

  return NextResponse.json({ url, tests, verdict, verdictDetail } as CorsResult, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
