'use client'

import { SignUp } from '@clerk/nextjs'
import { Shield } from 'lucide-react'

const appearance = {
  variables: {
    colorBackground:      '#0d1117',
    colorInputBackground: '#161b22',
    colorInputText:       '#e6edf3',
    colorText:            '#e6edf3',
    colorTextSecondary:   '#8b949e',
    colorPrimary:         '#00f5d4',
    colorDanger:          '#f85149',
    colorSuccess:         '#3fb950',
    borderRadius:         '4px',
    fontFamily:           'ui-monospace, SFMono-Regular, monospace',
    fontSize:             '13px',
  },
  elements: {
    rootBox:                   'w-full',
    card:                      'bg-[#161b22] border border-[#21262d] shadow-2xl shadow-black/60 rounded-lg w-full',
    headerTitle:               'text-[#e6edf3] font-mono tracking-[0.2em] uppercase text-sm font-semibold',
    headerSubtitle:            'text-[#8b949e] font-mono text-[11px] tracking-wider',
    socialButtonsBlockButton:  '!hidden',
    socialButtonsBlock:        '!hidden',
    dividerRow:                '!hidden',
    formFieldLabel:            'text-[#00f5d4] font-mono text-[10px] tracking-[0.2em] uppercase font-medium',
    formFieldInput:            'bg-[#0d1117] border border-[#30363d] text-[#e6edf3] font-mono text-xs rounded px-3 py-2.5 focus:border-[#00f5d4]/60 focus:outline-none caret-[#00f5d4]',
    formButtonPrimary:         'bg-[#00f5d4]/10 hover:bg-[#00f5d4]/20 border border-[#00f5d4]/30 hover:border-[#00f5d4]/60 text-[#00f5d4] font-mono text-[11px] tracking-[0.2em] uppercase shadow-none rounded',
    footerActionLink:          'text-[#00f5d4] font-mono text-[11px]',
    footerActionText:          'text-[#8b949e] font-mono text-[11px]',
    footer:                    'bg-transparent border-t border-[#21262d]',
    otpCodeFieldInput:         'bg-[#0d1117] border border-[#30363d] text-[#e6edf3] font-mono text-lg font-bold text-center rounded caret-[#00f5d4] focus:border-[#00f5d4]/60',
    otpCodeField:              'gap-2',
    alertText:                 'text-[#f85149] font-mono text-[10px]',
    alert:                     'bg-[#f85149]/10 border border-[#f85149]/30 rounded',
    footerPages:               '!hidden',
  },
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#03060a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(#00f5d4 1px, transparent 1px), linear-gradient(90deg, #00f5d4 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00f5d4]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        <div className="flex flex-col items-center mb-8 animate-auth-logo">
          <div className="relative mb-5">
            <div className="absolute inset-0 bg-[#00f5d4]/20 rounded-lg blur-xl" />
            <div className="relative w-16 h-16 rounded-lg border border-[#00f5d4]/30 flex items-center justify-center bg-[#00f5d4]/5">
              <Shield size={28} className="text-[#00f5d4]" />
            </div>
          </div>
          <p className="font-mono text-xl font-bold tracking-[0.35em] text-[#e6edf3] uppercase">CyberOps</p>
          <p className="font-mono text-[10px] text-[#8b949e] tracking-[0.3em] uppercase mt-1.5">Email Verification</p>
        </div>

        <div className="w-full animate-auth-card">
          <SignUp appearance={appearance} />
        </div>
      </div>
    </div>
  )
}
