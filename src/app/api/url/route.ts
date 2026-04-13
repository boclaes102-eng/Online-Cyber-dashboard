import { NextRequest, NextResponse } from 'next/server'
import type { UrlScanResult, VtResult } from '@/lib/types'

export const runtime = 'nodejs'

function extractDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

async function checkUrlhaus(url: string) {
  try {
    const res = await fetch('https://urlhaus-api.abuse.ch/v1/url/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(url)}`,
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    if (data.query_status === 'no_results') return { found: false }
    if (data.query_status === 'is_available' || data.query_status === 'blacklisted') {
      return {
        found:       true,
        urlStatus:   data.url_status ?? undefined,
        threat:      data.threat ?? undefined,
        tags:        Array.isArray(data.tags) ? data.tags : [],
        urlsOnHost:  data.urls_on_host ?? undefined,
        reference:   data.urlhaus_reference ?? undefined,
      }
    }
    return { found: false }
  } catch (e) {
    return { found: false, error: e instanceof Error ? e.message : 'URLhaus failed' }
  }
}

async function checkVt(url: string, apiKey: string): Promise<VtResult> {
  try {
    // VT v3: URL ID is base64url of the URL (no padding)
    const id = Buffer.from(url).toString('base64url')
    const res = await fetch(`https://www.virustotal.com/api/v3/urls/${id}`, {
      headers: { 'x-apikey': apiKey },
      signal: AbortSignal.timeout(10_000),
    })
    if (res.status === 404) return { found: false, malicious: 0, suspicious: 0, harmless: 0, undetected: 0, total: 0 }
    if (!res.ok) return { found: false, malicious: 0, suspicious: 0, harmless: 0, undetected: 0, total: 0, error: `VT ${res.status}` }
    const data = await res.json()
    const stats = data?.data?.attributes?.last_analysis_stats ?? {}
    const mal   = stats.malicious   ?? 0
    const sus   = stats.suspicious  ?? 0
    const harm  = stats.harmless    ?? 0
    const undet = stats.undetected  ?? 0
    return {
      found:        true,
      malicious:    mal,
      suspicious:   sus,
      harmless:     harm,
      undetected:   undet,
      total:        mal + sus + harm + undet,
      threatLabel:  data?.data?.attributes?.threat_names?.[0],
      lastAnalysis: data?.data?.attributes?.last_analysis_date
        ? new Date(data.data.attributes.last_analysis_date * 1000).toISOString().slice(0, 10)
        : undefined,
      permalink: `https://www.virustotal.com/gui/url/${id}`,
    }
  } catch (e) {
    return { found: false, malicious: 0, suspicious: 0, harmless: 0, undetected: 0, total: 0, error: e instanceof Error ? e.message : 'VT failed' }
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')?.trim()
  if (!url) return NextResponse.json({ error: 'url parameter required' }, { status: 400 })

  // Validate URL format
  let parsed: URL
  try { parsed = new URL(url) } catch {
    return NextResponse.json<UrlScanResult>({
      url, domain: extractDomain(url),
      verdict: 'UNKNOWN',
      error: 'Invalid URL — must start with http:// or https://',
    })
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json<UrlScanResult>({ url, domain: parsed.hostname, verdict: 'UNKNOWN', error: 'Only HTTP/HTTPS URLs supported' })
  }

  const vtKey = process.env.VT_API_KEY
  const [urlhaus, virustotal] = await Promise.all([
    checkUrlhaus(url),
    vtKey ? checkVt(url, vtKey) : Promise.resolve(undefined),
  ])

  const isMalicious = urlhaus.found || (virustotal && virustotal.malicious > 0)
  const isSuspicious = virustotal && virustotal.suspicious > 0 && !isMalicious

  const result: UrlScanResult = {
    url,
    domain:     parsed.hostname,
    verdict:    isMalicious ? 'MALICIOUS' : isSuspicious ? 'SUSPICIOUS' : 'SAFE',
    urlhaus,
    virustotal,
  }
  return NextResponse.json(result)
}
