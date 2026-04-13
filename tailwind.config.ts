import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg:           '#03060a',
          surface:      '#070d18',
          card:         '#0a1628',
          border:       '#1a2744',
          'border-hi':  '#2a4070',
          cyan:         '#00d4ff',
          'cyan-dim':   '#007a99',
          green:        '#00ff88',
          'green-dim':  '#00aa5a',
          red:          '#ff3366',
          'red-dim':    '#99001f',
          orange:       '#ffaa00',
          purple:       '#bd5eff',
          text:         '#a8c8e8',
          'text-hi':    '#d4e8ff',
          muted:        '#4a6080',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink':         'blink 1s step-end infinite',
        'scanline':      'scanline 4s linear infinite',
        'fade-in':       'fadeIn 0.4s ease-in both',
        'slide-up':      'slideUp 0.3s ease-out',
        // Auth page transitions
        'auth-card':     'authCard 0.65s cubic-bezier(0.22, 1, 0.36, 1) both',
        'auth-logo':     'authLogo 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'boot-scan':     'bootScan 1.1s cubic-bezier(0.4, 0, 0.2, 1) both',
        // Logout glitch
        'glitch-out':    'glitchOut 0.55s ease-in-out both',
        'power-off':     'powerOff 0.5s ease-in both',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        scanline: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        // Auth card slides in with brightness flicker (CRT boot effect)
        authCard: {
          '0%':   { opacity: '0', transform: 'translateY(14px) scale(0.96)', filter: 'brightness(4) saturate(0)' },
          '20%':  { opacity: '0.6', filter: 'brightness(2) saturate(0)', transform: 'translateY(6px) scale(0.98)' },
          '50%':  { opacity: '0.9', filter: 'brightness(1.3) saturate(0.4)', transform: 'translateY(2px)' },
          '75%':  { opacity: '1', filter: 'brightness(1.05) saturate(1)', transform: 'translateY(-1px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'brightness(1)' },
        },
        // Logo pulses in from blur
        authLogo: {
          '0%':   { opacity: '0', transform: 'scale(0.72)', filter: 'blur(8px)' },
          '50%':  { opacity: '0.85', filter: 'blur(1px)', transform: 'scale(1.06)' },
          '75%':  { opacity: '1', filter: 'blur(0)', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)', filter: 'blur(0)' },
        },
        // Single cyan scan line sweeps top → bottom on page load
        bootScan: {
          '0%':   { transform: 'translateY(-2px)', opacity: '0' },
          '5%':   { opacity: '1' },
          '90%':  { opacity: '0.8' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
        // Glitch-out: brief chromatic aberration + jitter before logout
        glitchOut: {
          '0%':   { opacity: '1', transform: 'none', filter: 'none' },
          '12%':  { opacity: '0.85', transform: 'translate(-4px, 0) skewX(-2deg)', filter: 'hue-rotate(90deg) brightness(1.8)' },
          '24%':  { opacity: '1',    transform: 'translate(4px, 1px)',             filter: 'none' },
          '36%':  { opacity: '0.9',  transform: 'translate(-3px, -1px) skewX(1deg)', filter: 'hue-rotate(180deg) brightness(2)' },
          '48%':  { opacity: '1',    transform: 'translate(5px, 0)',               filter: 'brightness(1.5)' },
          '65%':  { opacity: '0.8',  transform: 'translate(-5px, 2px) skewX(-1deg)', filter: 'hue-rotate(270deg) brightness(2.5)' },
          '80%':  { opacity: '1',    transform: 'translate(2px, -2px)',            filter: 'none' },
          '100%': { opacity: '0',    transform: 'translate(0) scaleY(0.002)',      filter: 'brightness(6)' },
        },
        // Screen power-off collapse
        powerOff: {
          '0%':   { opacity: '1', transform: 'scaleY(1)', filter: 'brightness(1)' },
          '35%':  { transform: 'scaleY(0.003) scaleX(1.02)', filter: 'brightness(5)' },
          '55%':  { transform: 'scaleY(0.003) scaleX(0.4)',  filter: 'brightness(8)', opacity: '0.7' },
          '100%': { transform: 'scaleY(0) scaleX(0)',         opacity: '0',           filter: 'brightness(0)' },
        },
      },
      boxShadow: {
        'cyan':   '0 0 20px rgba(0,212,255,0.15), inset 0 0 20px rgba(0,212,255,0.03)',
        'green':  '0 0 20px rgba(0,255,136,0.15), inset 0 0 20px rgba(0,255,136,0.03)',
        'red':    '0 0 20px rgba(255,51,102,0.15), inset 0 0 20px rgba(255,51,102,0.03)',
        'orange': '0 0 20px rgba(255,170,0,0.15)',
      },
    },
  },
  plugins: [],
}

export default config
