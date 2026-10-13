import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        chronos: {
          bg:      '#09090f',
          surface: '#111118',
          card:    '#16161f',
          border:  '#1e1e2e',
          gold:    '#f59e0b',
          'gold-light': '#fcd34d',
          'gold-dim':   '#92400e',
          muted:   '#6b7280',
          text:    '#e5e7eb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'serif'],
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease-out',
        'slide-up':      'slideUp 0.4s ease-out',
        'slide-down':    'slideDown 0.35s ease-out',
        'pulse-gold':    'pulseGold 2s ease-in-out infinite',
        'pop':           'pop 0.45s cubic-bezier(0.2, 1.4, 0.4, 1) both',
        'float-up':      'floatUp 1.1s ease-out both',
        'confetti':      'confetti 1.8s ease-in forwards',
        'flame':         'flame 1.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGold: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        pop:       { from: { opacity: '0', transform: 'scale(0.6)' }, to: { opacity: '1', transform: 'scale(1)' } },
        floatUp:   { '0%': { opacity: '0', transform: 'translateY(6px)' }, '20%': { opacity: '1' }, '100%': { opacity: '0', transform: 'translateY(-28px)' } },
        confetti:  { '0%': { opacity: '1', transform: 'translateY(-10px) rotate(0deg)' }, '100%': { opacity: '0', transform: 'translateY(var(--fall, 260px)) rotate(var(--spin, 360deg))' } },
        flame:     { '0%, 100%': { transform: 'scale(1) rotate(-3deg)' }, '50%': { transform: 'scale(1.15) rotate(3deg)' } },
      },
    },
  },
  plugins: [],
};

export default config;
