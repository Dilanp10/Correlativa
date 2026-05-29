import { describe, it, expect } from 'vitest'
import type { StreakState } from '@/shared/types'
import {
  applyActivity,
  computeDisplayStreak,
  daysBetween,
  monthOf,
  todayLocal,
} from './streak'

function state(over: Partial<StreakState> = {}): StreakState {
  return { lastActiveDate: null, currentStreak: 0, freezeUsedMonth: null, ...over }
}

describe('helpers de fecha', () => {
  it('monthOf extrae el mes', () => {
    expect(monthOf('2026-05-29')).toBe('2026-05')
    expect(monthOf('2026-01-01')).toBe('2026-01')
  })

  it('daysBetween calcula diferencia', () => {
    expect(daysBetween('2026-05-01', '2026-05-01')).toBe(0)
    expect(daysBetween('2026-05-01', '2026-05-02')).toBe(1)
    expect(daysBetween('2026-05-01', '2026-05-08')).toBe(7)
    expect(daysBetween('2026-05-01', '2026-04-30')).toBe(-1)
  })

  it('todayLocal devuelve formato válido', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('applyActivity', () => {
  it('estado inicial (nunca activo) → racha = 1', () => {
    const next = applyActivity(state(), '2026-05-29')
    expect(next).not.toBeNull()
    expect(next).toEqual({ lastActiveDate: '2026-05-29', currentStreak: 1, freezeUsedMonth: null })
  })

  it('mismo día → null (idempotente)', () => {
    const s = state({ lastActiveDate: '2026-05-29', currentStreak: 5 })
    expect(applyActivity(s, '2026-05-29')).toBeNull()
  })

  it('último día = ayer → +1 sin tocar congelador', () => {
    const s = state({ lastActiveDate: '2026-05-28', currentStreak: 5 })
    const next = applyActivity(s, '2026-05-29')
    expect(next).toEqual({ lastActiveDate: '2026-05-29', currentStreak: 6, freezeUsedMonth: null })
  })

  it('último día = anteayer con congelador libre → +1 y se consume el congelador del mes', () => {
    const s = state({ lastActiveDate: '2026-05-27', currentStreak: 5, freezeUsedMonth: null })
    const next = applyActivity(s, '2026-05-29')
    expect(next).toEqual({ lastActiveDate: '2026-05-29', currentStreak: 6, freezeUsedMonth: '2026-05' })
  })

  it('último día = anteayer y congelador ya usado este mes → racha vuelve a 1', () => {
    const s = state({ lastActiveDate: '2026-05-27', currentStreak: 5, freezeUsedMonth: '2026-05' })
    const next = applyActivity(s, '2026-05-29')
    expect(next).toEqual({ lastActiveDate: '2026-05-29', currentStreak: 1, freezeUsedMonth: '2026-05' })
  })

  it('último día = hace 3 días o más → racha vuelve a 1', () => {
    const s = state({ lastActiveDate: '2026-05-25', currentStreak: 10 })
    const next = applyActivity(s, '2026-05-29')
    expect(next).toEqual({ lastActiveDate: '2026-05-29', currentStreak: 1, freezeUsedMonth: null })
  })

  it('cambio de mes resetea la disponibilidad del congelador', () => {
    // Congelador usado en abril, ahora estamos en mayo. Anteayer activo, congelador disponible de nuevo.
    const s = state({ lastActiveDate: '2026-04-29', currentStreak: 10, freezeUsedMonth: '2026-04' })
    const next = applyActivity(s, '2026-05-01')
    expect(next).toEqual({ lastActiveDate: '2026-05-01', currentStreak: 11, freezeUsedMonth: '2026-05' })
  })
})

describe('computeDisplayStreak', () => {
  it('sin actividad previa → 0', () => {
    expect(computeDisplayStreak(state(), '2026-05-29')).toBe(0)
  })

  it('actividad hoy → muestra el contador', () => {
    expect(computeDisplayStreak(state({ lastActiveDate: '2026-05-29', currentStreak: 7 }), '2026-05-29')).toBe(7)
  })

  it('actividad ayer → todavía intacto (puede extenderse hoy)', () => {
    expect(computeDisplayStreak(state({ lastActiveDate: '2026-05-28', currentStreak: 7 }), '2026-05-29')).toBe(7)
  })

  it('actividad anteayer y congelador disponible → intacto', () => {
    expect(
      computeDisplayStreak(state({ lastActiveDate: '2026-05-27', currentStreak: 7, freezeUsedMonth: null }), '2026-05-29')
    ).toBe(7)
  })

  it('actividad anteayer y congelador ya usado → 0', () => {
    expect(
      computeDisplayStreak(state({ lastActiveDate: '2026-05-27', currentStreak: 7, freezeUsedMonth: '2026-05' }), '2026-05-29')
    ).toBe(0)
  })

  it('actividad hace 3+ días → 0', () => {
    expect(computeDisplayStreak(state({ lastActiveDate: '2026-05-25', currentStreak: 7 }), '2026-05-29')).toBe(0)
  })

  it('cambio de mes libera el congelador para display', () => {
    // Congelador usado en abril; anteayer en abril, hoy en mayo.
    expect(
      computeDisplayStreak(state({ lastActiveDate: '2026-04-29', currentStreak: 7, freezeUsedMonth: '2026-04' }), '2026-05-01')
    ).toBe(7)
  })
})
