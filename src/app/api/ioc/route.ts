import { NextRequest, NextResponse } from 'next/server'
import type { IocResult, IocType, IocVerdict, IocSource } from '@/lib/types'

export const runtime = 'nodejs'

function detectType(ioc: string): IocType {
  const s = ioc.trim()
  if (/^[0-9a-f]{32}$/i.test(s))  return 'HASH'  // MD5
  if (/^[0-9a-f]{40}$/i.test(s))  return 'HASH'  // SHA1
  if (/^[0-9a-f]{64}$/i.test(s))  return 'HASH'  // SHA256
  if (/^[0-9a-f]{128}$/i.test(s)) return 'HASH'  // SHA512
  if (/^https?:\/\//i.test(s))    return 'URL'
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(s)) return 'IP'
  if (/^[0-9a-f:]+$/i.test(s) && s.split(':').length >= 4) return 'IP'
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(s)) return 'DOMAIN'
  return 'UNKNOWN'
}

async function checkMalwareBazaar(hash: string): Promise<IocSource> {
  try {
    const res = await fetch('https://mb-api.abuse.ch/api/v1/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `query=get_info&hash=${encodeURIComponent(hash)}`,
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    if (data.query_status === 'hash_not_found') return { name: 'MalwareBazaar', found: false }
    if (data.query_status === 'ok' && data.data?.[0]) {
      const d = data.data[0]
      return {
        name: 'MalwareBazaar', found: true, verdict: 'MALICIOUS',
        details: `${d.file_name ?? 'unknown'} · ${d.file_type ?? ''} · ${d.signature ?? 'no sig'}`,
        url: `https://bazaar.abuse.ch/sample/${hash}/`,
      }
    }
    return { name: 'MalwareBazaar', found: false }
  } catch { return { name: 'MalwareBazaar', found: false } }
}

async function checkUrlhaus(ioc: string, type: IocType): Promise<IocSource> {
  try {
    const body = type === 'URL'
      ? `url=${encodeURIComponent(ioc)}`
      : `host=${encodeURIComponent(ioc)}`
    const endpoint = type === 'URL'
      ? 'https://urlhaus-api.abuse.ch/v1/url/'
      : 'https://urlhaus-api.abuse.ch/v1/host/'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    if (data.query_status === 'no_results' || data.query_status === 'not_found') return { name: 'URLhaus', found: false }
    if (data.query_status === 'is_available' || data.query_status === 'ok') {
      const urlsCount = data.urls_count ?? data.urls?.length ?? 0
      return {
        name: 'URLhaus', found: true, verdict: 'MALICIOUS',
        details: data.threat ? `Threat: ${data.threat}` : `${urlsCount} malicious URL(s)`,
        url: data.urlhaus_reference ?? `https://urlhaus.abuse.ch/`,
      }
    }
    return { name: 'URLhaus', found: false }
  } catch { return { name: 'URLhaus', found: false } }
}

async function checkVt(ioc: string, type: IocType, apiKey: string): Promise<IocSource> {
  try {
    let endpoint: string
    if (type === 'HASH')   endpoint = `https://www.virustotal.com/api/v3/files/${ioc}`
    else if (type === 'IP') endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${ioc}`
    else if (type === 'DOMAIN') endpoint = `https://www.virustotal.com/api/v3/domains/${ioc}`
    else endpoint = `https://www.virustotal.com/api/v3/urls/${Buffer.from(ioc).toString('base64url')}`

    const res = await fetch(endpoint, {
      headers: { 'x-apikey': apiKey },
      signal: AbortSignal.timeout(10_000),
    })
    if (res.status === 404) return { name: 'VirusTotal', found: false }
    if (!res.ok) return { name: 'VirusTotal', found: false }
    const data = await res.json()
    const stats = data?.data?.attributes?.last_analysis_stats ?? {}
    const mal = stats.malicious ?? 0
    const sus = stats.suspicious ?? 0
    const total = mal + sus + (stats.harmless ?? 0) + (stats.undetected ?? 0)
    const verdict = mal > 0 ? 'MALICIOUS' : sus > 0 ? 'SUSPICIOUS' : 'CLEAN'
    return {
      name: 'VirusTotal', found: total > 0,
      verdict,
      details: total > 0 ? `${mal}/${total} engines flagged` : 'No detections',
    }
  } catch { return { name: 'VirusTotal', found: false } }
}

async function checkAbuseipdb(ip: string, apiKey: string): Promise<IocSource> {
  try {
    const res = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90&verbose`,
      { headers: { Key: apiKey, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return { name: 'AbuseIPDB', found: false }
    const data = await res.json()
    const score = data.data?.abuseConfidenceScore ?? 0
    const reports = data.data?.totalReports ?? 0
    const verdict = score >= 80 ? 'MALICIOUS' : score >= 30 ? 'SUSPICIOUS' : 'CLEAN'
    return {
      name: 'AbuseIPDB', found: reports > 0,
      verdict,
      details: `Score ${score}/100 · ${reports} reports`,
      url: `https://www.abuseipdb.com/check/${ip}`,
    }
  } catch { return { name: 'AbuseIPDB', found: false } }
}

