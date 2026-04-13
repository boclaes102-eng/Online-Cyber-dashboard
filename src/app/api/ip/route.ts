import { NextRequest, NextResponse } from 'next/server'
import type { IpResult } from '@/lib/types'
import { isPrivateIp } from '@/lib/utils'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const ip = req.nextUrl.searchParams.get('ip')?.trim()
  if (!ip) return NextResponse.json({ error: 'ip parameter required' }, { status: 400 })

  const isPrivate = isPrivateIp(ip)
  if (isPrivate) {
    return NextResponse.json<IpResult>({
      ip, isPrivate: true, riskLevel: 'LOW',
      org: 'Private / RFC1918 address space',
      isp: 'Local network',
    })
  }

  try {
    // ── 1. Geo + ASN via ip-api.com (free, HTTP, called from server so no CORS) ──
    const geoRes = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,query`,
      { next: { revalidate: 3600 } }
    )
    const geo = await geoRes.json()

    if (geo.status === 'fail') {
      return NextResponse.json<IpResult>({ ip, isPrivate: false, riskLevel: 'LOW', error: geo.message })
    }

    // ── 2. AbuseIPDB (optional — only if key is set) ──────────────────────────
    let abuseScore: number | undefined
    let totalReports: number | undefined
    let lastReported: string | undefined
    const abuseKey = process.env.ABUSEIPDB_API_KEY
    if (abuseKey) {
      try {
        const abuseRes = await fetch(
          `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
          { headers: { Key: abuseKey, Accept: 'application/json' }, next: { revalidate: 1800 } }
        )
        const abuse = await abuseRes.json()
        abuseScore   = abuse?.data?.abuseConfidenceScore
        totalReports = abuse?.data?.totalReports
        lastReported = abuse?.data?.lastReportedAt
      } catch { /* optional enrichment — silently skip */ }
    }

    // ── 3. Derive risk level ────────────────────────────────────────────────
    let riskLevel: IpResult['riskLevel'] = 'LOW'
    if (abuseScore !== undefined) {
      if (abuseScore >= 80)      riskLevel = 'CRITICAL'
      else if (abuseScore >= 50) riskLevel = 'HIGH'
      else if (abuseScore >= 20) riskLevel = 'MEDIUM'
    }

    const result: IpResult = {
      ip:           geo.query,
      hostname:     geo.reverse || undefined,
      city:         geo.city,
      region:       geo.regionName,
      country:      geo.country,
      countryCode:  geo.countryCode,
      lat:          geo.lat,
      lon:          geo.lon,
      timezone:     geo.timezone,
      isp:          geo.isp,
      org:          geo.org,
      as:           geo.as,
      asname:       geo.asname,
      abuseScore,
      totalReports,
      lastReported,
      isPrivate:    false,
      riskLevel,
    }

    return NextResponse.json<IpResult>(result)
  } catch (err) {
    return NextResponse.json<IpResult>({
      ip, isPrivate: false, riskLevel: 'LOW',
      error: err instanceof Error ? err.message : 'Lookup failed',
    })
  }
}
