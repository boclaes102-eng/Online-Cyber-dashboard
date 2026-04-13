import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export interface RansomwareVictim {
  postTitle:   string
  groupName:   string
  discovered:  string
  website:     string
  published:   string
  postUrl:     string
  country:     string | null
  activity:    string | null
  description: string | null
}

export interface RansomwareGroup {
  name:        string
  description: string | null
  locations:   Array<{ fqdn: string; available: boolean }>
  recentPosts: number
}

export interface RansomwareResult {
  mode:     'recent' | 'groups' | 'group'
  victims:  RansomwareVictim[]
  groups:   RansomwareGroup[]
  groupName?: string
  total:    number
  error?:   string
}

const BASE = 'https://api.ransomware.live'
const TIMEOUT = 15_000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toVictim(v: any): RansomwareVictim {
  return {
    postTitle:   v.post_title   ?? v.postTitle   ?? '',
    groupName:   v.group_name   ?? v.groupName   ?? '',
    discovered:  v.discovered   ?? '',
    website:     v.website      ?? '',
    published:   v.published    ?? '',
    postUrl:     v.post_url     ?? v.postUrl     ?? '',
    country:     v.country      ?? null,
    activity:    v.activity     ?? null,
    description: v.description  ?? null,
  }
}

export async function GET(req: NextRequest) {
  const mode  = (req.nextUrl.searchParams.get('mode') ?? 'recent') as 'recent' | 'groups' | 'group'
  const group = req.nextUrl.searchParams.get('group')?.trim().toLowerCase() ?? ''

  try {
    if (mode === 'groups') {
      const res  = await fetch(`${BASE}/groups`, { signal: AbortSignal.timeout(TIMEOUT) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = await res.json()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groups: RansomwareGroup[] = data.map((g: any) => ({
        name:        g.name        ?? '',
        description: g.description ?? null,
        locations:   (g.locations ?? []).map((l: any) => ({
          fqdn:      l.fqdn      ?? '',
          available: !!l.available,
        })),
        recentPosts: Array.isArray(g.meta) ? g.meta.length : 0,
      })).sort((a: RansomwareGroup, b: RansomwareGroup) => b.recentPosts - a.recentPosts)

      return NextResponse.json({ mode: 'groups', victims: [], groups, total: groups.length } as RansomwareResult)
    }

    if (mode === 'group' && group) {
      const res  = await fetch(`${BASE}/victims/${encodeURIComponent(group)}`, { signal: AbortSignal.timeout(TIMEOUT) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = await res.json()
      const victims = data.slice(0, 100).map(toVictim)
      return NextResponse.json({ mode: 'group', victims, groups: [], groupName: group, total: victims.length } as RansomwareResult)
    }

    // Default: recent victims
    const res  = await fetch(`${BASE}/recentvictims`, { signal: AbortSignal.timeout(TIMEOUT) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json()
    const victims = data.slice(0, 60).map(toVictim)

    return NextResponse.json({ mode: 'recent', victims, groups: [], total: data.length } as RansomwareResult)
  } catch (e) {
    return NextResponse.json({ error: `Failed: ${(e as Error).message}` }, { status: 502 })
  }
}
