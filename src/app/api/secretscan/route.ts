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
  {
    type: 'Supabase Anon Key (JWT)',
    severity: 'critical',
    re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJyb2xlIjoiYW5vbiJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g,
  },
  {
    type: 'Supabase Service Role Key (JWT)',
    severity: 'critical',
    re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJyb2xlIjoic2VydmljZV9yb2xlIi[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g,
  },
  {
    type: 'Supabase Project URL',
    severity: 'high',
    re: /https:\/\/[a-z0-9]{20}\.supabase\.co/g,
  },
  {
    type: 'Supabase Anon Key (iss:supabase)',
    severity: 'critical',
    re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSI[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g,
  },
  {
    type: 'Generic JWT',
    severity: 'medium',
    re: /eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g,
  },
  {
    type: 'AWS Access Key',
    severity: 'critical',
    re: /AKIA[0-9A-Z]{16}/g,
  },
  {
    type: 'Google API Key',
    severity: 'high',
    re: /AIza[0-9A-Za-z_\-]{35}/g,
  },
  {
    type: 'Firebase Config',
    severity: 'high',
    re: /firebase[A-Za-z]*["\s:=]+["']?[A-Za-z0-9\-_]{20,}/gi,
  },
  {
    type: 'NEXT_PUBLIC env variable',
    severity: 'info',
    re: /NEXT_PUBLIC_[A-Z_]{3,}["'`\s]*[:=]["'`\s]*["'`]([^"'`\s]{8,})/g,
  },
  {
    type: 'Private Key',
    severity: 'critical',
    re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
  },
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
