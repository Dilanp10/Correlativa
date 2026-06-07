import { create } from 'zustand'
import { DEFAULT_ACCENT, hexToRgb } from '@/shared/constants/careerThemes'

// Store del tema (color de acento) de la carrera activa.
// Spec: specs/009-competitive-ui-redesign/data-model.md §2
//
// El color se aplica al DOM como CSS custom properties (--accent y
// --accent-rgb). Tailwind las consume vía rgb(var(--accent-rgb) / <alpha>)
// para que cualquier `text-accent`, `bg-accent`, `border-accent` herede.
//
// El store es de cliente (no persistido en DB). Cada vez que cambia la
// carrera activa, el career store llama a setAccentColor + applyTheme.

interface CareerThemeStore {
  /** Hex actual (ej: "#6C63FF"). */
  accentHex: string
  /** RGB triplet actual (ej: "108 99 255") para `rgb(var(--accent-rgb) / α)`. */
  accentRgb: string
  /** Setea el color y aplica al DOM inmediatamente. */
  setAccentColor(hex: string): void
  /** Aplica los valores actuales al :root (idempotente). */
  applyTheme(): void
}

export const useCareerThemeStore = create<CareerThemeStore>((set, get) => ({
  accentHex: DEFAULT_ACCENT.hex,
  accentRgb: DEFAULT_ACCENT.rgb,

  setAccentColor(hex) {
    const accentRgb = hexToRgb(hex)
    set({ accentHex: hex, accentRgb })
    // Aplicamos inmediatamente — el llamador no tiene que recordar `applyTheme()`.
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      root.style.setProperty('--accent', hex)
      root.style.setProperty('--accent-rgb', accentRgb)
    }
  },

  applyTheme() {
    if (typeof document === 'undefined') return
    const { accentHex, accentRgb } = get()
    const root = document.documentElement
    root.style.setProperty('--accent', accentHex)
    root.style.setProperty('--accent-rgb', accentRgb)
  },
}))
