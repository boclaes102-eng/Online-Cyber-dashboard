import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

async function dohTxt(name: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`,
      { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/dns-json' } },
    )
    const json = await res.json()
    return (json.Answer ?? []).flatMap((a: { data: string }) =>
      [a.data.replace(/^"|"$/g, '').replace(/" "/g, '')],
    )
  } catch { return [] }
}

async function dohCname(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=CNAME`,
      { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/dns-json' } },
    )
    const json = await res.json()
    return json.Answer?.[0]?.data?.replace(/\.$/, '') ?? null
  } catch { return null }
}

const DKIM_SELECTORS = [
  'default', 'google', 'mail', 'smtp', 'dkim',
  'selector1', 'selector2', 'k1', 's1', 's2',
  'email', 'mta', 'key1', 'key2', 'mx',
]

interface DkimResult { selector: string; found: boolean; value?: string }

async function checkDkim(domain: string): Promise<DkimResult[]> {
  const results = await Promise.all(
    DKIM_SELECTORS.map(async sel => {
      const txts = await dohTxt(`${sel}._domainkey.${domain}`)
      const found = txts.some(t => t.includes('v=DKIM1') || t.includes('k=rsa') || t.includes('p='))
      return { selector: sel, found, value: found ? txts[0]?.slice(0, 100) : undefined }
    }),
  )
  return results.filter(r => r.found)
}

function analyzeDmarc(dmarc: string | null): { policy: string; pct: number; spoofable: boolean } {
  if (!dmarc) return { policy: 'none', pct: 100, spoofable: true }
  const p = dmarc.match(/\bp=(\w+)/)?.[1] ?? 'none'
  const pct = parseInt(dmarc.match(/\bpct=(\d+)/)?.[1] ?? '100', 10)
  return { policy: p, pct, spoofable: p === 'none' || (p === 'quarantine' && pct < 100) }
}

function analyzeSpf(spf: string | null): { exists: boolean; strictness: string; spoofable: boolean } {
  if (!spf) return { exists: false, strictness: 'none', spoofable: true }
  const all = spf.match(/[~\-+?]all/)?.[0] ?? '?all'
  const map: Record<string, string> = { '-all': 'strict', '~all': 'soft-fail', '+all': 'permissive (DANGEROUS)', '?all': 'neutral' }
  return { exists: true, strictness: map[all] ?? 'unknown', spoofable: all !== '-all' }
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.trim().toLowerCase()
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })

  const [spfTxts, dmarcTxts, mtaStsTxts, bimiTxts, dkimResults] = await Promise.all([
    dohTxt(domain),
    dohTxt(`_dmarc.${domain}`),
    dohTxt(`_mta-sts.${domain}`),
    dohTxt(`default._bimi.${domain}`),
    checkDkim(domain),
  ])

  const spfRecord  = spfTxts.find(t => t.startsWith('v=spf1')) ?? null
  const dmarcRecord = dmarcTxts.find(t => t.startsWith('v=DMARC1')) ?? null
  const mtaSts     = mtaStsTxts.find(t => t.includes('v=STSv1')) ?? null
  const bimi       = bimiTxts.find(t => t.includes('v=BIMI1')) ?? null

  const spfAnalysis   = analyzeSpf(spfRecord)
  const dmarcAnalysis = analyzeDmarc(dmarcRecord)

  const spoofable = spfAnalysis.spoofable || dmarcAnalysis.spoofable
  const riskScore = [
    !spfAnalysis.exists     ? 35 : spfAnalysis.strictness !== 'strict' ? 15 : 0,
    !dmarcRecord             ? 40 : dmarcAnalysis.policy === 'none' ? 20 : dmarcAnalysis.policy === 'quarantine' ? 5 : 0,
    dkimResults.length === 0 ? 25 : 0,
  ].reduce((a, b) => a + b, 0)

  return NextResponse.json({
    domain,
    spf: { record: spfRecord, ...spfAnalysis },
    dmarc: { record: dmarcRecord, ...dmarcAnalysis },
    dkim: { found: dkimResults.length > 0, selectors: dkimResults },
    mtaSts: { found: !!mtaSts, record: mtaSts },
    bimi: { found: !!bimi },
    spoofable,
    riskScore: Math.min(riskScore, 100),
    verdict: riskScore === 0 ? 'PROTECTED' : riskScore < 40 ? 'PARTIAL' : 'VULNERABLE',
  })
}
