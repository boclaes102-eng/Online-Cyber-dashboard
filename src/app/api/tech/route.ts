import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

interface Detection { category: string; name: string; version?: string; confidence: 'High' | 'Medium' | 'Low' }

const RULES: Array<{
  category: string
  name: string
  headerKey?: string
  headerRx?: RegExp
  bodyRx?: RegExp
  confidence: 'High' | 'Medium' | 'Low'
  versionRx?: RegExp
}> = [
  // Web server
  { category: 'Server', name: 'Nginx', headerKey: 'server', headerRx: /nginx/i, confidence: 'High', versionRx: /nginx\/([\d.]+)/i },
  { category: 'Server', name: 'Apache', headerKey: 'server', headerRx: /apache/i, confidence: 'High', versionRx: /Apache\/([\d.]+)/i },
  { category: 'Server', name: 'IIS', headerKey: 'server', headerRx: /Microsoft-IIS/i, confidence: 'High', versionRx: /IIS\/([\d.]+)/i },
  { category: 'Server', name: 'LiteSpeed', headerKey: 'server', headerRx: /litespeed/i, confidence: 'High' },
  { category: 'Server', name: 'Caddy', headerKey: 'server', headerRx: /caddy/i, confidence: 'High' },
  { category: 'Server', name: 'OpenResty', headerKey: 'server', headerRx: /openresty/i, confidence: 'High' },
  // Language / runtime
  { category: 'Language', name: 'PHP', headerKey: 'x-powered-by', headerRx: /PHP/i, confidence: 'High', versionRx: /PHP\/([\d.]+)/i },
  { category: 'Language', name: 'ASP.NET', headerKey: 'x-powered-by', headerRx: /ASP\.NET/i, confidence: 'High' },
  { category: 'Language', name: 'Node.js / Express', headerKey: 'x-powered-by', headerRx: /Express/i, confidence: 'High' },
  { category: 'Language', name: 'Ruby on Rails', headerKey: 'x-powered-by', headerRx: /Phusion Passenger|Rails/i, confidence: 'High' },
  // CMS
  { category: 'CMS', name: 'WordPress', bodyRx: /wp-content|wp-includes|\/wp-json\//i, confidence: 'High' },
  { category: 'CMS', name: 'Drupal', bodyRx: /drupal|sites\/default\/files|Drupal\.settings/i, confidence: 'High' },
  { category: 'CMS', name: 'Joomla', bodyRx: /\/components\/com_|joomla/i, confidence: 'High' },
  { category: 'CMS', name: 'Shopify', bodyRx: /cdn\.shopify\.com|Shopify\.theme/i, confidence: 'High' },
  { category: 'CMS', name: 'Wix', bodyRx: /wixsite\.com|static\.wixstatic\.com/i, confidence: 'High' },
  { category: 'CMS', name: 'Squarespace', bodyRx: /squarespace\.com|static1\.squarespace/i, confidence: 'High' },
  { category: 'CMS', name: 'Ghost', bodyRx: /ghost\.io|content\.ghost\.org/i, confidence: 'High' },
  // JS frameworks
  { category: 'Framework', name: 'Next.js', bodyRx: /__NEXT_DATA__|_next\/static/i, confidence: 'High' },
  { category: 'Framework', name: 'Nuxt.js', bodyRx: /__nuxt__|_nuxt\//i, confidence: 'High' },
  { category: 'Framework', name: 'Gatsby', bodyRx: /___gatsby|gatsby-chunk-mapping/i, confidence: 'High' },
  { category: 'Framework', name: 'React', bodyRx: /react-root|__reactFiber|data-reactroot/i, confidence: 'Medium' },
  { category: 'Framework', name: 'Vue.js', bodyRx: /data-v-|__vue__|vue\.min\.js/i, confidence: 'Medium' },
  { category: 'Framework', name: 'Angular', bodyRx: /ng-version=|angular\.js|ng-app/i, confidence: 'Medium' },
  { category: 'Framework', name: 'Svelte', bodyRx: /svelte-[a-z0-9]+|__svelte/i, confidence: 'Medium' },
  // Analytics
  { category: 'Analytics', name: 'Google Analytics', bodyRx: /google-analytics\.com\/analytics\.js|gtag\('config'/i, confidence: 'High' },
  { category: 'Analytics', name: 'Google Tag Manager', bodyRx: /googletagmanager\.com\/gtm\.js/i, confidence: 'High' },
  { category: 'Analytics', name: 'Hotjar', bodyRx: /hotjar\.com\/c\/hotjar-/i, confidence: 'High' },
  { category: 'Analytics', name: 'Matomo', bodyRx: /matomo\.js|piwik\.js/i, confidence: 'High' },
  // CDN (via header)
  { category: 'CDN', name: 'Cloudflare', headerKey: 'cf-ray', confidence: 'High' },
  { category: 'CDN', name: 'AWS CloudFront', headerKey: 'x-amz-cf-id', confidence: 'High' },
  { category: 'CDN', name: 'Fastly', headerKey: 'x-fastly-request-id', confidence: 'High' },
  { category: 'CDN', name: 'Varnish', headerKey: 'via', headerRx: /varnish/i, confidence: 'High' },
  // Security
  { category: 'Security', name: 'reCAPTCHA', bodyRx: /google\.com\/recaptcha|grecaptcha/i, confidence: 'High' },
  { category: 'Security', name: 'hCaptcha', bodyRx: /hcaptcha\.com/i, confidence: 'High' },
]

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url')
  if (!urlParam) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let target = urlParam
  if (!target.startsWith('http')) target = `https://${target}`

  try {
    const res = await fetch(target, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CyberOps-Scanner/1.0)' },
    })
    const h: Record<string, string> = {}
    res.headers.forEach((v, k) => { h[k.toLowerCase()] = v })

    let body = ''
    const ct = h['content-type'] ?? ''
    if (ct.includes('html') || ct.includes('text') || ct === '') {
      try { body = (await res.text()).slice(0, 60000) } catch {}
    }

    const detections: Detection[] = []
    for (const rule of RULES) {
      let match = false
      let version: string | undefined

      if (rule.headerKey && h[rule.headerKey] !== undefined) {
        const hv = h[rule.headerKey]
        if (!rule.headerRx || rule.headerRx.test(hv)) {
          match = true
          if (rule.versionRx) version = hv.match(rule.versionRx)?.[1]
        }
      }
      if (!match && rule.bodyRx && body && rule.bodyRx.test(body)) {
        match = true
      }

      if (match && !detections.some(d => d.name === rule.name)) {
        detections.push({ category: rule.category, name: rule.name, version, confidence: rule.confidence })
      }
    }

    return NextResponse.json({
      url: target,
      finalUrl: res.url,
      status: res.status,
      detections,
      headers: {
        server: h['server'],
        'x-powered-by': h['x-powered-by'],
        'x-generator': h['x-generator'],
        'cf-ray': h['cf-ray'],
        'content-type': h['content-type'],
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Fetch failed' }, { status: 500 })
  }
}
