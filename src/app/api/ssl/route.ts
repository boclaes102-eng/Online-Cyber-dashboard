import { NextRequest, NextResponse } from 'next/server'
import tls from 'tls'
import type { SslInspectResult } from '@/lib/types'

export const runtime = 'nodejs'

function checkSsl(hostname: string, port: number): Promise<SslInspectResult> {
  return new Promise(resolve => {
    const socket = tls.connect(
      { host: hostname, port, servername: hostname, rejectUnauthorized: false },
      () => {
        const cert     = socket.getPeerCertificate(false)
        const protocol = socket.getProtocol() ?? 'unknown'
        const cipher   = socket.getCipher()?.name

        if (!cert || !cert.valid_to) {
          socket.destroy()
          return resolve({ host: hostname, port, valid: false, authorized: false,
            daysLeft: 0, expiresAt: '', issuedAt: '', issuer: '', subject: '', san: [], protocol, error: 'No certificate' })
        }

        const validTo = new Date(cert.valid_to)
        const now     = new Date()
        const daysLeft = Math.floor((validTo.getTime() - now.getTime()) / 86_400_000)

        const san = cert.subjectaltname
          ? cert.subjectaltname.split(', ')
              .map(s => s.replace(/^DNS:|^IP Address:/i, '').trim())
              .filter(Boolean)
          : []

        const issuerO    = cert.issuer?.O
        const issuerCN   = cert.issuer?.CN
        const issuerStr  = (Array.isArray(issuerO) ? issuerO[0] : issuerO)
          ?? (Array.isArray(issuerCN) ? issuerCN[0] : issuerCN)
          ?? 'Unknown'
        const subjectCN  = cert.subject?.CN
        const subjectStr = (Array.isArray(subjectCN) ? subjectCN[0] : subjectCN) ?? hostname

        socket.destroy()
        resolve({
          host:           hostname,
          port,
          valid:          daysLeft > 0,
          authorized:     socket.authorized,
          daysLeft,
          expiresAt:      cert.valid_to,
          issuedAt:       cert.valid_from,
          issuer:         issuerStr,
          subject:        subjectStr,
          san,
          protocol,
          cipher,
          keyBits:        (cert as { bits?: number }).bits,
          serialNumber:   cert.serialNumber,
          fingerprint256: cert.fingerprint256,
        })
      }
    )

    socket.setTimeout(10_000, () => {
      socket.destroy()
      resolve({ host: hostname, port, valid: false, authorized: false,
        daysLeft: 0, expiresAt: '', issuedAt: '', issuer: '', subject: '', san: [], protocol: '', error: 'Connection timed out' })
    })

    socket.on('error', err => {
      resolve({ host: hostname, port, valid: false, authorized: false,
        daysLeft: 0, expiresAt: '', issuedAt: '', issuer: '', subject: '', san: [], protocol: '', error: err.message })
    })
  })
}

export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get('host')?.trim().toLowerCase()
  const port = parseInt(req.nextUrl.searchParams.get('port') ?? '443', 10)

  if (!host) return NextResponse.json({ error: 'host parameter required' }, { status: 400 })
  if (isNaN(port) || port < 1 || port > 65535) return NextResponse.json({ error: 'Invalid port' }, { status: 400 })

  const result = await checkSsl(host, port)
  return NextResponse.json<SslInspectResult>(result)
}
