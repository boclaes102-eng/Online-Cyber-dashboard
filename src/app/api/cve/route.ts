import { NextRequest, NextResponse } from 'next/server'
import type { CveSearchResult, CveItem, CvssScore } from '@/lib/types'

export const runtime = 'nodejs'

// NVD free tier: 5 req/30s without key, 50/30s with key
const NVD_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0'

function parseCve(raw: { cve: {
  id: string
  published: string
  lastModified: string
  vulnStatus: string
  descriptions: Array<{ lang: string; value: string }>
  metrics?: {
    cvssMetricV31?: Array<{ cvssData: { baseScore: number; baseSeverity: string; vectorString: string } }>
    cvssMetricV30?: Array<{ cvssData: { baseScore: number; baseSeverity: string; vectorString: string } }>
    cvssMetricV2?:  Array<{ cvssData: { baseScore: number; baseSeverity?: string; vectorString: string } }>
  }
  weaknesses?: Array<{ description: Array<{ lang: string; value: string }> }>
  configurations?: Array<{
    nodes?: Array<{ cpeMatch?: Array<{ criteria: string }> }>
  }>
  references?: Array<{ url: string }>
} }): CveItem {
  const { cve } = raw
  const desc = cve.descriptions.find(d => d.lang === 'en')?.value ?? ''

  // Pick best available CVSS metric
  let cvss: CvssScore | undefined
  const m31 = cve.metrics?.cvssMetricV31?.[0]?.cvssData
  const m30 = cve.metrics?.cvssMetricV30?.[0]?.cvssData
  const m2  = cve.metrics?.cvssMetricV2?.[0]?.cvssData
  const raw_cvss = m31 ?? m30 ?? m2
  if (raw_cvss) {
    cvss = {
      version:      m31 ? '3.1' : m30 ? '3.0' : '2.0',
      baseScore:    raw_cvss.baseScore,
      baseSeverity: raw_cvss.baseSeverity ?? (raw_cvss.baseScore >= 7 ? 'HIGH' : raw_cvss.baseScore >= 4 ? 'MEDIUM' : 'LOW'),
      vectorString: raw_cvss.vectorString,
    }
  }

  const cwe = cve.weaknesses
    ?.flatMap(w => w.description.filter(d => d.lang === 'en').map(d => d.value))
    .filter(v => v !== 'NVD-CWE-noinfo' && v !== 'NVD-CWE-Other')
    ?? []

  // Extract affected product names from CPE strings
  const affectedProducts = [
    ...new Set(
      cve.configurations
        ?.flatMap(c => c.nodes ?? [])
        .flatMap(n => n.cpeMatch ?? [])
        .map(m => {
          const parts = m.criteria.split(':')
          // cpe:2.3:a:vendor:product:version → "vendor product"
          return parts.length > 4 ? `${parts[3]} ${parts[4]}`.replace(/_/g, ' ') : ''
        })
        .filter(Boolean) ?? []
    ),
  ].slice(0, 8)

  return {
    id:           cve.id,
    published:    cve.published,
    lastModified: cve.lastModified,
    vulnStatus:   cve.vulnStatus,
    description:  desc,
    severity:     cvss?.baseSeverity ?? 'UNKNOWN',
    cvss,
    references:   (cve.references ?? []).map(r => r.url).slice(0, 5),
    cwe,
    affectedProducts,
  }
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const query    = params.get('query') ?? ''
  const severity = params.get('severity') ?? ''
  const cveId    = params.get('cveId') ?? ''
  const page     = parseInt(params.get('page') ?? '0', 10)
  const perPage  = 20

  const nvdParams = new URLSearchParams({
    resultsPerPage: String(perPage),
    startIndex: String(page * perPage),
  })

  if (cveId)    nvdParams.set('cveId', cveId.toUpperCase())
  else if (query) nvdParams.set('keywordSearch', query)
  if (severity) nvdParams.set('cvssV3Severity', severity.toUpperCase())

  // Add NVD API key if configured (raises rate limit)
  const nvdKey = process.env.NVD_API_KEY
  const headers: Record<string, string> = {}
  if (nvdKey) headers['apiKey'] = nvdKey

  try {
    const res = await fetch(`${NVD_BASE}?${nvdParams}`, {
      headers,
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      return NextResponse.json<CveSearchResult>({
        totalResults: 0, items: [],
        error: `NVD API returned ${res.status}`,
      })
    }

    const data = await res.json()
    const items = (data.vulnerabilities ?? []).map(parseCve)

    return NextResponse.json<CveSearchResult>({
      totalResults: data.totalResults ?? 0,
      items,
    })
  } catch (err) {
    return NextResponse.json<CveSearchResult>({
      totalResults: 0, items: [],
      error: err instanceof Error ? err.message : 'NVD request failed',
    })
  }
}
