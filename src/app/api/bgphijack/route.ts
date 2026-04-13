import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export type RpkiStatus  = 'valid' | 'invalid' | 'not-found' | 'unknown'
export type HijackVerdict = 'clean' | 'suspicious' | 'unverified' | 'unknown'

export interface RoaEntry {
  origin: number
  prefix: string
  maxLength: number
}

export interface BgpPeer {
  asn: number
  name: string
  countryCode?: string
}

export interface BgpHijackResult {
  input: string
  prefix?: string
  originAsn?: number
  originAsnName?: string
  rpkiStatus: RpkiStatus
  rpkiRoas: RoaEntry[]
  upstreamPeers: BgpPeer[]
  isRouted: boolean
  verdict: HijackVerdict
  verdictDetail: string
  error?: string
}

async function bgpView(path: string) {
  const res = await fetch(`https://api.bgpview.io${path}`, {
    headers: { 'User-Agent': 'CyberOps/1.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`BGPView ${res.status}`)
  return res.json()
}

async function rpkiValidate(
  asn: number,
  prefix: string,
): Promise<{ status: RpkiStatus; roas: RoaEntry[] }> {
  try {
    const url =
      `https://stat.ripe.net/data/rpki-validation/data.json` +
      `?resource=AS${asn}&prefix=${encodeURIComponent(prefix)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return { status: 'unknown', roas: [] }
    const json = await res.json()
    const status: RpkiStatus = json.data?.status ?? 'unknown'
    const roas: RoaEntry[] = (json.data?.validating_roas ?? []).map(
      (r: { origin: number; prefix: string; max_length: number }) => ({
        origin:    r.origin,
        prefix:    r.prefix,
        maxLength: r.max_length,
      }),
    )
    return { status, roas }
  } catch {
    return { status: 'unknown', roas: [] }
  }
}

function buildVerdict(
  rpkiStatus: RpkiStatus,
  originAsn?: number,
  prefix?: string,
): { verdict: HijackVerdict; verdictDetail: string } {
  if (rpkiStatus === 'valid') {
    return {
      verdict: 'clean',
      verdictDetail: `Origin AS${originAsn} is authorized by a valid ROA for ${prefix}. No hijack indicators detected.`,
    }
  }
  if (rpkiStatus === 'invalid') {
    return {
      verdict: 'suspicious',
      verdictDetail: `RPKI INVALID — AS${originAsn} is not the authorized origin for ${prefix}. This may be a route hijack or misconfiguration.`,
    }
  }
  if (rpkiStatus === 'not-found') {
    return {
      verdict: 'unverified',
      verdictDetail: `No ROA found for ${prefix}. The prefix is reachable but has no RPKI coverage — the origin cannot be cryptographically verified.`,
    }
  }
  return {
    verdict: 'unknown',
    verdictDetail: 'RPKI validation data was unavailable.',
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query) {
    return NextResponse.json(
      { error: 'q parameter required (IPv4 address, CIDR prefix, or ASN)' },
      { status: 400 },
    )
  }

  const isIp     = /^\d{1,3}(\.\d{1,3}){3}$/.test(query)
  const isPrefix = /^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(query)
  const isAsn    = /^(AS)?(\d+)$/i.test(query)

  if (!isIp && !isPrefix && !isAsn) {
    return NextResponse.json(
      { error: 'Provide an IPv4 address, CIDR prefix (e.g. 8.8.8.0/24), or ASN (e.g. AS15169)' },
      { status: 400 },
    )
  }

  try {
    let prefix: string | undefined
    let originAsn: number | undefined
    let originAsnName: string | undefined
    let upstreamPeers: BgpPeer[] = []

    // ── Resolve prefix + origin ASN ──────────────────────────────────────────
    if (isIp) {
      const data = await bgpView(`/ip/${query}`)
      const p = data.data?.prefixes?.[0]
      prefix       = p?.prefix
      originAsn    = p?.asn?.asn
      originAsnName = p?.asn?.name
    } else if (isPrefix) {
      prefix = query
      const data = await bgpView(`/prefix/${query}`)
      const peers = data.data?.ipv4_peers ?? []
      if (peers.length > 0) {
        originAsn     = peers[0]?.asn
        originAsnName = peers[0]?.name
      }
      upstreamPeers = peers.slice(0, 12).map((p: { asn: number; name: string; country_code?: string }) => ({
        asn:         p.asn,
        name:        p.name ?? 'Unknown',
        countryCode: p.country_code,
      }))
    } else {
      // ASN: grab first announced prefix
      const asnNum = parseInt(query.replace(/^AS/i, ''), 10)
      originAsn    = asnNum
      const [asnData, prefixData] = await Promise.allSettled([
        bgpView(`/asn/${asnNum}`),
        bgpView(`/asn/${asnNum}/prefixes`),
      ])
      if (asnData.status    === 'fulfilled') originAsnName = asnData.value.data?.name
      if (prefixData.status === 'fulfilled') prefix = prefixData.value.data?.ipv4_prefixes?.[0]?.prefix
    }

    // ── Fetch upstream peers for IP lookups (need prefix first) ─────────────
    if ((isIp) && prefix && upstreamPeers.length === 0) {
      try {
        const pd = await bgpView(`/prefix/${prefix}`)
        upstreamPeers = (pd.data?.ipv4_peers ?? [])
          .slice(0, 12)
          .map((p: { asn: number; name: string; country_code?: string }) => ({
            asn:         p.asn,
            name:        p.name ?? 'Unknown',
            countryCode: p.country_code,
          }))
      } catch { /* optional */ }
    }

    if (!prefix || !originAsn) {
      return NextResponse.json<BgpHijackResult>({
        input: query,
        prefix,
        originAsn,
        rpkiStatus: 'unknown',
        rpkiRoas:   [],
        upstreamPeers,
        isRouted:   false,
        verdict:    'unknown',
        verdictDetail: 'Could not resolve a prefix or origin ASN for this input.',
      })
    }

    // ── RPKI validation ──────────────────────────────────────────────────────
    const { status: rpkiStatus, roas: rpkiRoas } = await rpkiValidate(originAsn, prefix)
    const { verdict, verdictDetail } = buildVerdict(rpkiStatus, originAsn, prefix)

    return NextResponse.json<BgpHijackResult>({
      input: query,
      prefix,
      originAsn,
      originAsnName,
      rpkiStatus,
      rpkiRoas,
      upstreamPeers,
      isRouted: true,
      verdict,
      verdictDetail,
    })
  } catch (err) {
    return NextResponse.json<BgpHijackResult>({
      input: query,
      rpkiStatus:   'unknown',
      rpkiRoas:     [],
      upstreamPeers: [],
      isRouted:     false,
      verdict:      'unknown',
      verdictDetail: '',
      error: err instanceof Error ? err.message : 'BGP lookup failed',
    })
  }
}
