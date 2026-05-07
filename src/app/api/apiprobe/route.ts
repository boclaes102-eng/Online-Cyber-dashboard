import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export type BackendType = 'supabase' | 'firebase-rtdb' | 'firebase-firestore' | 'generic'

export interface EndpointResult {
  endpoint:     string
  label:        string
  status:       number
  accessible:   boolean
  empty:        boolean
  rowCount:     number | null
  columns:      string[]
  sample:       unknown[] | null
  error:        string | null
  hint:         string | null   // leaked table names from PGRST205
  responseSize: number
}

export interface ApiProbeResult {
  backendType:      BackendType
  baseUrl:          string
  schemaReachable:  boolean
  tablesProbed:     number
  results:          EndpointResult[]
  discoveredTables: string[]     // tables found via error hints
  storageBucket:    string | null
  error?:           string
}

const TIMEOUT_MS = 12_000

const SUPABASE_FALLBACK_TABLES = [
  'users', 'profiles', 'candidate_profiles', 'accounts', 'sessions', 'tokens',
  'jobs', 'vacancies', 'applications', 'candidates', 'matches',
  'companies', 'organisations', 'tenants', 'teams',
  'emails', 'notifications', 'messages',
  'config', 'settings', 'secrets', 'api_keys',
  'logs', 'audit_logs', 'events',
  'documents', 'files', 'uploads',
  'rate_limits', 'roles', 'permissions',
]

async function safeFetch(url: string, headers: Record<string, string>) {
  try {
    const res  = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
    const text = await res.text()
    let body: unknown = text
    try { body = JSON.parse(text) } catch { /* keep raw */ }
    return { status: res.status, body, size: text.length }
  } catch { return null }
}

function extractColumns(rows: unknown[]): string[] {
  if (!rows.length) return []
  const first = rows[0]
  if (first && typeof first === 'object') return Object.keys(first as object)
  return []
}

function extractHint(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const code = String(b.code ?? '')
  if (code === 'PGRST205') {
    const hint = String(b.hint ?? '')
    const match = hint.match(/public\.(\w+)/)
    return match ? match[1] : hint
  }
  return null
}

