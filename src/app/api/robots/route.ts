import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export interface RobotsRule {
  userAgent: string
  allow:     string[]
  disallow:  string[]
}

export interface SitemapEntry {
  loc:      string
  lastmod?: string
  priority?: string
}

export interface InterestingPath {
  path:   string
  reason: string
}

export interface RobotsResult {
  domain:           string
  robotsUrl:        string
  sitemapUrls:      string[]
  rules:            RobotsRule[]
  interestingPaths: InterestingPath[]
  allDisallowed:    string[]
  sitemapEntries:   SitemapEntry[]
  rawText:          string
  error?:           string
}

const INTERESTING: { pattern: RegExp; reason: string }[] = [
  { pattern: /\/(admin|administrator|wp-admin|cpanel|panel|control|manage)/i, reason: 'Admin panel'           },
  { pattern: /\/(api|v\d+|graphql|rest|swagger|openapi|docs)/i,               reason: 'API / docs endpoint'  },
  { pattern: /\/(backup|bak|dump|export|migrate)/i,                            reason: 'Backup / export'      },
  { pattern: /\/(login|signin|auth|sso|oauth|password)/i,                      reason: 'Auth endpoint'        },
  { pattern: /\/(config|settings|conf|setup|install)/i,                        reason: 'Configuration'        },
  { pattern: /\/(internal|private|hidden|secret|test|staging|dev)/i,          reason: 'Internal / staging'   },
  { pattern: /\/(db|database|mysql|phpmyadmin|adminer)/i,                      reason: 'Database interface'   },
  { pattern: /\/(\.git|\.env|\.ssh|\.htaccess|\.well-known)/i,                reason: 'Sensitive file/dir'   },
  { pattern: /\/(upload|uploads|files|media|assets)/i,                         reason: 'File upload/storage'  },
  { pattern: /\/(debug|trace|profiler|phpinfo|status|health)/i,                reason: 'Debug / health'       },
  { pattern: /\/(cgi-bin|cgi)/i,                                               reason: 'CGI script dir'       },
  { pattern: /\/(tmp|temp|cache|log|logs)/i,                                   reason: 'Temp / log directory' },
]

const TIMEOUT_MS = 10_000

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CyberOps/1.0)' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  return text
}

function parseRobots(text: string): { rules: RobotsRule[]; sitemaps: string[] } {
  const rules: RobotsRule[] = []
  const sitemaps: string[]  = []
  let current: RobotsRule | null = null

  for (const rawLine of text.split('\n')) {
    const line = rawLine.split('#')[0].trim()
    if (!line) {
      // blank line ends a user-agent block
      if (current) { rules.push(current); current = null }
      continue
    }
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim().toLowerCase()
    const val = line.slice(colon + 1).trim()

    if (key === 'user-agent') {
      if (current && (current.allow.length > 0 || current.disallow.length > 0)) {
        rules.push(current)
      }
      current = { userAgent: val, allow: [], disallow: [] }
    } else if (key === 'allow'    && current) { if (val) current.allow.push(val)    }
    else if   (key === 'disallow' && current) { if (val) current.disallow.push(val) }
    else if   (key === 'sitemap')             { if (val) sitemaps.push(val)         }
  }
  if (current) rules.push(current)
  return { rules, sitemaps }
}

async function parseSitemap(url: string): Promise<SitemapEntry[]> {
  try {
    const text    = await fetchText(url)
    const entries: SitemapEntry[] = []
    const locs    = [...text.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/g)]
    const lastmods = [...text.matchAll(/<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/g)]
    const prios    = [...text.matchAll(/<priority>\s*([\s\S]*?)\s*<\/priority>/g)]
    for (let i = 0; i < Math.min(locs.length, 150); i++) {
      entries.push({
        loc:      locs[i][1].trim(),
        lastmod:  lastmods[i]?.[1]?.trim(),
        priority: prios[i]?.[1]?.trim(),
      })
    }
    return entries
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.trim() ?? ''
  if (!domain) return NextResponse.json({ error: 'domain parameter required' }, { status: 400 })

  const clean = domain.replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
  if (!/^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}$/.test(clean)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
  }

  const robotsUrl = `https://${clean}/robots.txt`
  let rawText: string
  try {
    rawText = await fetchText(robotsUrl)
  } catch (e) {
    return NextResponse.json({ error: `Failed to fetch robots.txt: ${(e as Error).message}` }, { status: 502 })
  }

  const { rules, sitemaps } = parseRobots(rawText)

  const allDisallowed = [...new Set(rules.flatMap(r => r.disallow))]

  const seen = new Set<string>()
  const interestingPaths: InterestingPath[] = []
  for (const path of allDisallowed) {
    if (seen.has(path)) continue
    seen.add(path)
    for (const { pattern, reason } of INTERESTING) {
      if (pattern.test(path)) { interestingPaths.push({ path, reason }); break }
    }
  }

  // Fetch first sitemap only to avoid excessive requests
  const sitemapEntries = sitemaps.length > 0 ? await parseSitemap(sitemaps[0]) : []

  return NextResponse.json({
    domain: clean,
    robotsUrl,
    sitemapUrls: sitemaps,
    rules,
    interestingPaths,
    allDisallowed,
    sitemapEntries,
    rawText: rawText.slice(0, 6000),
  } as RobotsResult, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
