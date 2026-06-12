import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Color Palette ──────────────────────────────────────────────────
      colors: {
        // Admin (minimal dark)
        admin: {
          bg: '#0D0D14',
          surface: '#16161F',
          elevated: '#1E1E2A',
          border: '#2A2A3A',
          text: '#E4E4EF',
          muted: '#7A7A9A',
        },

        // Invite page (vivid, festive)
        brand: {
          purple: '#6B2FE0',
          violet: '#9B59F5',
          champagne: '#F5D88A',
          pearl: '#E8E4FF',
          midnight: '#080812',
          deep: '#0F0F20',
        },

        // Semantic
        success: '#4ADE80',
        warning: '#FBBF24',
        danger: '#F87171',
        info: '#60A5FA',
      },

      // ── Typography ────────────────────────────────────────────────────
      fontFamily: {
        display: ['var(--font-unbounded)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },

      // ── Animations ────────────────────────────────────────────────────
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'fade-up': 'fadeUp 0.6s ease forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      // ── Blur ──────────────────────────────────────────────────────────
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },

      // ── Spacing ───────────────────────────────────────────────────────
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // ── Border radius ─────────────────────────────────────────────────
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      // ── Z-index ───────────────────────────────────────────────────────
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
      },
    },
  },
  plugins: [],
}

export default config
