import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const key: string = body.key ?? ''

  const allowedKeys = (process.env.DASHBOARD_API_KEYS ?? '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)

  if (!key || !allowedKeys.includes(key)) {
    return NextResponse.json({ error: 'Invalid access key' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('cyberops_auth', key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}
