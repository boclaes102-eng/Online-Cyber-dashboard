import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns/promises'
export const runtime = 'nodejs'

const SIGNATURES = [
  {
    name: 'Cloudflare',
    check: (h: Record<string, string>) =>
      !!(h['cf-ray'] || h['cf-cache-status'] || h['server']?.includes('cloudflare')),
  },
  {
    name: 'AWS CloudFront',
    check: (h: Record<string, string>) =>
      !!(h['x-amz-cf-id'] || h['x-amzn-requestid'] || h['via']?.includes('CloudFront')),
  },
  {
    name: 'Akamai',
    check: (h: Record<string, string>) =>
      !!(h['x-akamai-request-id'] || h['x-check-cacheable'] || h['server']?.includes('AkamaiGHost')),
  },
  {
    name: 'Fastly',
    check: (h: Record<string, string>) =>
      !!(h['x-fastly-request-id'] || h['x-served-by']?.includes('cache')),
  },
  {
    name: 'Imperva / Incapsula',
    check: (h: Record<string, string>) =>
      !!(h['x-iinfo'] || h['x-cdn']?.includes('Imperva') || h['set-cookie']?.includes('incap_ses')),
  },
  {
    name: 'Sucuri',
    check: (h: Record<string, string>) =>
      !!(h['x-sucuri-id'] || h['server']?.includes('Sucuri')),
  },
  {
    name: 'F5 BIG-IP ASM',
    check: (h: Record<string, string>) =>
      !!(h['server']?.includes('BigIP') || h['set-cookie']?.includes('BIGipServer') || h['x-wa-info']),
  },
  {
    name: 'Barracuda',
    check: (h: Record<string, string>) =>
      !!(h['set-cookie']?.includes('barra_counter_session') || h['server']?.includes('Barracuda')),
  },
  {
    name: 'ModSecurity',
    check: (h: Record<string, string>) =>
      !!(h['server']?.includes('Mod_Security') || h['x-mod-pagespeed']),
  },
]

const CDN_CNAME_PATTERNS = [
  { pattern: 'cloudfront.net', name: 'AWS CloudFront' },
  { pattern: 'akamaiedge.net', name: 'Akamai' },
  { pattern: 'fastly.net', name: 'Fastly' },
  { pattern: 'cloudflare.net', name: 'Cloudflare' },
  { pattern: 'incapdns.net', name: 'Imperva Incapsula' },
  { pattern: 'sucuri.net', name: 'Sucuri' },
]

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url')
  if (!urlParam) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let target = urlParam
  if (!target.startsWith('http')) target = `https://${target}`

  let hostname: string
  try { hostname = new URL(target).hostname } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const [fetchRes, cnameRes] = await Promise.allSettled([
    fetch(target, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CyberOps-Scanner/1.0)' },
    }),
    dns.resolveCname(hostname).catch(() => [] as string[]),
  ])

  const h: Record<string, string> = {}
  if (fetchRes.status === 'fulfilled') {
    fetchRes.value.headers.forEach((v, k) => { h[k.toLowerCase()] = v })
  }
  const cnames = cnameRes.status === 'fulfilled' ? cnameRes.value : []

  const detected = new Set<string>()

  for (const sig of SIGNATURES) {
    if (sig.check(h)) detected.add(sig.name)
  }

  for (const cn of cnames) {
    for (const { pattern, name } of CDN_CNAME_PATTERNS) {
      if (cn.includes(pattern)) detected.add(name)
    }
  }

  const relevantHeaders: Record<string, string | undefined> = {
    server: h['server'],
    via: h['via'],
    'cf-ray': h['cf-ray'],
    'x-amz-cf-id': h['x-amz-cf-id'],
    'x-fastly-request-id': h['x-fastly-request-id'],
    'x-iinfo': h['x-iinfo'],
    'x-sucuri-id': h['x-sucuri-id'],
  }
  // strip undefined
  Object.keys(relevantHeaders).forEach(k => {
    if (relevantHeaders[k] === undefined) delete relevantHeaders[k]
  })

  return NextResponse.json({
    url: target,
    hostname,
    protected: detected.size > 0,
    detected: [...detected],
    cnames,
    relevantHeaders,
    error: fetchRes.status === 'rejected' ? String(fetchRes.reason) : undefined,
  })
}
