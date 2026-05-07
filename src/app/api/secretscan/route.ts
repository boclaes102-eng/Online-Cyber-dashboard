import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export interface SecretMatch {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'info'
  value: string
  context: string
  scriptUrl: string
}

export interface SecretScanResult {
  url: string
  scriptsScanned: number
  secrets: SecretMatch[]
  error?: string
}

const PATTERNS: { type: string; severity: SecretMatch['severity']; re: RegExp }[] = [
  // ── Supabase ──────────────────────────────────────────────────────────────
  { type: 'Supabase Anon Key',         severity: 'critical', re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSI[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g },
  { type: 'Supabase Service Role Key', severity: 'critical', re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJyb2xlIjoic2VydmljZV9yb2xlIi[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g },
  { type: 'Supabase Project URL',      severity: 'high',     re: /https:\/\/[a-z0-9]{20}\.supabase\.co/g },

  // ── AWS ───────────────────────────────────────────────────────────────────
  { type: 'AWS Access Key ID',         severity: 'critical', re: /AKIA[0-9A-Z]{16}/g },
  { type: 'AWS Secret Access Key',     severity: 'critical', re: /(?:aws_secret|secretAccessKey|AWS_SECRET)[^A-Za-z0-9+/]{1,10}([A-Za-z0-9+/]{40})/gi },

  // ── Google / Firebase ─────────────────────────────────────────────────────
  { type: 'Google API Key',            severity: 'high',     re: /AIza[0-9A-Za-z_\-]{35}/g },
  { type: 'Google OAuth Client ID',    severity: 'medium',   re: /[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com/g },
  { type: 'Firebase Config apiKey',    severity: 'high',     re: /apiKey:\s*["'][A-Za-z0-9_\-]{20,}["']/g },
  { type: 'Firebase Project ID',       severity: 'medium',   re: /projectId:\s*["'][a-z0-9\-]{4,}["']/g },
  { type: 'Firebase Storage Bucket',   severity: 'medium',   re: /storageBucket:\s*["'][a-z0-9\-]+\.appspot\.com["']/g },

  // ── Stripe ────────────────────────────────────────────────────────────────
  { type: 'Stripe Live Secret Key',    severity: 'critical', re: /sk_live_[A-Za-z0-9]{24,}/g },
  { type: 'Stripe Live Publishable',   severity: 'high',     re: /pk_live_[A-Za-z0-9]{24,}/g },
  { type: 'Stripe Test Key',           severity: 'medium',   re: /sk_test_[A-Za-z0-9]{24,}/g },

  // ── SendGrid / Mailgun / Twilio ───────────────────────────────────────────
  { type: 'SendGrid API Key',          severity: 'critical', re: /SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}/g },
  { type: 'Mailgun API Key',           severity: 'critical', re: /key-[0-9a-zA-Z]{32}/g },
  { type: 'Twilio Account SID',        severity: 'high',     re: /AC[a-z0-9]{32}/g },
  { type: 'Twilio Auth Token',         severity: 'critical', re: /(?:twilio|TWILIO)[^a-z0-9]{1,20}([a-z0-9]{32})/gi },

  // ── GitHub / GitLab ───────────────────────────────────────────────────────
  { type: 'GitHub Personal Token',     severity: 'critical', re: /ghp_[A-Za-z0-9]{36}/g },
  { type: 'GitHub App Token',          severity: 'critical', re: /ghs_[A-Za-z0-9]{36}/g },
  { type: 'GitHub OAuth Token',        severity: 'critical', re: /gho_[A-Za-z0-9]{36}/g },
  { type: 'GitHub Fine-Grained Token', severity: 'critical', re: /github_pat_[A-Za-z0-9_]{82}/g },
  { type: 'GitLab Token',              severity: 'critical', re: /glpat-[A-Za-z0-9_\-]{20}/g },

  // ── OpenAI / Anthropic ────────────────────────────────────────────────────
  { type: 'OpenAI API Key',            severity: 'critical', re: /sk-[A-Za-z0-9]{48}/g },
  { type: 'Anthropic API Key',         severity: 'critical', re: /sk-ant-[A-Za-z0-9_\-]{40,}/g },

  // ── Cloudinary / Mapbox ───────────────────────────────────────────────────
  { type: 'Cloudinary URL',            severity: 'high',     re: /cloudinary:\/\/[0-9]+:[A-Za-z0-9_\-]+@[a-z]+/g },
  { type: 'Mapbox Token',              severity: 'high',     re: /pk\.eyJ1IjoiJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g },

  // ── Generic secrets ───────────────────────────────────────────────────────
  { type: 'Private Key',               severity: 'critical', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { type: 'Generic JWT',               severity: 'medium',   re: /eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g },
  { type: 'Bearer token in source',    severity: 'high',     re: /[Bb]earer\s+([A-Za-z0-9_\-\.]{40,})/g },
  { type: 'Basic auth credentials',    severity: 'critical', re: /[Bb]asic\s+([A-Za-z0-9+/]{20,}={0,2})/g },
  { type: 'NEXT_PUBLIC env variable',  severity: 'info',     re: /NEXT_PUBLIC_[A-Z_]{3,}["'`\s]*[:=]["'`\s]*["'`]([^"'`\s]{8,})/g },
  { type: 'Hardcoded password',        severity: 'high',     re: /(?:password|passwd|pwd|secret|api_secret)['":\s=]+["']([^'"]{8,})["']/gi },
]

const TIMEOUT_MS = 12_000
const MAX_SCRIPTS = 8
const MAX_SCRIPT_SIZE = 2_000_000 // 2MB per script

function extractContext(source: string, index: number, matchLen: number): string {
  const start = Math.max(0, index - 60)
  const end   = Math.min(source.length, index + matchLen + 60)
  return source.slice(start, end).replace(/\s+/g, ' ').trim()
}

function extractScriptUrls(html: string, baseUrl: string): string[] {
  const base   = new URL(baseUrl)
  const matches = [...html.matchAll(/src=["']([^"']+\.js[^"']*)/g)]
  const urls: string[] = []
  for (const m of matches) {
    try {
      const resolved = new URL(m[1], base).toString()
      if (!urls.includes(resolved)) urls.push(resolved)
    } catch { /* skip malformed */ }
  }
  return urls.slice(0, MAX_SCRIPTS)
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

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,*/*',
  }

  let html: string
  try {
    const res = await fetch(targetUrl.toString(), {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    })
    html = await res.text()
  } catch (e) {
    return NextResponse.json({ error: `Failed to fetch page: ${e}` } as SecretScanResult, { status: 200 })
  }

  const scriptUrls = extractScriptUrls(html, targetUrl.toString())
  const allSecrets: SecretMatch[] = []

  await Promise.all(scriptUrls.map(async (scriptUrl) => {
    try {
      const res = await fetch(scriptUrl, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      const buf = await res.arrayBuffer()
      if (buf.byteLength > MAX_SCRIPT_SIZE) return
      const source = new TextDecoder().decode(buf)

      for (const { type, severity, re } of PATTERNS) {
        re.lastIndex = 0
        let match: RegExpExecArray | null
        while ((match = re.exec(source)) !== null) {
          const value   = match[0].slice(0, 120)
          const context = extractContext(source, match.index, match[0].length)
          allSecrets.push({ type, severity, value, context, scriptUrl })
          if (allSecrets.length > 50) break
        }
      }
    } catch { /* skip failed scripts */ }
  }))

  return NextResponse.json({
    url: targetUrl.toString(),
    scriptsScanned: scriptUrls.length,
    secrets: allSecrets,
  } as SecretScanResult, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