// ── Supabase ──────────────────────────────────────────────────────────────────
async function probeSupabase(baseUrl: string, apiKey: string): Promise<ApiProbeResult> {
  const url     = baseUrl.replace(/\/$/, '')
  const headers = {
    'apikey':        apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Accept':        'application/json',
  }

  let tables:         string[] = []
  let schemaReachable          = false

  const specRes = await safeFetch(`${url}/rest/v1/`, headers)
  if (specRes?.status === 200) {
    schemaReachable = true
    const spec = specRes.body as Record<string, unknown>
    if (spec?.paths && typeof spec.paths === 'object') {
      tables = Object.keys(spec.paths as object)
        .map(p => p.replace(/^\//, ''))
        .filter(p => p && !p.includes('{'))
    }
  }

  if (tables.length === 0) tables = [...SUPABASE_FALLBACK_TABLES]

  // Probe all tables in parallel
  const rawResults = await Promise.all(
    tables.map(async (table): Promise<EndpointResult> => {
      const endpoint = `${url}/rest/v1/${table}?limit=5&select=*`
      const r = await safeFetch(endpoint, headers)

      if (!r) return {
        endpoint, label: table, status: 0, accessible: false, empty: false,
        rowCount: null, columns: [], sample: null, error: 'timeout', hint: null, responseSize: 0,
      }

      const rows    = Array.isArray(r.body) ? r.body as unknown[] : null
      const hint    = extractHint(r.body)
      const isEmpty = rows !== null && rows.length === 0
      const b       = r.body as Record<string, unknown>
      const errMsg  = (!rows && r.status !== 200)
        ? String(b?.message ?? b?.error ?? b?.code ?? r.status) : null

      return {
        endpoint,
        label:        table,
        status:       r.status,
        accessible:   r.status === 200 && rows !== null,
        empty:        isEmpty,
        rowCount:     rows ? rows.length : null,
        columns:      rows ? extractColumns(rows) : [],
        sample:       rows?.slice(0, 3) ?? null,
        error:        errMsg,
        hint,
        responseSize: r.size,
      }
    })
  )

  // Collect table names leaked via PGRST205 hints
  const discoveredTables = rawResults
    .map(r => r.hint)
    .filter((h): h is string => !!h && !tables.includes(h))

  // Check public storage bucket
  let storageBucket: string | null = null
  const storageCheck = await safeFetch(`${url}/storage/v1/bucket`, headers)
  if (storageCheck?.status === 200) {
    storageBucket = `${url}/storage/v1/object/public/`
  }

  return {
    backendType:     'supabase',
    baseUrl:         url,
    schemaReachable,
    tablesProbed:    tables.length,
    results:         rawResults,
    discoveredTables,
    storageBucket,
  }
}

// ── Firebase Realtime DB ──────────────────────────────────────────────────────
async function probeFirebaseRTDB(baseUrl: string, apiKey: string): Promise<ApiProbeResult> {
  const url        = baseUrl.replace(/\/$/, '')
  const authSuffix = apiKey ? `?auth=${apiKey}` : ''
  const headers    = { Accept: 'application/json' }

  const paths = ['', 'users', 'config', 'settings', 'data', 'profiles',
                 'admin', 'secrets', 'tokens', 'keys', 'emails', 'orders']

  const results: EndpointResult[] = await Promise.all(
    paths.map(async (path): Promise<EndpointResult> => {
      const endpoint = `${url}/${path}.json${authSuffix}`
      const r = await safeFetch(endpoint, headers)
      if (!r) return { endpoint, label: path||'/', status:0, accessible:false, empty:false, rowCount:null, columns:[], sample:null, error:'timeout', hint:null, responseSize:0 }

      const isNull  = r.body === null
      const isObj   = r.body && typeof r.body === 'object' && !isNull
      const rows    = isObj ? Object.entries(r.body as object).slice(0, 3).map(([k,v]) => ({ key:k, value:v })) : null
      const accessible = r.status === 200 && !isNull

      return {
        endpoint, label: path||'/',
        status: r.status, accessible, empty: r.status===200 && isNull,
        rowCount: rows?.length ?? null, columns: rows ? ['key','value'] : [],
        sample: rows, error: !accessible ? String((r.body as Record<string,unknown>)?.error ?? (isNull ? 'null (no data or denied)' : r.status)) : null,
        hint: null, responseSize: r.size,
      }
    })
  )

  return { backendType:'firebase-rtdb', baseUrl:url, schemaReachable:true, tablesProbed:paths.length, results, discoveredTables:[], storageBucket:null }
}

// ── Firebase Firestore ────────────────────────────────────────────────────────
async function probeFirestore(projectId: string, apiKey: string): Promise<ApiProbeResult> {
  const base    = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
  const authQ   = apiKey ? `?key=${apiKey}` : ''
  const headers = { Accept: 'application/json' }

  const collections = ['users','profiles','config','settings','admin','posts',
                       'data','secrets','tokens','emails','orders','candidates']

  const schemaRes = await safeFetch(`${base}${authQ}`, headers)
  const schemaReachable = schemaRes?.status === 200

  const results: EndpointResult[] = await Promise.all(
    collections.map(async (col): Promise<EndpointResult> => {
      const endpoint = `${base}/${col}${authQ}`
      const r = await safeFetch(endpoint, headers)
      if (!r) return { endpoint, label:col, status:0, accessible:false, empty:false, rowCount:null, columns:[], sample:null, error:'timeout', hint:null, responseSize:0 }

      const b    = r.body as Record<string,unknown>
      const docs = Array.isArray(b?.documents) ? b.documents as unknown[] : null
      return {
        endpoint, label:col,
        status: r.status, accessible: r.status===200 && !!docs, empty: r.status===200 && !docs,
        rowCount: docs?.length ?? null, columns: [],
        sample: docs?.slice(0,2) ?? null,
        error: r.status!==200 ? String(b?.error ?? r.status) : null,
        hint: null, responseSize: r.size,
      }
    })
  )

  return { backendType:'firebase-firestore', baseUrl:base, schemaReachable, tablesProbed:collections.length, results, discoveredTables:[], storageBucket:null }
}

// ── Generic REST ──────────────────────────────────────────────────────────────
async function probeGeneric(baseUrl: string, apiKey: string, extraHeaders: string): Promise<ApiProbeResult> {
  const url = baseUrl.replace(/\/$/, '')
  let customHeaders: Record<string,string> = {}
  try { customHeaders = JSON.parse(extraHeaders || '{}') } catch { /* ignore */ }

  const headers: Record<string,string> = {
    Accept: 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}`, 'X-API-Key': apiKey } : {}),
    ...customHeaders,
  }

  const paths = ['/api', '/api/v1', '/api/v2', '/v1', '/v2',
                 '/api/users', '/api/config', '/api/health', '/api/status',
                 '/api/admin', '/api/data', '/graphql', '/swagger.json', '/openapi.json']

  const results: EndpointResult[] = await Promise.all(
    paths.map(async (path): Promise<EndpointResult> => {
      const endpoint = `${url}${path}`
      const r = await safeFetch(endpoint, headers)
      if (!r) return { endpoint, label:path, status:0, accessible:false, empty:false, rowCount:null, columns:[], sample:null, error:'timeout', hint:null, responseSize:0 }

      const accessible = r.status === 200 || r.status === 201
      const rows = accessible && r.body && typeof r.body === 'object' ? [r.body] : null
      return {
        endpoint, label:path,
        status: r.status, accessible, empty: false,
        rowCount: accessible ? 1 : null, columns: rows ? Object.keys(rows[0] as object).slice(0,5) : [],
        sample: rows, error: accessible ? null : String(r.status),
        hint: null, responseSize: r.size,
      }
    })
  )

  return { backendType:'generic', baseUrl:url, schemaReachable: results.some(r=>r.accessible), tablesProbed:paths.length, results, discoveredTables:[], storageBucket:null }
}

// ── Router ────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const type      = (req.nextUrl.searchParams.get('type') ?? 'supabase') as BackendType
  const url       = req.nextUrl.searchParams.get('url')?.trim() ?? ''
  const key       = req.nextUrl.searchParams.get('key')?.trim() ?? ''
  const extraHdrs = req.nextUrl.searchParams.get('headers')?.trim() ?? ''

  if (!url) return NextResponse.json({ error: 'url parameter required' }, { status: 400 })

  let result: ApiProbeResult
  try {
    if      (type === 'supabase')           result = await probeSupabase(url, key)
    else if (type === 'firebase-rtdb')      result = await probeFirebaseRTDB(url, key)
    else if (type === 'firebase-firestore') result = await probeFirestore(url, key)
    else                                    result = await probeGeneric(url, key, extraHdrs)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 200 })
  }

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
