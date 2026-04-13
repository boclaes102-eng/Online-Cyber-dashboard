import { NextRequest, NextResponse } from 'next/server'
import type { HashResult, VtResult, MbResult } from '@/lib/types'
import { detectHashType } from '@/lib/utils'

export const runtime = 'nodejs'

async function queryVirusTotal(hash: string): Promise<VtResult> {
  const apiKey = process.env.VT_API_KEY
  if (!apiKey) return { found: false, malicious: 0, suspicious: 0, harmless: 0, undetected: 0, total: 0, error: 'VT_API_KEY not configured' }

  try {
    const res = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
      headers: { 'x-apikey': apiKey },
      next: { revalidate: 3600 },
    })
    if (res.status === 404) return { found: false, malicious: 0, suspicious: 0, harmless: 0, undetected: 0, total: 0 }
    if (res.status === 401) return { found: false, malicious: 0, suspicious: 0, harmless: 0, undetected: 0, total: 0, error: 'Invalid VT API key' }
    if (res.status === 429) return { found: false, malicious: 0, suspicious: 0, harmless: 0, undetected: 0, total: 0, error: 'VT rate limit exceeded' }
    if (!res.ok)            return { found: false, malicious: 0, suspicious: 0, harmless: 0, undetected: 0, total: 0, error: `VT HTTP ${res.status}` }

    const body  = await res.json()
    const attrs = body.data?.attributes ?? {}
    const stats = attrs.last_analysis_stats ?? {}
    const classification = attrs.popular_threat_classification ?? {}

    return {
      found:        true,
      malicious:    stats.malicious  ?? 0,
      suspicious:   stats.suspicious ?? 0,
      harmless:     stats.harmless   ?? 0,
      undetected:   stats.undetected ?? 0,
      total:        Object.values(stats).reduce((a: number, v) => a + (v as number), 0),
      threatLabel:  classification.suggested_threat_label,
      lastAnalysis: attrs.last_analysis_date
        ? new Date(attrs.last_analysis_date * 1000).toISOString().split('T')[0]
        : undefined,
      permalink:    `https://www.virustotal.com/gui/file/${hash}`,
    }
  } catch (err) {
    return { found: false, malicious: 0, suspicious: 0, harmless: 0, undetected: 0, total: 0, error: String(err) }
  }
}

async function queryMalwareBazaar(hash: string): Promise<MbResult> {
  try {
    const res = await fetch('https://mb-api.abuse.ch/api/v1/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `query=get_info&hash=${encodeURIComponent(hash)}`,
      next: { revalidate: 3600 },
    })
    if (!res.ok) return { found: false }
    const data = await res.json()
    if (data.query_status !== 'ok' || !data.data?.[0]) return { found: false }
    const d = data.data[0]
    return {
      found:     true,
      fileName:  d.file_name,
      fileType:  d.file_type,
      fileSize:  d.file_size,
      firstSeen: d.first_seen,
      lastSeen:  d.last_seen,
      tags:      d.tags ?? [],
      signature: d.signature,
    }
  } catch {
    return { found: false }
  }
}

export async function GET(req: NextRequest) {
  const hash = req.nextUrl.searchParams.get('hash')?.trim().toLowerCase()
  if (!hash) return NextResponse.json({ error: 'hash parameter required' }, { status: 400 })

  const hashType = detectHashType(hash)
  if (hashType === 'UNKNOWN') {
    return NextResponse.json<HashResult>({ hash, hashType, error: 'Unrecognised hash format (expected MD5/SHA1/SHA256/SHA512)' })
  }

  // Run both lookups in parallel
  const [virustotal, malwarebazaar] = await Promise.all([
    queryVirusTotal(hash),
    queryMalwareBazaar(hash),
  ])

  return NextResponse.json<HashResult>({ hash, hashType, virustotal, malwarebazaar })
}
