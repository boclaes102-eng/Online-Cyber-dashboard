import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export const metadata: Metadata = {
  title: 'CyberOps Dashboard',
  description: 'Personal cybersecurity operations platform — OSINT, threat intelligence, and analysis tools.',
  keywords: ['cybersecurity', 'OSINT', 'threat intelligence', 'security tools', 'CTF'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-cyber-bg text-cyber-text overflow-hidden">
        <div className="flex h-screen w-screen animate-fade-in">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-cyber-bg p-6">
              <div className="max-w-7xl mx-auto animate-slide-up">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
