'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield, Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const from   = params.get('from') ?? '/'

  const [key,     setKey]     = useState('')
  const [show,    setShow]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [dots,    setDots]    = useState('')

  // Animated dots for the status line
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600)
    return () => clearInterval(id)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!key.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      })

      if (res.ok) {
        router.push(from)
        router.refresh()
      } else {
        setError('ACCESS DENIED — Invalid key')
        setKey('')
      }
    } catch {
      setError('CONNECTION ERROR — Try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cyber-bg flex flex-col items-center justify-center p-4">
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#00f5d4 1px, transparent 1px), linear-gradient(90deg, #00f5d4 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded border border-cyber-cyan/30 flex items-center justify-center bg-cyber-cyan/5 mb-4">
            <Shield size={26} className="text-cyber-cyan" />
          </div>
          <p className="font-mono text-lg font-bold tracking-[0.3em] text-cyber-text-hi uppercase">
            CyberOps
          </p>
          <p className="font-mono text-[10px] text-cyber-muted tracking-[0.25em] uppercase mt-1">
            Operations Center
          </p>
        </div>

        {/* Card */}
        <div className="bg-cyber-surface border border-cyber-border rounded-lg p-6">
          <p className="font-mono text-[10px] text-cyber-muted tracking-[0.2em] uppercase mb-4">
            Authentication Required
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-cyber-cyan tracking-[0.2em] uppercase mb-2">
                Access Key
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  placeholder="Enter your access key"
                  autoFocus
                  className="w-full bg-cyber-bg border border-cyber-border rounded px-3 py-2.5 pr-10
                             font-mono text-xs text-cyber-text-hi placeholder-cyber-muted
                             focus:outline-none focus:border-cyber-cyan/60 focus:ring-1 focus:ring-cyber-cyan/20
                             transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-cyber-text transition-colors"
                >
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded">
                <AlertTriangle size={12} className="text-red-400 flex-none" />
                <span className="font-mono text-[10px] text-red-400 tracking-wide">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5
                         bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30
                         hover:border-cyber-cyan/60 rounded font-mono text-xs text-cyber-cyan
                         tracking-[0.2em] uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Authenticating
                </>
              ) : (
                'Authenticate'
              )}
            </button>
          </form>
        </div>

        {/* Status line */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
          <span className="font-mono text-[9px] text-cyber-muted tracking-widest uppercase">
            System Online{dots}
          </span>
        </div>
      </div>
    </div>
  )
}
