import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ─── MurmurHash3 (32-bit, seed=0) — matches Python mmh3.hash() ───────────────
function murmur3(data: Buffer): number {
  const c1 = 0xcc9e2d51
  const c2 = 0x1b873593
  let h1 = 0

  const len = data.length
  const nblocks = Math.floor(len / 4)

  for (let i = 0; i < nblocks; i++) {
    let k1 = data.readInt32LE(i * 4)
    k1 = Math.imul(k1, c1)
    k1 = (k1 << 15) | (k1 >>> 17)
    k1 = Math.imul(k1, c2)

    h1 ^= k1
    h1 = (h1 << 13) | (h1 >>> 19)
    h1 = (Math.imul(h1, 5) + 0xe6546b64) | 0
  }

  // Tail bytes
  let k1 = 0
  const tail = len & 3
  if (tail >= 3) k1 ^= data[nblocks * 4 + 2] << 16
  if (tail >= 2) k1 ^= data[nblocks * 4 + 1] << 8
  if (tail >= 1) {
    k1 ^= data[nblocks * 4]
    k1 = Math.imul(k1, c1)
    k1 = (k1 << 15) | (k1 >>> 17)
    k1 = Math.imul(k1, c2)
    h1 ^= k1
  }

  // Finalization mix
  h1 ^= len
  h1 ^= h1 >>> 16
  h1 = Math.imul(h1, 0x85ebca6b)
  h1 ^= h1 >>> 13
  h1 = Math.imul(h1, 0xc2b2ae35)
  h1 ^= h1 >>> 16

  return h1 | 0  // signed 32-bit — Shodan hashes can be negative
}

// Python base64.encodebytes() inserts '\n' every 76 chars and at the end
function shodanBase64(buf: Buffer): string {
  const b64 = buf.toString('base64')
  let out = ''
  for (let i = 0; i < b64.length; i += 76) out += b64.slice(i, i + 76) + '\n'
  return out
}

export interface FaviconResult {
  url: string
  faviconUrl: string
  hash: number
  shodanQuery: string
  shodanLink: string
  fofaQuery: string
  base64Preview: string
  sizeBytes: number
  error?: string
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async function tryFetch(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(7_000),
    })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  let rawUrl = req.nextUrl.searchParams.get('url')?.trim()
  if (!rawUrl) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    rawUrl = 'https://' + rawUrl
  }

  let origin: string
  let hostname: string
  try {
    const parsed = new URL(rawUrl)
    origin = parsed.origin
    hostname = parsed.hostname
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  let faviconBuf: Buffer | null = null
  let faviconUrl = `${origin}/favicon.ico`

  // 1. Try /favicon.ico first
  faviconBuf = await tryFetch(`${origin}/favicon.ico`)

  // 2. Try /favicon.png
  if (!faviconBuf) {
    faviconBuf = await tryFetch(`${origin}/favicon.png`)
    if (faviconBuf) faviconUrl = `${origin}/favicon.png`
  }

  // 3. Parse <link rel="icon"> from the homepage
  if (!faviconBuf) {
    try {
      const homeRes = await fetch(origin, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(8_000),
      })
      if (homeRes.ok) {
        const html = await homeRes.text()
        const m =
          html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ??
          html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i)
        if (m) {
          const iconHref = m[1].startsWith('http') ? m[1] : new URL(m[1], origin).href
          const buf = await tryFetch(iconHref)
          if (buf) { faviconBuf = buf; faviconUrl = iconHref }
        }
      }
    } catch { /* ignore */ }
  }

  if (!faviconBuf || faviconBuf.length === 0) {
    return NextResponse.json<FaviconResult>({
      url: rawUrl,
      faviconUrl,
      hash: 0,
      shodanQuery: '',
      shodanLink: '',
      fofaQuery: '',
      base64Preview: '',
      sizeBytes: 0,
      error: `No favicon found at ${hostname}`,
    })
  }

  const encoded = shodanBase64(faviconBuf)
  const hash = murmur3(Buffer.from(encoded))

  return NextResponse.json<FaviconResult>({
    url: rawUrl,
    faviconUrl,
    hash,
    shodanQuery: `http.favicon.hash:${hash}`,
    shodanLink:  `https://www.shodan.io/search?query=http.favicon.hash%3A${hash}`,
    fofaQuery:   `icon_hash="${hash}"`,
    base64Preview: faviconBuf.toString('base64').slice(0, 80),
    sizeBytes: faviconBuf.length,
  })
}
