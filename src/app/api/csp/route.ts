import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export type CspGrade    = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
export type CspSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface CspDirective {
  name:   string
  values: string[]
  raw:    string
}

export interface CspFinding {
  directive: string
  severity:  CspSeverity
  issue:     string
  detail:    string
}

export interface CspResult {
  url:        string
  csp:        string | null
  cspRO:      string | null
  directives: CspDirective[]
  findings:   CspFinding[]
  grade:      CspGrade
  score:      number
  nonces:     string[]
  hashes:     string[]
  error?:     string
}

function parseDirectives(raw: string): CspDirective[] {
  return raw
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(part => {
      const tokens = part.split(/\s+/)
      return { name: tokens[0].toLowerCase(), values: tokens.slice(1), raw: part }
    })
}

function scoreToGrade(score: number): CspGrade {
  if (score >= 95) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 65) return 'B'
  if (score >= 50) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}

function analyze(directives: CspDirective[]): {
  findings: CspFinding[]
  score:    number
  nonces:   string[]
  hashes:   string[]
} {
  if (directives.length === 0) {
    return {
      findings: [{
        directive: 'CSP',
        severity:  'critical',
        issue:     'No Content-Security-Policy header present',
        detail:    'Without a CSP the browser applies no restrictions on script sources. XSS attacks operate with full privilege.',
      }],
      score: 0, nonces: [], hashes: [],
    }
  }

  const findings: CspFinding[] = []
  const nonces: string[] = []
  const hashes: string[] = []
  let score = 100

  const byName     = new Map(directives.map(d => [d.name, d]))
  const defaultSrc = byName.get('default-src')
  const scriptSrc  = byName.get('script-src')  ?? defaultSrc
  const styleSrc   = byName.get('style-src')   ?? defaultSrc

  // ── default-src ────────────────────────────────────────────────────────────
  if (!byName.has('default-src')) {
    findings.push({
      directive: 'default-src', severity: 'medium',
      issue:  'No default-src fallback',
      detail: 'Directives not explicitly specified have no policy. Add default-src to set a safe baseline (e.g. default-src \'none\').',
    })
    score -= 10
  }

  // ── script-src ────────────────────────────────────────────────────────────
  if (scriptSrc) {
    const vals     = scriptSrc.values
    const hasNonce = vals.some(v => v.startsWith("'nonce-"))
    const hasHash  = vals.some(v => /^'sha(256|384|512)-/.test(v))

    if (vals.includes('*')) {
      findings.push({
        directive: 'script-src', severity: 'critical',
        issue:  'Wildcard (*) in script-src',
        detail: 'Scripts may be loaded from any host — equivalent to having no script restriction.',
      })
      score -= 35
    } else if (vals.some(v => v === 'https:' || v === 'http:')) {
      findings.push({
        directive: 'script-src', severity: 'high',
        issue:  'Scheme-only source in script-src',
        detail: '\'https:\' allows scripts from every HTTPS host. An attacker with any HTTPS hosting can inject scripts.',
      })
      score -= 20
    }

    if (vals.includes("'unsafe-inline'")) {
      if (hasNonce || hasHash) {
        findings.push({
          directive: 'script-src', severity: 'info',
          issue:  "'unsafe-inline' overridden by nonce/hash (modern browsers)",
          detail: 'Browsers that support nonces/hashes ignore unsafe-inline — effective in-practice protection, though legacy browsers may still allow it.',
        })
      } else {
        findings.push({
          directive: 'script-src', severity: 'critical',
          issue:  "'unsafe-inline' in script-src without nonce/hash",
          detail: 'Allows inline <script> blocks and event handlers — the primary XSS vector. Restricts script-src to nearly useless.',
        })
        score -= 30
      }
    }

    if (vals.includes("'unsafe-eval'")) {
      findings.push({
        directive: 'script-src', severity: 'high',
        issue:  "'unsafe-eval' in script-src",
        detail: 'Enables eval(), Function(), and setTimeout(string). Commonly exploited in DOM XSS and prototype pollution chains.',
      })
      score -= 20
    }

    if (vals.includes("'unsafe-hashes'")) {
      findings.push({
        directive: 'script-src', severity: 'medium',
        issue:  "'unsafe-hashes' in script-src",
        detail: 'Allows inline event handler scripts matched by hash. Reduces attack surface vs unsafe-inline but still permits specific inline JS.',
      })
      score -= 5
    }
  } else {
    findings.push({
      directive: 'script-src', severity: 'high',
      issue:  'No script-src directive (no default-src)',
      detail: 'Scripts can be loaded from anywhere. Define script-src or a default-src fallback.',
    })
    score -= 25
  }

  // ── style-src ────────────────────────────────────────────────────────────
  if (styleSrc?.values.includes("'unsafe-inline'")) {
    findings.push({
      directive: 'style-src', severity: 'medium',
      issue:  "'unsafe-inline' in style-src",
      detail: 'Inline styles are allowed — enables CSS injection for data exfiltration (attribute selectors) and UI redressing.',
    })
    score -= 8
  }

  // ── object-src ────────────────────────────────────────────────────────────
  const objectSrc = byName.get('object-src')
  if (!objectSrc && !defaultSrc) {
    findings.push({
      directive: 'object-src', severity: 'medium',
      issue:  'object-src not set',
      detail: 'Plugins (<object>, <embed>, <applet>) have no restriction. Set object-src \'none\' unless plugins are required.',
    })
    score -= 8
  } else if (objectSrc?.values.includes("'none'")) {
    findings.push({
      directive: 'object-src', severity: 'info',
      issue:  "object-src 'none' — plugin content blocked",
      detail: 'No Flash or plugin content can be loaded. Good practice.',
    })
  }

  // ── base-uri ────────────────────────────────────────────────────────────
  if (!byName.has('base-uri')) {
    findings.push({
      directive: 'base-uri', severity: 'medium',
      issue:  'Missing base-uri',
      detail: 'An attacker who can inject a <base> tag can hijack all relative URLs on the page. Set base-uri \'self\' or \'none\'.',
    })
    score -= 10
  }

  // ── frame-ancestors ────────────────────────────────────────────────────────
  if (!byName.has('frame-ancestors')) {
    findings.push({
      directive: 'frame-ancestors', severity: 'low',
      issue:  'Missing frame-ancestors',
      detail: 'Controls who may embed this page in an iframe (clickjacking protection). Consider frame-ancestors \'none\' or \'self\'.',
    })
    score -= 5
  }

  // ── form-action ────────────────────────────────────────────────────────────
  if (!byName.has('form-action')) {
    findings.push({
      directive: 'form-action', severity: 'low',
      issue:  'Missing form-action',
      detail: 'Without form-action, forms can POST to any origin. Restrict with form-action \'self\' to prevent form hijacking.',
    })
    score -= 5
  }

  // ── nonces and hashes ─────────────────────────────────────────────────────
  for (const d of directives) {
    for (const v of d.values) {
      if (v.startsWith("'nonce-")) nonces.push(v.slice(7, -1))
      if (/^'sha(256|384|512)-/.test(v)) hashes.push(v.slice(1, -1))
    }
  }
  if (nonces.length > 0 || hashes.length > 0) {
    findings.push({
      directive: 'script-src', severity: 'info',
      issue:  `Nonce/hash allowlisting detected (${nonces.length} nonce${nonces.length !== 1 ? 's' : ''}, ${hashes.length} hash${hashes.length !== 1 ? 'es' : ''})`,
      detail: 'Strong protection against unauthorized inline scripts — only scripts with matching nonce or hash attributes will execute.',
    })
    score = Math.min(score + 5, 100)
  }

  // ── reporting ─────────────────────────────────────────────────────────────
  if (byName.has('report-uri') || byName.has('report-to')) {
    findings.push({
      directive: byName.has('report-to') ? 'report-to' : 'report-uri',
      severity: 'info',
      issue:  'Violation reporting configured',
      detail: 'CSP violations will be reported to the configured endpoint — useful for detecting attacks in production.',
    })
  }

  if (byName.has('upgrade-insecure-requests')) {
    findings.push({
      directive: 'upgrade-insecure-requests', severity: 'info',
      issue:  'upgrade-insecure-requests present',
      detail: 'HTTP sub-resources are automatically upgraded to HTTPS — reduces mixed-content risk.',
    })
  }

  return { findings, score: Math.max(0, score), nonces, hashes }
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

  try {
    const res = await fetch(targetUrl.toString(), {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CyberOps/1.0)' },
    })

    const csp   = res.headers.get('content-security-policy')
    const cspRO = res.headers.get('content-security-policy-report-only')

    const raw      = csp ?? cspRO ?? ''
    const directives = parseDirectives(raw)
    const { findings, score, nonces, hashes } = analyze(directives)

    return NextResponse.json({
      url:        targetUrl.toString(),
      csp, cspRO,
      directives,
      findings,
      grade: scoreToGrade(score),
      score,
      nonces,
      hashes,
    } as CspResult, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    return NextResponse.json({ error: `Fetch failed: ${(e as Error).message}` }, { status: 502 })
  }
}
