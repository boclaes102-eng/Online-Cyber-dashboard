'use client'

import { useSignIn } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, AlertTriangle, Loader2, Mail, Lock } from 'lucide-react'
import Link from 'next/link'

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [dots,     setDots]     = useState('')

  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600)
    return () => clearInterval(id)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoaded || !email.trim() || !password) return
    setLoading(true)
    setError('')

    try {
      const result = await signIn.create({ identifier: email.trim(), password })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.push('/')
        router.refresh()
      }
    } catch (err: unknown) {
      const clerkErr = (err as { errors?: { longMessage?: string; message?: string }[] })?.errors?.[0]
      setError(clerkErr?.longMessage ?? clerkErr?.message ?? 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cyber-bg flex flex-col items-center justify-center p-4">
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#00f5d4 1px, transparent 1px), linear-gradient(90deg, #00f5d4 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
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
          <p className="font-mono text-[10px] text-cyber-muted tracking-[0.2em] uppercase mb-5">
            Authentication Required
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block font-mono text-[10px] text-cyber-cyan tracking-[0.2em] uppercase mb-2">
                Email
              </label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="operator@domain.com"
                  autoFocus
                  autoComplete="email"
                  className="w-full bg-cyber-bg border border-cyber-border rounded pl-9 pr-3 py-2.5
                             font-mono text-xs text-cyber-text-hi placeholder-cyber-muted
                             focus:outline-none focus:border-cyber-cyan/60 focus:ring-1 focus:ring-cyber-cyan/20
                             transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-mono text-[10px] text-cyber-cyan tracking-[0.2em] uppercase mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full bg-cyber-bg border border-cyber-border rounded pl-9 pr-10 py-2.5
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

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded">
                <AlertTriangle size={12} className="text-red-400 flex-none" />
                <span className="font-mono text-[10px] text-red-400 tracking-wide">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
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

        {/* Register link */}
        <p className="text-center font-mono text-[10px] text-cyber-muted mt-4 tracking-wider">
          No account?{' '}
          <Link href="/sign-up" className="text-cyber-cyan hover:underline">
            Request access
          </Link>
        </p>

        {/* Status line */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
          <span className="font-mono text-[9px] text-cyber-muted tracking-widest uppercase">
            System Online{dots}
          </span>
        </div>
      </div>
    </div>
  )
}
