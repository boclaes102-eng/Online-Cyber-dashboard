export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ParsedSsdeep {
  blocksize: number
  hash1: string
  hash2: string
  raw: string
}

export interface SsdeepCompare {
  h1: ParsedSsdeep
  h2: ParsedSsdeep
  score: number           // 0–100
  comparable: boolean
  relation: 'equal' | 'double' | 'half' | 'none'
  interpretation: string
}

export type SsdeepResult =
  | { mode: 'compare'; compare: SsdeepCompare; error?: never }
  | { mode: 'parse';   hash: ParsedSsdeep;     error?: never }
  | { error: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Format: blocksize:hash1:hash2  (base64 chars, max 64 per segment)
const RE = /^(\d+):([A-Za-z0-9/+]{0,64}):([A-Za-z0-9/+]{0,32})$/

function parseSsdeep(raw: string): ParsedSsdeep | null {
  const m = raw.trim().match(RE)
  if (!m) return null
  const bs = parseInt(m[1], 10)
  if (bs < 3) return null
  return { blocksize: bs, hash1: m[2], hash2: m[3], raw: raw.trim() }
}

// Wagner-Fischer edit distance — O(n) space
function editDist(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = new Uint16Array(n + 1).map((_, i) => i)
  for (let i = 1; i <= m; i++) {
    const curr = new Uint16Array(n + 1)
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1])
    }
    prev = curr
  }
  return prev[n]
}

const SPAMSUM_LEN = 64

function scoreSegs(a: string, b: string): number {
  const s1 = a.slice(0, SPAMSUM_LEN)
  const s2 = b.slice(0, SPAMSUM_LEN)
  if (!s1 || !s2) return 0
  const d = editDist(s1, s2)
  return Math.max(0, Math.round(100 * (1 - d / Math.max(s1.length, s2.length))))
}

function interpret(score: number): string {
  if (score === 100) return 'Identical or near-identical — same file or byte-for-byte copy'
  if (score >= 80)   return 'Very high similarity — almost certainly the same malware family or variant'
  if (score >= 60)   return 'High similarity — significant shared code sections; likely related samples'
  if (score >= 40)   return 'Moderate similarity — notable shared blocks; worth investigating'
  if (score >= 20)   return 'Low similarity — minor overlap; possibly incidental'
  if (score > 0)     return 'Minimal similarity — probably unrelated files'
  return 'No meaningful similarity detected'
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const p    = req.nextUrl.searchParams
  const mode = p.get('mode') ?? 'parse'

  try {
    if (mode === 'compare') {
      const h1 = parseSsdeep(p.get('h1') ?? '')
      const h2 = parseSsdeep(p.get('h2') ?? '')
      if (!h1) return NextResponse.json({ error: 'Invalid SSDEEP hash in field 1 — expected blocksize:hash1:hash2' }, { status: 400 })
      if (!h2) return NextResponse.json({ error: 'Invalid SSDEEP hash in field 2 — expected blocksize:hash1:hash2' }, { status: 400 })

      let score = 0
      let relation: SsdeepCompare['relation'] = 'none'

      if (h1.blocksize === h2.blocksize) {
        relation = 'equal'
        score = Math.max(scoreSegs(h1.hash1, h2.hash1), scoreSegs(h1.hash2, h2.hash2))
      } else if (h1.blocksize * 2 === h2.blocksize) {
        relation = 'double'
        score = scoreSegs(h1.hash2, h2.hash1)
      } else if (h2.blocksize * 2 === h1.blocksize) {
        relation = 'half'
        score = scoreSegs(h1.hash1, h2.hash2)
      }

      const compare: SsdeepCompare = {
        h1, h2, score,
        comparable: relation !== 'none',
        relation,
        interpretation: relation === 'none'
          ? 'Block sizes are incompatible — hashes cannot be compared (must be equal or differ by exactly 2×)'
          : interpret(score),
      }
      return NextResponse.json({ mode: 'compare', compare } satisfies SsdeepResult, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    if (mode === 'parse') {
      const hash = parseSsdeep(p.get('h') ?? '')
      if (!hash) return NextResponse.json({ error: 'Invalid SSDEEP hash — expected blocksize:hash1:hash2' }, { status: 400 })
      return NextResponse.json({ mode: 'parse', hash } satisfies SsdeepResult, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    return NextResponse.json({ error: `Unknown mode "${mode}"` }, { status: 400 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
