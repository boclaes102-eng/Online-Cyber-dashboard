'use client'

import { useSignUp } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Eye, EyeOff, AlertTriangle, Loader2,
  Mail, Lock, CheckCircle2, KeyRound,
} from 'lucide-react'
import Link from 'next/link'

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()

  const [step,     setStep]     = useState<'form' | 'verify'>('form')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [code,     setCode]     = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [dots,     setDots]     = useState('')

  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600)
    return () => clearInterval(id)
  }, [])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoaded) return
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')

    try {
      await signUp.create({ emailAddress: email.trim(), password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setStep('verify')
    } catch (err: unknown) {
      const clerkErr = (err as { errors?: { longMessage?: string; message?: string }[] })?.errors?.[0]
      setError(clerkErr?.longMessage ?? clerkErr?.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoaded || !code.trim()) return
    setLoading(true)
    setError('')

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.push('/')
        router.refresh()
      }
    } catch (err: unknown) {
      const clerkErr = (err as { errors?: { longMessage?: string; message?: string }[] })?.errors?.[0]
      setError(clerkErr?.longMessage ?? clerkErr?.message ?? 'Verification failed')
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

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-5">
          <div className={`flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded border font-mono text-[10px] tracking-widest uppercase
            ${step === 'form' ? 'border-cyber-cyan/40 bg-cyber-cyan/5 text-cyber-cyan' : 'border-cyber-border bg-transparent text-cyber-muted'}`}>
            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[8px]">
              {step === 'verify' ? <CheckCircle2 size={10} /> : '1'}
            </span>
            Register
          </div>
          <div className="w-6 h-px bg-cyber-border" />
          <div className={`flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded border font-mono text-[10px] tracking-widest uppercase
            ${step === 'verify' ? 'border-cyber-cyan/40 bg-cyber-cyan/5 text-cyber-cyan' : 'border-cyber-border bg-transparent text-cyber-muted'}`}>
            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[8px]">2</span>
            Verify
          </div>
        </div>

        {/* Card */}
        <div className="bg-cyber-surface border border-cyber-border rounded-lg p-6">

          {step === 'form' ? (
            <>
              <p className="font-mono text-[10px] text-cyber-muted tracking-[0.2em] uppercase mb-5">
                Create Account
              </p>
              <form onSubmit={handleRegister} className="space-y-4">
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
                      placeholder="min. 8 characters"
                      autoComplete="new-password"
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

                {/* Confirm */}
                <div>
                  <label className="block font-mono text-[10px] text-cyber-cyan tracking-[0.2em] uppercase mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
                    <input
                      type={show ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      className="w-full bg-cyber-bg border border-cyber-border rounded pl-9 pr-3 py-2.5
                                 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted
                                 focus:outline-none focus:border-cyber-cyan/60 focus:ring-1 focus:ring-cyber-cyan/20
                                 transition-colors"
                    />
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
                  disabled={loading || !email.trim() || !password || !confirm}
                  className="w-full flex items-center justify-center gap-2 py-2.5
                             bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30
                             hover:border-cyber-cyan/60 rounded font-mono text-xs text-cyber-cyan
                             tracking-[0.2em] uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Creating Account
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="font-mono text-[10px] text-cyber-muted tracking-[0.2em] uppercase mb-2">
                Verify Email
              </p>
              <p className="font-mono text-[10px] text-cyber-text mb-5">
                A 6-digit code was sent to{' '}
                <span className="text-cyber-cyan">{email}</span>
              </p>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-cyber-cyan tracking-[0.2em] uppercase mb-2">
                    Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      autoFocus
                      maxLength={6}
                      className="w-full bg-cyber-bg border border-cyber-border rounded pl-9 pr-3 py-2.5
                                 font-mono text-sm text-cyber-text-hi placeholder-cyber-muted tracking-[0.4em]
                                 focus:outline-none focus:border-cyber-cyan/60 focus:ring-1 focus:ring-cyber-cyan/20
                                 transition-colors"
                    />
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
                  disabled={loading || code.length < 6}
                  className="w-full flex items-center justify-center gap-2 py-2.5
                             bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30
                             hover:border-cyber-cyan/60 rounded font-mono text-xs text-cyber-cyan
                             tracking-[0.2em] uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Verifying
                    </>
                  ) : (
                    'Verify & Access'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('form'); setError(''); setCode('') }}
                  className="w-full font-mono text-[10px] text-cyber-muted hover:text-cyber-text tracking-wider uppercase transition-colors"
                >
                  ← Back
                </button>
              </form>
            </>
          )}
        </div>

        {/* Sign-in link */}
        <p className="text-center font-mono text-[10px] text-cyber-muted mt-4 tracking-wider">
          Already have access?{' '}
          <Link href="/sign-in" className="text-cyber-cyan hover:underline">
            Sign in
          </Link>
        </p>

        {/* Status */}
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
