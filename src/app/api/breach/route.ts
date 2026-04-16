import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// HIBP Pwned Passwords — k-anonymity model
// We proxy this so the raw prefix stays server-side, and to set the padding header.
export async function GET(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get('prefix')?.trim().toUpperCase()
  if (!prefix || prefix.length !== 5 || !/^[0-9A-F]{5}$/.test(prefix)) {
    return NextResponse.json({ error: 'prefix must be exactly 5 hex chars' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent':  'cyberops-dashboard/1.0',
        'Add-Padding': 'true',
      },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `HIBP returned ${res.status}` }, { status: 502 })
    }

    const text = await res.text()
    // Return raw suffix:count list — client matches its own suffix
    return new NextResponse(text, {
      headers: {
        'Content-Type':  'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'HIBP request failed' },
      { status: 502 }
    )
  }
}
