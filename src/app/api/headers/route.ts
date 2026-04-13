import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

interface Check {
  label: string
  value: string | null
  pass: boolean
  points: number
  maxPoints: number
  note: string
}

function grade(score: number): string {
  if (score >= 95) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 65) return 'B'
  if (score >= 50) return 'C'
  if (score >= 35) return 'D'
  return 'F'
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url')
  if (!urlParam) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let target = urlParam
  if (!target.startsWith('http')) target = `https://${target}`

  try {
    const res = await fetch(target, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CyberOps-Scanner/1.0)' },
    })
    const h: Record<string, string> = {}
    res.headers.forEach((v, k) => { h[k.toLowerCase()] = v })

    const csp   = h['content-security-policy'] ?? null
    const hsts  = h['strict-transport-security'] ?? null
    const xfo   = h['x-frame-options'] ?? null
    const xcto  = h['x-content-type-options'] ?? null
    const rp    = h['referrer-policy'] ?? null
    const pp    = h['permissions-policy'] ?? h['feature-policy'] ?? null
    const xpb   = h['x-powered-by'] ?? null
    const coop  = h['cross-origin-opener-policy'] ?? null
    const coep  = h['cross-origin-embedder-policy'] ?? null

    const checks: Check[] = [
      {
        label: 'Content-Security-Policy',
        value: csp,
        pass: !!csp,
        points: csp ? 25 : 0,
        maxPoints: 25,
        note: csp ? 'CSP defined — mitigates XSS & injection' : 'Missing — no XSS / injection protection',
      },
      {
        label: 'Strict-Transport-Security',
        value: hsts,
        pass: !!hsts,
        points: hsts ? 20 : 0,
        maxPoints: 20,
        note: hsts
          ? `HSTS enforced (max-age ${Math.round((parseInt(hsts.match(/max-age=(\d+)/)?.[1] ?? '0', 10)) / 86400)} days)`
          : 'Missing — HTTP downgrade / MITM risk',
      },
      {
        label: 'X-Frame-Options',
        value: xfo,
        pass: !!xfo,
        points: xfo ? 10 : 0,
        maxPoints: 10,
        note: xfo ? `Clickjacking protection: ${xfo}` : 'Missing — clickjacking risk',
      },
      {
        label: 'X-Content-Type-Options',
        value: xcto,
        pass: xcto === 'nosniff',
        points: xcto === 'nosniff' ? 10 : 0,
        maxPoints: 10,
        note: xcto === 'nosniff' ? 'MIME sniffing blocked' : 'Set to "nosniff" to block MIME confusion attacks',
      },
      {
        label: 'Referrer-Policy',
        value: rp,
        pass: !!rp,
        points: rp ? 10 : 0,
        maxPoints: 10,
        note: rp ? `Referrer policy: ${rp}` : 'Missing — URL leakage to third parties',
      },
      {
        label: 'Permissions-Policy',
        value: pp,
        pass: !!pp,
        points: pp ? 10 : 0,
        maxPoints: 10,
        note: pp ? 'Browser feature access restricted' : 'Missing — camera/mic/geo unrestricted by policy',
      },
      {
        label: 'Cross-Origin-Opener-Policy',
        value: coop,
        pass: !!coop,
        points: coop ? 5 : 0,
        maxPoints: 5,
        note: coop ? `COOP: ${coop}` : 'Missing COOP — cross-origin isolation incomplete',
      },
      {
        label: 'X-Powered-By (absent = pass)',
        value: xpb,
        pass: !xpb,
        points: !xpb ? 10 : 0,
        maxPoints: 10,
        note: xpb ? `Reveals technology stack: ${xpb}` : 'Technology not exposed',
      },
    ]

    const score = checks.reduce((s, c) => s + c.points, 0)

    return NextResponse.json({
      url: target,
      status: res.status,
      finalUrl: res.url,
      score,
      grade: grade(score),
      checks,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Fetch failed' }, { status: 500 })
  }
}
