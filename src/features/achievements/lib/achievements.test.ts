import { describe, it, expect } from 'vitest'
import type { AchievementContext } from './achievements'
import { ACHIEVEMENTS, evaluateAchievements, unlockedIds } from './achievements'

function ctx(over: Partial<AchievementContext> = {}): AchievementContext {
  return {
    approvedCount: 0,
    promotedCount: 0,
    totalSubjects: 40,
    progressPercent: 0,
    approvedByYear: {},
    studySessionCount: 0,
    perfectSessionCount: 0,
    currentStreak: 0,
    level: 1,
    ...over,
  }
}

function has(c: AchievementContext, id: string): boolean {
  return unlockedIds(c).has(id)
}

describe('catálogo', () => {
  it('tiene IDs únicos', () => {
    const ids = ACHIEVEMENTS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('todos tienen nombre, hint e icono', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length).toBeGreaterThan(0)
      expect(a.hint.length).toBeGreaterThan(0)
      expect(a.icon.length).toBeGreaterThan(0)
    }
  })
})

describe('logros de materias', () => {
  it('primera aprobada', () => {
    expect(has(ctx(), 'first-subject-approved')).toBe(false)
    expect(has(ctx({ approvedCount: 1 }), 'first-subject-approved')).toBe(true)
  })
  it('primera promocionada', () => {
    expect(has(ctx({ promotedCount: 1 }), 'first-promoted')).toBe(true)
    expect(has(ctx(), 'first-promoted')).toBe(false)
  })
  it('5 y 10 aprobadas (umbral exacto)', () => {
    expect(has(ctx({ approvedCount: 4 }), 'five-approved')).toBe(false)
    expect(has(ctx({ approvedCount: 5 }), 'five-approved')).toBe(true)
    expect(has(ctx({ approvedCount: 9 }), 'ten-approved')).toBe(false)
    expect(has(ctx({ approvedCount: 10 }), 'ten-approved')).toBe(true)
  })
  it('primer año completo', () => {
    expect(has(ctx({ approvedByYear: { 1: { approved: 5, total: 6 } } }), 'first-year-complete')).toBe(false)
    expect(has(ctx({ approvedByYear: { 1: { approved: 6, total: 6 } } }), 'first-year-complete')).toBe(true)
  })
  it('año sin materias no cuenta como completo', () => {
    expect(has(ctx({ approvedByYear: { 1: { approved: 0, total: 0 } } }), 'first-year-complete')).toBe(false)
  })
  it('carrera completa', () => {
    expect(has(ctx({ approvedCount: 40, totalSubjects: 40 }), 'career-complete')).toBe(true)
    expect(has(ctx({ approvedCount: 39, totalSubjects: 40 }), 'career-complete')).toBe(false)
  })
  it('carrera completa nunca con 0 materias', () => {
    expect(has(ctx({ approvedCount: 0, totalSubjects: 0 }), 'career-complete')).toBe(false)
  })
})

describe('logros de progreso (%)', () => {
  it('umbrales 25/50/75', () => {
    expect(has(ctx({ progressPercent: 24 }), 'progress-25')).toBe(false)
    expect(has(ctx({ progressPercent: 25 }), 'progress-25')).toBe(true)
    expect(has(ctx({ progressPercent: 50 }), 'progress-50')).toBe(true)
    expect(has(ctx({ progressPercent: 74 }), 'progress-75')).toBe(false)
    expect(has(ctx({ progressPercent: 75 }), 'progress-75')).toBe(true)
  })
})

describe('logros de estudio', () => {
  it('primera sesión / 10 sesiones / primer perfecto', () => {
    expect(has(ctx({ studySessionCount: 1 }), 'first-study-session')).toBe(true)
    expect(has(ctx({ studySessionCount: 9 }), 'ten-study-sessions')).toBe(false)
    expect(has(ctx({ studySessionCount: 10 }), 'ten-study-sessions')).toBe(true)
    expect(has(ctx({ perfectSessionCount: 1 }), 'first-perfect')).toBe(true)
  })
})

describe('logros de racha y nivel', () => {
  it('racha de 7', () => {
    expect(has(ctx({ currentStreak: 6 }), 'streak-7')).toBe(false)
    expect(has(ctx({ currentStreak: 7 }), 'streak-7')).toBe(true)
  })
  it('nivel 5 y 10', () => {
    expect(has(ctx({ level: 5 }), 'level-5')).toBe(true)
    expect(has(ctx({ level: 9 }), 'level-10')).toBe(false)
    expect(has(ctx({ level: 10 }), 'level-10')).toBe(true)
  })
})

describe('evaluateAchievements', () => {
  it('cuenta correctamente conseguidos vs total', () => {
    const summary = evaluateAchievements(ctx({ approvedCount: 1, studySessionCount: 1 }))
    expect(summary.totalCount).toBe(ACHIEVEMENTS.length)
    expect(summary.unlockedCount).toBe(2) // first-subject-approved + first-study-session
  })

  it('contexto vacío → 0 desbloqueados', () => {
    expect(evaluateAchievements(ctx()).unlockedCount).toBe(0)
  })

  it('idempotencia: mismo contexto → mismo resultado', () => {
    const c = ctx({ approvedCount: 5, progressPercent: 30 })
    expect(unlockedIds(c)).toEqual(unlockedIds(c))
  })

  it('reversibilidad: si baja el estado, el logro se pierde', () => {
    expect(has(ctx({ approvedCount: 5 }), 'five-approved')).toBe(true)
    expect(has(ctx({ approvedCount: 3 }), 'five-approved')).toBe(false)
  })
})
