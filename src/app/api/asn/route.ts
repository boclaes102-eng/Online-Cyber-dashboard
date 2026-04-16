import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

async function bgpViewGet(path: string) {
  const res = await fetch(`https://api.bgpview.io${path}`, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'CyberOps-Scanner/1.0', Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`BGPView ${res.status}`)
  return res.json()
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query) return NextResponse.json({ error: 'q (IP or ASN) required' }, { status: 400 })

  try {
    // Detect if input is an IP or ASN number
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(query)
    const isAsn = /^(AS)?(\d+)$/i.test(query)

    let asnNum: number | null = null
    let ipData: Record<string, unknown> | null = null

    if (isIp) {
      const ipRes = await bgpViewGet(`/ip/${query}`)
      ipData = ipRes.data
      asnNum = ipRes.data?.prefixes?.[0]?.asn?.asn ?? null
    } else if (isAsn) {
      asnNum = parseInt(query.replace(/^AS/i, ''), 10)
    } else {
      return NextResponse.json({ error: 'Provide an IPv4 address or AS number (e.g. 15169 or AS15169)' }, { status: 400 })
    }

    if (!asnNum) {
      return NextResponse.json({
        query,
        ipInfo: ipData,
        asn: null,
        note: 'No ASN found for this IP',
      })
    }

    const [asnRes, prefixRes, peersRes] = await Promise.allSettled([
      bgpViewGet(`/asn/${asnNum}`),
      bgpViewGet(`/asn/${asnNum}/prefixes`),
      bgpViewGet(`/asn/${asnNum}/peers`),
    ])

    const asnInfo  = asnRes.status  === 'fulfilled' ? asnRes.value.data  : null
    const prefixes = prefixRes.status === 'fulfilled' ? prefixRes.value.data?.ipv4_prefixes?.slice(0, 30) : []
    const peers    = peersRes.status  === 'fulfilled' ? peersRes.value.data?.ipv4_peers?.slice(0, 20) : []

    return NextResponse.json({
      query,
      asnNum,
      ipInfo: ipData,
      asn: asnInfo
        ? {
            asn: asnInfo.asn,
            name: asnInfo.name,
            description: asnInfo.description_short ?? asnInfo.description_full?.[0],
            countryCode: asnInfo.country_code,
            rir: asnInfo.rir_allocation?.rir_name,
            prefixCount: { ipv4: asnInfo.prefixes_count_v4, ipv6: asnInfo.prefixes_count_v6 },
            abuseContacts: asnInfo.abuse_contacts,
            website: asnInfo.website,
          }
        : null,
      prefixes: (prefixes ?? []).map((p: { prefix: string; name: string; description: string; country_code: string }) => ({
        prefix:      p.prefix,
        name:        p.name,
        description: p.description,
        countryCode: p.country_code,
      })),
      peers: (peers ?? []).map((p: { asn: number; name: string; description: string; country_code: string }) => ({
        asn:         p.asn,
        name:        p.name,
        description: p.description,
        countryCode: p.country_code,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'BGP lookup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
