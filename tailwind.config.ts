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
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink':       'blink 1s step-end infinite',
        'scanline':    'scanline 4s linear infinite',
        'fade-in':     'fadeIn 0.3s ease-in',
        'slide-up':    'slideUp 0.3s ease-out',
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
