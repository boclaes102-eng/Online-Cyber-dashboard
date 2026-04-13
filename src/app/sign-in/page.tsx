'use client'

import { SignIn } from '@clerk/nextjs'
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
    spacingUnit:          '16px',
  },
  elements: {
    rootBox:                  'w-full',
    card:                     'bg-[#161b22] border border-[#21262d] shadow-2xl shadow-black/60 rounded-lg w-full',
    cardBox:                  'w-full',
    header:                   'pb-2',
    headerTitle:              'text-[#e6edf3] font-mono tracking-[0.2em] uppercase text-sm font-semibold',
    headerSubtitle:           'text-[#8b949e] font-mono text-[11px] tracking-wider',
    socialButtonsBlockButton: '!hidden',
    socialButtonsBlock:       '!hidden',
    dividerRow:               '!hidden',
    formFieldLabel:           'text-[#00f5d4] font-mono text-[10px] tracking-[0.2em] uppercase font-medium',
    formFieldInput:           'bg-[#0d1117] border border-[#30363d] text-[#e6edf3] font-mono text-xs rounded px-3 py-2.5 focus:border-[#00f5d4]/60 focus:ring-1 focus:ring-[#00f5d4]/20 focus:outline-none placeholder:text-[#8b949e] transition-colors caret-[#00f5d4]',
    formFieldInputShowPasswordButton: 'text-[#8b949e] hover:text-[#e6edf3]',
    formButtonPrimary:        'bg-[#00f5d4]/10 hover:bg-[#00f5d4]/20 active:bg-[#00f5d4]/30 border border-[#00f5d4]/30 hover:border-[#00f5d4]/60 text-[#00f5d4] font-mono text-[11px] tracking-[0.2em] uppercase shadow-none transition-all rounded',
    formButtonReset:          'text-[#8b949e] hover:text-[#00f5d4] font-mono text-[10px] tracking-wider',
    footerActionLink:         'text-[#00f5d4] hover:text-[#00f5d4]/80 font-mono text-[11px]',
    footerActionText:         'text-[#8b949e] font-mono text-[11px]',
    footer:                   'bg-transparent border-t border-[#21262d]',
    identityPreviewText:      'text-[#e6edf3] font-mono text-xs',
    identityPreviewEditButton: 'text-[#00f5d4] font-mono text-[10px]',
    formFieldSuccessText:     'text-[#3fb950] font-mono text-[10px]',
    formFieldErrorText:       'text-[#f85149] font-mono text-[10px]',
    formFieldWarningText:     'text-[#d29922] font-mono text-[10px]',
    alertText:                'text-[#f85149] font-mono text-[10px]',
    alert:                    'bg-[#f85149]/10 border border-[#f85149]/30 rounded',
    // OTP / verification code inputs
    otpCodeFieldInput:        'bg-[#0d1117] border border-[#30363d] text-[#e6edf3] font-mono text-lg font-bold text-center rounded caret-[#00f5d4] focus:border-[#00f5d4]/60 focus:ring-1 focus:ring-[#00f5d4]/20',
    otpCodeField:             'gap-2',
  },
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#03060a] flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Cyber grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(#00f5d4 1px, transparent 1px), linear-gradient(90deg, #00f5d4 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow orbs */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00f5d4]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 left-1/3 w-64 h-64 bg-[#00f5d4]/3 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="absolute inset-0 bg-[#00f5d4]/20 rounded-lg blur-xl" />
            <div className="relative w-16 h-16 rounded-lg border border-[#00f5d4]/30 flex items-center justify-center bg-[#00f5d4]/5 backdrop-blur-sm">
              <Shield size={28} className="text-[#00f5d4]" />
            </div>
          </div>
          <p className="font-mono text-xl font-bold tracking-[0.35em] text-[#e6edf3] uppercase">
            CyberOps
          </p>
          <p className="font-mono text-[10px] text-[#8b949e] tracking-[0.3em] uppercase mt-1.5">
            Operations Center
          </p>

          {/* Scan line decoration */}
          <div className="flex items-center gap-3 mt-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#00f5d4]/40" />
            <div className="w-1 h-1 rounded-full bg-[#00f5d4]/60" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#00f5d4]/40" />
          </div>
        </div>

        {/* Clerk sign-in component */}
        <div className="w-full">
          <SignIn appearance={appearance} />
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mt-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
          <span className="font-mono text-[9px] text-[#8b949e] tracking-[0.25em] uppercase">
            System Online
          </span>
          <span className="font-mono text-[9px] text-[#30363d]">—</span>
          <span className="font-mono text-[9px] text-[#8b949e] tracking-[0.15em] uppercase">
            Secure Connection
          </span>
        </div>
      </div>
    </div>
  )
}
