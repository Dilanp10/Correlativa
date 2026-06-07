import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCareerThemeStore } from './careerThemeStore'
import { DEFAULT_ACCENT, hexToRgb, getCareerTheme, ACCENT_PALETTE } from '@/shared/constants/careerThemes'

// El repo no tiene jsdom configurado. Para validar la inyección de CSS vars
// inyectamos un document mínimo como global. El store ya hace
// `typeof document !== 'undefined'` por lo que en tests sin DOM no rompe.
type FakeDocument = {
  documentElement: { style: { setProperty: ReturnType<typeof vi.fn> } }
}

function installFakeDocument(): FakeDocument {
  const fake: FakeDocument = {
    documentElement: {
      style: { setProperty: vi.fn() },
    },
  }
  ;(globalThis as Record<string, unknown>).document = fake
  return fake
}

function uninstallFakeDocument() {
  delete (globalThis as Record<string, unknown>).document
}

describe('careerThemeStore', () => {
  beforeEach(() => {
    // Reset del store a valores default antes de cada test
    useCareerThemeStore.setState({
      accentHex: DEFAULT_ACCENT.hex,
      accentRgb: DEFAULT_ACCENT.rgb,
    })
  })

  afterEach(() => {
    uninstallFakeDocument()
  })

  describe('default state', () => {
    it('arranca con el accent default (violeta)', () => {
      const state = useCareerThemeStore.getState()
      expect(state.accentHex).toBe(DEFAULT_ACCENT.hex)
      expect(state.accentRgb).toBe(DEFAULT_ACCENT.rgb)
    })
  })

  describe('setAccentColor', () => {
    it('actualiza accentHex y accentRgb en el state', () => {
      useCareerThemeStore.getState().setAccentColor('#F97316') // naranja
      const state = useCareerThemeStore.getState()
      expect(state.accentHex).toBe('#F97316')
      expect(state.accentRgb).toBe('249 115 22')
    })

    it('inyecta las CSS vars en document.documentElement', () => {
      const fake = installFakeDocument()

      useCareerThemeStore.getState().setAccentColor('#22D3EE') // cyan

      expect(fake.documentElement.style.setProperty).toHaveBeenCalledWith('--accent', '#22D3EE')
      expect(fake.documentElement.style.setProperty).toHaveBeenCalledWith('--accent-rgb', '34 211 238')
    })
  })

  describe('applyTheme', () => {
    it('reaplica los valores actuales al DOM (idempotente)', () => {
      const fake = installFakeDocument()

      useCareerThemeStore.setState({
        accentHex: '#10B981',
        accentRgb: '16 185 129',
      })

      useCareerThemeStore.getState().applyTheme()

      expect(fake.documentElement.style.setProperty).toHaveBeenCalledWith('--accent', '#10B981')
      expect(fake.documentElement.style.setProperty).toHaveBeenCalledWith('--accent-rgb', '16 185 129')
    })

    it('no rompe si no hay document (SSR-safe)', () => {
      uninstallFakeDocument()
      // Verifica que el guard `typeof document !== 'undefined'` funciona
      expect(() => useCareerThemeStore.getState().applyTheme()).not.toThrow()
    })
  })
})

describe('hexToRgb (helper)', () => {
  it('convierte hex de 6 dígitos correctamente', () => {
    expect(hexToRgb('#6C63FF')).toBe('108 99 255')
    expect(hexToRgb('#22D3EE')).toBe('34 211 238')
    expect(hexToRgb('#F97316')).toBe('249 115 22')
  })

  it('acepta hex sin #', () => {
    expect(hexToRgb('6C63FF')).toBe('108 99 255')
  })

  it('expande hex de 3 dígitos', () => {
    expect(hexToRgb('#6C6')).toBe('102 204 102')
  })

  it('devuelve el default si el hex es inválido', () => {
    expect(hexToRgb('not-a-color')).toBe(DEFAULT_ACCENT.rgb)
    expect(hexToRgb('#GGG')).toBe(DEFAULT_ACCENT.rgb)
    expect(hexToRgb('')).toBe(DEFAULT_ACCENT.rgb)
  })
})

describe('getCareerTheme', () => {
  it('arquitectura → naranja', () => {
    expect(getCareerTheme('Arquitectura')).toEqual(ACCENT_PALETTE.naranja)
  })

  it('ingeniería en informática → violeta (matchea la keyword más larga, no ingenieria genérica)', () => {
    expect(getCareerTheme('Ingeniería en Informática')).toEqual(ACCENT_PALETTE.violeta)
  })

  it('ingeniería civil → cyan (matchea ingenieria genérica)', () => {
    expect(getCareerTheme('Ingeniería Civil')).toEqual(ACCENT_PALETTE.cyan)
  })

  it('medicina → rosa', () => {
    expect(getCareerTheme('Medicina')).toEqual(ACCENT_PALETTE.rosa)
  })

  it('contador público → esmeralda', () => {
    expect(getCareerTheme('Contador Público')).toEqual(ACCENT_PALETTE.esmeralda)
  })

  it('matchea case-insensitive y sin acentos', () => {
    expect(getCareerTheme('arquitectura')).toEqual(ACCENT_PALETTE.naranja)
    expect(getCareerTheme('ARQUITECTURA')).toEqual(ACCENT_PALETTE.naranja)
    expect(getCareerTheme('Arquítectüra')).toEqual(ACCENT_PALETTE.naranja)
  })

  it('null/undefined/desconocida → default (violeta)', () => {
    expect(getCareerTheme(null)).toBe(DEFAULT_ACCENT)
    expect(getCareerTheme(undefined)).toBe(DEFAULT_ACCENT)
    expect(getCareerTheme('Carrera Inventada XYZ')).toBe(DEFAULT_ACCENT)
  })
})