async function checkOtx(ioc: string, type: IocType, apiKey: string): Promise<IocSource & { tags?: string[] }> {
  const sectionMap: Record<IocType, string> = {
    IP: 'IPv4', DOMAIN: 'domain', URL: 'url', HASH: 'file', UNKNOWN: 'domain',
  }
  const section = sectionMap[type]
  try {
    const res = await fetch(
      `https://otx.alienvault.com/api/v1/indicators/${section}/${encodeURIComponent(ioc)}/general`,
      { headers: { 'X-OTX-API-KEY': apiKey }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return { name: 'OTX AlienVault', found: false }
    const data = await res.json()
    const pulseCount = data.pulse_info?.count ?? 0
    const tags: string[] = data.pulse_info?.pulses?.flatMap((p: { tags: string[] }) => p.tags ?? []).slice(0, 8) ?? []
    const verdict = pulseCount > 0 ? 'MALICIOUS' : 'CLEAN'
    return {
      name: 'OTX AlienVault', found: pulseCount > 0,
      verdict: pulseCount > 0 ? verdict : 'CLEAN',
      details: pulseCount > 0 ? `Found in ${pulseCount} threat pulse(s)` : 'No threat pulses',
      url: `https://otx.alienvault.com/indicator/${section}/${ioc}`,
      tags,
    }
  } catch { return { name: 'OTX AlienVault', found: false } }
}

export async function GET(req: NextRequest) {
  const ioc = req.nextUrl.searchParams.get('ioc')?.trim()
  if (!ioc) return NextResponse.json({ error: 'ioc parameter required' }, { status: 400 })

  const type    = detectType(ioc)
  const vtKey   = process.env.VT_API_KEY
  const abuseKey = process.env.ABUSEIPDB_API_KEY
  const otxKey  = process.env.OTX_API_KEY

  const tasks: Promise<IocSource & { tags?: string[] }>[] = []

  if (type === 'HASH') {
    tasks.push(checkMalwareBazaar(ioc))
    if (vtKey) tasks.push(checkVt(ioc, type, vtKey))
  }
  if (type === 'URL') {
    tasks.push(checkUrlhaus(ioc, type))
    if (vtKey) tasks.push(checkVt(ioc, type, vtKey))
  }
  if (type === 'IP') {
    if (abuseKey) tasks.push(checkAbuseipdb(ioc, abuseKey))
    if (vtKey)    tasks.push(checkVt(ioc, type, vtKey))
  }
  if (type === 'DOMAIN') {
    tasks.push(checkUrlhaus(ioc, type))
    if (vtKey) tasks.push(checkVt(ioc, type, vtKey))
  }
  if (otxKey && type !== 'UNKNOWN') tasks.push(checkOtx(ioc, type, otxKey))

  const sources = await Promise.all(tasks)

  // Collect tags from OTX
  const tags = sources.flatMap(s => s.tags ?? []).filter((v, i, a) => a.indexOf(v) === i).slice(0, 12)

  const malCount = sources.filter(s => s.verdict === 'MALICIOUS').length
  const susCount = sources.filter(s => s.verdict === 'SUSPICIOUS').length
  const verdict: IocVerdict = malCount > 0 ? 'MALICIOUS' : susCount > 0 ? 'SUSPICIOUS'
    : sources.length > 0 ? 'CLEAN' : 'UNKNOWN'

  const score = Math.min(100, malCount * 40 + susCount * 20)

  const result: IocResult = {
    ioc, type, verdict, score,
    sources: sources.map(({ tags: _t, ...s }) => s),
    tags,
  }
  return NextResponse.json(result)
}
