import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export type BackendType = 'supabase' | 'firebase-rtdb' | 'firebase-firestore' | 'generic'

export interface EndpointResult {
  endpoint: string
  label: string
  status: number
  accessible: boolean
  rowCount: number | null
  sample: unknown[] | null
  error: string | null
  responseSize: number
}

export interface ApiProbeResult {
  backendType: BackendType
  baseUrl: string
  schemaReachable: boolean
  endpointsFound: string[]
  results: EndpointResult[]
  error?: string
}

const TIMEOUT_MS = 10_000

async function safeFetch(url: string, headers: Record<string, string>): Promise<{ status: number; body: unknown; size: number } | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
    const text = await res.text()
    let body: unknown = text
    try { body = JSON.parse(text) } catch { /* keep as text */ }
    return { status: res.status, body, size: text.length }
  } catch { return null }
}

// ── Supabase ──────────────────────────────────────────────────────────────────
async function probeSupabase(baseUrl: string, apiKey: string): Promise<ApiProbeResult> {
  const url     = baseUrl.replace(/\/$/, '')
  const headers = { apikey: apiKey, Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }

  let tables: string[]    = []
  let schemaReachable     = false

  const specRes = await safeFetch(`${url}/rest/v1/?apikey=${apiKey}`, headers)
  if (specRes && specRes.status === 200) {
    schemaReachable = true
    const spec = specRes.body as Record<string, unknown>
    if (spec?.paths && typeof spec.paths === 'object') {
      tables = Object.keys(spec.paths as object)
        .map(p => p.replace(/^\//, ''))
        .filter(p => p && !p.includes('{'))
    }
  }

  const results: EndpointResult[] = await Promise.all(
    tables.slice(0, 25).map(async (table): Promise<EndpointResult> => {
      const endpoint = `${url}/rest/v1/${table}?limit=3&select=*`
      const r = await safeFetch(endpoint, headers)
      if (!r) return { endpoint, label: table, status: 0, accessible: false, rowCount: null, sample: null, error: 'Request failed', responseSize: 0 }
      const rows = Array.isArray(r.body) ? r.body as unknown[] : null
      let errMsg: string | null = null
      if (!rows && r.status !== 200) {
        const b = r.body as Record<string, unknown>
        errMsg = String(b?.message ?? b?.hint ?? b?.error ?? r.status)
      }
      return { endpoint, label: table, status: r.status, accessible: r.status === 200 && !!rows, rowCount: rows ? rows.length : null, sample: rows?.slice(0, 3) ?? null, error: errMsg, responseSize: r.size }
    })
  )

  return { backendType: 'supabase', baseUrl: url, schemaReachable, endpointsFound: tables, results }
}

// ── Firebase Realtime DB ──────────────────────────────────────────────────────
async function probeFirebaseRTDB(baseUrl: string, apiKey: string): Promise<ApiProbeResult> {
  const url     = baseUrl.replace(/\/$/, '')
  const authSuffix = apiKey ? `?auth=${apiKey}` : ''
  const headers = { Accept: 'application/json' }

  const commonPaths = ['', '/users', '/config', '/settings', '/data', '/profiles', '/admin', '/secrets', '/tokens', '/keys', '/emails']

  const results: EndpointResult[] = await Promise.all(
    commonPaths.map(async (path): Promise<EndpointResult> => {
      const endpoint = `${url}${path}.json${authSuffix}`
      const r = await safeFetch(endpoint, headers)
      if (!r) return { endpoint, label: path || '/', status: 0, accessible: false, rowCount: null, sample: null, error: 'Request failed', responseSize: 0 }
      const isNull  = r.body === null
      const isObj   = r.body && typeof r.body === 'object'
      const accessible = r.status === 200 && !isNull
      const rows    = isObj && !isNull ? Object.entries(r.body as object).slice(0, 3).map(([k, v]) => ({ key: k, value: v })) : null
      const errMsg  = r.status !== 200 ? String((r.body as Record<string, unknown>)?.error ?? r.status) : isNull ? 'null (no data or access denied)' : null
      return { endpoint, label: path || '/', status: r.status, accessible, rowCount: rows?.length ?? null, sample: rows, error: errMsg, responseSize: r.size }
    })
  )

  return { backendType: 'firebase-rtdb', baseUrl: url, schemaReachable: true, endpointsFound: commonPaths, results }
}

// ── Firebase Firestore ────────────────────────────────────────────────────────
async function probeFirestore(projectId: string, apiKey: string): Promise<ApiProbeResult> {
  const base    = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
  const authQ   = apiKey ? `?key=${apiKey}` : ''
  const headers = { Accept: 'application/json' }

  const commonCollections = ['users', 'profiles', 'config', 'settings', 'admin', 'posts', 'data', 'secrets', 'tokens', 'emails', 'orders']

  const rootRes = await safeFetch(`${base}${authQ}`, headers)
  const schemaReachable = !!rootRes && rootRes.status === 200

  const results: EndpointResult[] = await Promise.all(
    commonCollections.map(async (col): Promise<EndpointResult> => {
      const endpoint = `${base}/${col}${authQ}`
      const r = await safeFetch(endpoint, headers)
      if (!r) return { endpoint, label: col, status: 0, accessible: false, rowCount: null, sample: null, error: 'Request failed', responseSize: 0 }
      const body = r.body as Record<string, unknown>
      const docs = Array.isArray(body?.documents) ? body.documents as unknown[] : null
      const errMsg = r.status !== 200 ? String(body?.error ?? r.status) : null
      return { endpoint, label: col, status: r.status, accessible: r.status === 200 && !!docs, rowCount: docs?.length ?? null, sample: docs?.slice(0, 2) ?? null, error: errMsg, responseSize: r.size }
    })
  )

  return { backendType: 'firebase-firestore', baseUrl: base, schemaReachable, endpointsFound: commonCollections, results }
}

// ── Generic REST ──────────────────────────────────────────────────────────────
async function probeGeneric(baseUrl: string, apiKey: string, extraHeaders: string): Promise<ApiProbeResult> {
  const url = baseUrl.replace(/\/$/, '')
  let customHeaders: Record<string, string> = {}
  try { customHeaders = JSON.parse(extraHeaders || '{}') } catch { /* ignore */ }

  const authHeaders: Record<string, string> = apiKey
    ? { Authorization: `Bearer ${apiKey}`, 'X-API-Key': apiKey }
    : {}

  const headers = { Accept: 'application/json', ...authHeaders, ...customHeaders }

  const commonPaths = [
    '/api', '/api/v1', '/api/v2', '/v1', '/v2',
    '/api/users', '/api/config', '/api/health', '/api/status',
    '/api/admin', '/api/data', '/graphql', '/swagger.json', '/openapi.json',
  ]

  const results: EndpointResult[] = await Promise.all(
    commonPaths.map(async (path): Promise<EndpointResult> => {
      const endpoint = `${url}${path}`
      const r = await safeFetch(endpoint, headers)
      if (!r) return { endpoint, label: path, status: 0, accessible: false, rowCount: null, sample: null, error: 'Request failed', responseSize: 0 }
      const accessible = r.status === 200 || r.status === 201
      const isObj = r.body && typeof r.body === 'object'
      const rows = isObj ? [r.body as object] : null
      return { endpoint, label: path, status: r.status, accessible, rowCount: accessible ? 1 : null, sample: rows, error: accessible ? null : String(r.status), responseSize: r.size }
    })
  )

  return { backendType: 'generic', baseUrl: url, schemaReachable: results.some(r => r.accessible), endpointsFound: commonPaths, results }
}

// ── Router ────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const type       = (req.nextUrl.searchParams.get('type') ?? 'supabase') as BackendType
  const url        = req.nextUrl.searchParams.get('url')?.trim() ?? ''
  const key        = req.nextUrl.searchParams.get('key')?.trim() ?? ''
  const extraHdrs  = req.nextUrl.searchParams.get('headers')?.trim() ?? ''

  if (!url) return NextResponse.json({ error: 'url parameter required' }, { status: 400 })

  let result: ApiProbeResult
  try {
    if      (type === 'supabase')           result = await probeSupabase(url, key)
    else if (type === 'firebase-rtdb')      result = await probeFirebaseRTDB(url, key)
    else if (type === 'firebase-firestore') result = await probeFirestore(url, key)
    else                                    result = await probeGeneric(url, key, extraHdrs)
  } catch (e) {
    return NextResponse.json({ error: String(e) } as ApiProbeResult, { status: 200 })
  }

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
