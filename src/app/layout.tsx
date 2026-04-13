import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import LayoutShell from '@/components/layout/LayoutShell'

export const metadata: Metadata = {
  title: 'CyberOps Dashboard',
  description: 'Personal cybersecurity operations platform — OSINT, threat intelligence, and analysis tools.',
  keywords: ['cybersecurity', 'OSINT', 'threat intelligence', 'security tools', 'CTF'],
  themeColor: '#03060a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className="bg-cyber-bg text-cyber-text overflow-hidden">
          <LayoutShell>{children}</LayoutShell>
        </body>
      </html>
    </ClerkProvider>
  )
}
