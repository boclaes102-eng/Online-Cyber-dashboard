import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const API_URL = process.env.THREAT_INTEL_API_URL ?? ''
const API_KEY  = process.env.THREAT_INTEL_API_KEY ?? ''

async function proxy(req: NextRequest, path: string[]) {
  if (!API_URL || !API_KEY) {
    return NextResponse.json({ error: 'THREAT_INTEL_API_URL or THREAT_INTEL_API_KEY not configured' }, { status: 503 })
  }

  const upstream = `${API_URL}/api/v1/${path.join('/')}${req.nextUrl.search}`

  const init: RequestInit = {
    method:  req.method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key':    API_KEY,
    },
    signal: AbortSignal.timeout(15_000),
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text()
  }

  const res  = await fetch(upstream, init)
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function GET(req: NextRequest,  { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path)
}
export async function POST(req: NextRequest,  { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path)
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path)
}
export async function DELETE(req: NextRequest,{ params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path)
}
