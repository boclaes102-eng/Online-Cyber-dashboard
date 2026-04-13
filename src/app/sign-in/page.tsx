'use client'

import { SignIn } from '@clerk/nextjs'
import { Shield } from 'lucide-react'

const appearance = {
  variables: {
    colorBackground:      '#0d1117',
    colorInputBackground: '#0d1117',
    colorText:            '#c9d1d9',
    colorTextSecondary:   '#8b949e',
    colorPrimary:         '#00f5d4',
    colorDanger:          '#f85149',
    borderRadius:         '4px',
    fontFamily:           'monospace',
    fontSize:             '12px',
  },
  elements: {
    card:                 'bg-[#161b22] border border-[#21262d] shadow-none rounded-lg',
    headerTitle:          'text-[#e6edf3] font-mono tracking-widest uppercase text-sm',
    headerSubtitle:       'text-[#8b949e] font-mono text-[10px] tracking-wider',
    formFieldLabel:       'text-[#00f5d4] font-mono text-[10px] tracking-[0.2em] uppercase',
    formFieldInput:       'bg-[#0d1117] border-[#30363d] text-[#e6edf3] font-mono text-xs rounded focus:border-[#00f5d4]/60 focus:ring-[#00f5d4]/20',
    formButtonPrimary:    'bg-[#00f5d4]/10 hover:bg-[#00f5d4]/20 border border-[#00f5d4]/30 hover:border-[#00f5d4]/60 text-[#00f5d4] font-mono text-[10px] tracking-[0.2em] uppercase shadow-none',
    footerActionLink:     'text-[#00f5d4] font-mono',
    footerActionText:     'text-[#8b949e] font-mono text-[10px]',
    identityPreviewText:  'text-[#c9d1d9] font-mono text-xs',
    dividerText:          'text-[#8b949e] font-mono text-[10px]',
    dividerLine:          'bg-[#21262d]',
    formFieldSuccessText: 'text-[#3fb950] font-mono text-[10px]',
    formFieldErrorText:   'text-[#f85149] font-mono text-[10px]',
    alertText:            'text-[#f85149] font-mono text-[10px]',
    socialButtonsBlockButton: 'hidden',
    socialButtonsBlockButtonText: 'hidden',
  },
}

export default function SignInPage() {
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

      <div className="w-full max-w-sm relative flex flex-col items-center">
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

        <SignIn appearance={appearance} />

        {/* Status line */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
          <span className="font-mono text-[9px] text-cyber-muted tracking-widest uppercase">
            System Online
          </span>
        </div>
      </div>
    </div>
  )
}
