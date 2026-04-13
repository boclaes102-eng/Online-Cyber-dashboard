import { NextRequest, NextResponse } from 'next/server'
import net from 'net'
import type { PortScanResult, PortService } from '@/lib/types'

export const runtime = 'nodejs'

const PORT_SERVICES: Record<number, string> = {
  21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
  80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 445: 'SMB',
  587: 'SMTP/TLS', 993: 'IMAPS', 995: 'POP3S', 1433: 'MSSQL',
  1521: 'Oracle', 3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL',
  5900: 'VNC', 6379: 'Redis', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt',
  9200: 'Elasticsearch', 9300: 'Elasticsearch', 27017: 'MongoDB',
  11211: 'Memcached', 2181: 'ZooKeeper', 5601: 'Kibana',
}

const COMMON_PORTS = Object.keys(PORT_SERVICES).map(Number)

function tcpCheck(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new net.Socket()
    let done = false

    const finish = (open: boolean) => {
      if (done) return
      done = true
      socket.destroy()
      resolve(open)
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error',   () => finish(false))
    socket.connect(port, host)
  })
}

async function shodanLookup(ip: string, apiKey: string): Promise<PortScanResult> {
  const res = await fetch(
    `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${apiKey}`,
    { signal: AbortSignal.timeout(10_000) }
  )
  if (!res.ok) {
    if (res.status === 404) return { ip, ports: [], services: [], mode: 'shodan', error: 'Host not found in Shodan' }
    if (res.status === 401) return { ip, ports: [], services: [], mode: 'shodan', error: 'Invalid Shodan API key' }
    return { ip, ports: [], services: [], mode: 'shodan', error: `Shodan error ${res.status}` }
  }
  const data = await res.json()
  const ports: number[] = data.ports ?? []
  const services: PortService[] = (data.data ?? []).map((d: {
    port: number; transport: string; product?: string; version?: string; cpe?: string[]
  }) => ({
    port:     d.port,
    protocol: d.transport ?? 'tcp',
    service:  PORT_SERVICES[d.port],
    product:  d.product,
    version:  d.version,
    cpe:      d.cpe?.[0],
  }))
  const vulns: string[] = Object.keys(data.vulns ?? {})
  return {
    ip,
    hostnames: data.hostnames,
    os:        data.os,
    org:       data.org,
    country:   data.country_name,
    ports,
    services,
    vulns: vulns.length ? vulns : undefined,
    lastUpdate: data.last_update,
    mode: 'shodan',
  }
}

async function tcpScan(host: string): Promise<PortScanResult> {
  const results = await Promise.all(
    COMMON_PORTS.map(async port => ({ port, open: await tcpCheck(host, port) }))
  )
  const openPorts = results.filter(r => r.open).map(r => r.port)
  const services: PortService[] = openPorts.map(p => ({
    port:     p,
    protocol: 'tcp',
    service:  PORT_SERVICES[p],
  }))
  return { ip: host, ports: openPorts, services, mode: 'tcp' }
}

// Validate that the input looks like a public IP (not localhost / RFC-1918)
function isRoutableIp(ip: string): boolean {
  if (ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') return false
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4) return true  // Allow hostnames through
  if (parts[0] === 10) return false
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false
  if (parts[0] === 192 && parts[1] === 168) return false
  return true
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('ip')?.trim()
  if (!target) return NextResponse.json({ error: 'ip parameter required' }, { status: 400 })

  if (!isRoutableIp(target)) {
    return NextResponse.json<PortScanResult>({
      ip: target, ports: [], services: [], mode: 'tcp',
      error: 'Private/loopback addresses are not allowed',
    })
  }

  const shodanKey = process.env.SHODAN_API_KEY
  if (shodanKey) {
    const result = await shodanLookup(target, shodanKey)
    return NextResponse.json<PortScanResult>(result)
  }

  // Fallback: live TCP scan of common ports
  const result = await tcpScan(target)
  return NextResponse.json<PortScanResult>(result)
}
