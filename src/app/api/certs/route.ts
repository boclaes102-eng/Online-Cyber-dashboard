import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface CrtShEntry {
  id: number
  entry_timestamp: string
  not_before: string
  not_after: string
  common_name: string
  name_value: string
  issuer_name: string
}

export interface CertEntry {
  id: number
  logged: string
  notBefore: string
  notAfter: string
  cn: string
  sans: string[]
  issuer: string
}

export interface CertResult {
  domain: string
  total: number
  certs: CertEntry[]
  error?: string
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.trim().toLowerCase()
  if (!domain) return NextResponse.json({ error: 'domain is required' }, { status: 400 })

  if (!/^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://crt.sh/?q=%.${domain}&output=json`,
      {
        headers: { Accept: 'application/json' },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(20_000),
      },
    )

    if (!res.ok) throw new Error(`crt.sh responded with ${res.status}`)

    const raw: CrtShEntry[] = await res.json()

    const seen = new Set<number>()
    const certs: CertEntry[] = []

    for (const entry of raw) {
      if (seen.has(entry.id)) continue
      seen.add(entry.id)

      const sans = [
        ...new Set(
          entry.name_value
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean),
        ),
      ]

      certs.push({
        id: entry.id,
        logged: entry.entry_timestamp,
        notBefore: entry.not_before,
        notAfter: entry.not_after,
        cn: entry.common_name,
        sans,
        issuer: entry.issuer_name,
      })
    }

    certs.sort((a, b) => new Date(b.logged).getTime() - new Date(a.logged).getTime())

    return NextResponse.json<CertResult>({
      domain,
      total: certs.length,
      certs: certs.slice(0, 200),
    })
  } catch (err) {
    return NextResponse.json<CertResult>({
      domain,
      total: 0,
      certs: [],
      error: err instanceof Error ? err.message : 'Lookup failed',
    })
  }
}
