import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fondos
        'bg-base':     '#0A0A0F',
        'bg-surface':  '#111118',
        'bg-elevated': '#1A1A26',
        // Acento (dinámico vía CSS custom property — cambia según carrera activa)
        // Usa la sintaxis de Tailwind 3 para opacity-aware utilities:
        //   bg-accent/10, text-accent, border-accent/30, etc.
        'accent':      'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-glow': 'rgb(var(--accent-rgb) / 0.2)',
        // Estados de materia
        'success':     '#22C55E',
        'warning':     '#F59E0B',
        'muted':       '#3A3A4A',
        // Texto
        'text-primary':   '#F0F0FF',
        'text-secondary': '#8080A0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
