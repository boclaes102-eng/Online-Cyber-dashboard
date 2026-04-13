import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export interface PlatformResult {
  name: string
  url: string
  category: string
  found: boolean | null
  status?: number
}

export interface UsernameResult {
  username: string
  found: number
  notFound: number
  unknown: number
  results: PlatformResult[]
}

const PLATFORMS: { name: string; url: string; category: string }[] = [
  { name: 'GitHub',       url: 'https://github.com/{u}',                            category: 'Dev'     },
  { name: 'GitLab',       url: 'https://gitlab.com/{u}',                            category: 'Dev'     },
  { name: 'npm',          url: 'https://www.npmjs.com/~{u}',                        category: 'Dev'     },
  { name: 'PyPI',         url: 'https://pypi.org/user/{u}/',                        category: 'Dev'     },
  { name: 'Replit',       url: 'https://replit.com/@{u}',                           category: 'Dev'     },
  { name: 'CodePen',      url: 'https://codepen.io/{u}',                            category: 'Dev'     },
  { name: 'DEV.to',       url: 'https://dev.to/{u}',                                category: 'Dev'     },
  { name: 'Docker Hub',   url: 'https://hub.docker.com/u/{u}/',                     category: 'Dev'     },
  { name: 'Keybase',      url: 'https://keybase.io/{u}',                            category: 'Social'  },
  { name: 'Reddit',       url: 'https://www.reddit.com/user/{u}/about.json',        category: 'Social'  },
  { name: 'HackerNews',   url: 'https://news.ycombinator.com/user?id={u}',          category: 'Social'  },
  { name: 'Gravatar',     url: 'https://en.gravatar.com/{u}',                       category: 'Social'  },
  { name: 'Mastodon',     url: 'https://mastodon.social/@{u}',                      category: 'Social'  },
  { name: 'Product Hunt', url: 'https://www.producthunt.com/@{u}',                  category: 'Social'  },
  { name: 'Patreon',      url: 'https://www.patreon.com/{u}',                       category: 'Content' },
  { name: 'Twitch',       url: 'https://www.twitch.tv/{u}',                         category: 'Content' },
  { name: 'Medium',       url: 'https://medium.com/@{u}',                           category: 'Content' },
  { name: 'Steam',        url: 'https://steamcommunity.com/id/{u}',                 category: 'Gaming'  },
  { name: 'Spotify',      url: 'https://open.spotify.com/user/{u}',                 category: 'Content' },
  { name: 'Flickr',       url: 'https://www.flickr.com/people/{u}',                 category: 'Photo'   },
]

async function checkPlatform(
  platform: (typeof PLATFORMS)[number],
  username: string,
): Promise<PlatformResult> {
  const url = platform.url.replace('{u}', encodeURIComponent(username))
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CyberOps/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(6_000),
    })
    return { name: platform.name, url, category: platform.category, found: res.status === 200, status: res.status }
  } catch {
    return { name: platform.name, url, category: platform.category, found: null }
  }
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.trim()
  if (!username) return NextResponse.json({ error: 'username is required' }, { status: 400 })
  if (username.length > 50) return NextResponse.json({ error: 'Username too long' }, { status: 400 })
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return NextResponse.json({ error: 'Invalid username — only letters, digits, ., _, - allowed' }, { status: 400 })
  }

  const results = await Promise.all(PLATFORMS.map(p => checkPlatform(p, username)))

  return NextResponse.json<UsernameResult>({
    username,
    found:    results.filter(r => r.found === true).length,
    notFound: results.filter(r => r.found === false).length,
    unknown:  results.filter(r => r.found === null).length,
    results,
  })
}
