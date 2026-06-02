import { describe, it, expect } from 'vitest'
import type { UserSubject, AgendaEvent, UserStudySession, SubjectStatus } from '@/shared/types'
import { computeXp, xpToAdvance, computeLevel, computeGamification, XP } from './gamification'

function userSubject(status: SubjectStatus): UserSubject {
  return {
    id: 'us-' + Math.random(),
    user_id: 'u',
    subject_id: 's-' + Math.random(),
    status,
    grade: null,
    notes: null,
    created_at: '',
    updated_at: '',
  }
}

function event(completed: boolean): AgendaEvent {
  return {
    id: 'e-' + Math.random(),
    user_id: 'u',
    subject_id: null,
    type: 'examen',
    title: 't',
    notes: null,
    due_at: new Date().toISOString(),
    all_day: true,
    completed,
    created_at: '',
    updated_at: '',
  }
}

describe('computeXp', () => {
  it('da 0 con listas vacías', () => {
    expect(computeXp([], [])).toBe(0)
  })

  it('suma XP por status de materia', () => {
    const xp = computeXp(
      [userSubject('aprobada'), userSubject('promocionada'), userSubject('cursando')],
      []
    )
    expect(xp).toBe(XP.APROBADA + XP.PROMOCIONADA + XP.CURSANDO)
  })

  it('ignora estados que no aportan (no_cursada, regular, etc.)', () => {
    const xp = computeXp(
      [userSubject('no_cursada'), userSubject('regular'), userSubject('libre'), userSubject('final_pendiente')],
      []
    )
    expect(xp).toBe(0)
  })

  it('suma XP solo por eventos completados', () => {
    const xp = computeXp([], [event(true), event(true), event(false)])
    expect(xp).toBe(XP.AGENDA_EVENT_COMPLETED * 2)
  })

  it('combina materias y eventos', () => {
    const xp = computeXp([userSubject('aprobada')], [event(true)])
    expect(xp).toBe(XP.APROBADA + XP.AGENDA_EVENT_COMPLETED)
  })
})

describe('xpToAdvance', () => {
  it('respeta la curva: 100 + (level-1) * 50', () => {
    expect(xpToAdvance(1)).toBe(100)
    expect(xpToAdvance(2)).toBe(150)
    expect(xpToAdvance(3)).toBe(200)
    expect(xpToAdvance(10)).toBe(550)
  })
})

describe('computeLevel', () => {
  it('XP = 0 → Nivel 1 con 0/100 (progress 0)', () => {
    const s = computeLevel(0)
    expect(s.level).toBe(1)
    expect(s.xpIntoLevel).toBe(0)
    expect(s.xpForLevel).toBe(100)
    expect(s.progress).toBe(0)
    expect(s.totalXp).toBe(0)
  })

  it('XP justo en el umbral sube al siguiente nivel', () => {
    const s = computeLevel(100) // costo exacto de L1→L2
    expect(s.level).toBe(2)
    expect(s.xpIntoLevel).toBe(0)
    expect(s.xpForLevel).toBe(150)
  })

  it('XP 1 menos que el umbral mantiene el nivel y refleja progreso casi completo', () => {
    const s = computeLevel(99)
    expect(s.level).toBe(1)
    expect(s.xpIntoLevel).toBe(99)
    expect(s.xpForLevel).toBe(100)
    expect(s.progress).toBeCloseTo(0.99, 5)
  })

  it('progreso intermedio en niveles avanzados', () => {
    // 100 (a L2) + 150 (a L3) = 250 → L3 con 0/200
    const s = computeLevel(250)
    expect(s.level).toBe(3)
    expect(s.xpIntoLevel).toBe(0)
    expect(s.xpForLevel).toBe(200)
    expect(s.progress).toBe(0)
  })

  it('invariantes: level ≥ 1, progress en [0, 1)', () => {
    for (const xp of [0, 10, 99, 100, 150, 1000, 9999]) {
      const s = computeLevel(xp)
      expect(s.level).toBeGreaterThanOrEqual(1)
      expect(s.progress).toBeGreaterThanOrEqual(0)
      expect(s.progress).toBeLessThan(1)
    }
  })

  it('XP negativa se clampea a 0', () => {
    const s = computeLevel(-50)
    expect(s.totalXp).toBe(0)
    expect(s.level).toBe(1)
  })
})

describe('computeGamification', () => {
  it('compone XP y nivel correctamente', () => {
    const s = computeGamification([userSubject('aprobada')], [])
    // 100 XP → exactamente L2 con 0/150
    expect(s.totalXp).toBe(100)
    expect(s.level).toBe(2)
    expect(s.xpForLevel).toBe(150)
  })
})

// ── Helper para sesiones ─────────────────────────────────────────────────────
function session(correct: number, total: number): UserStudySession {
  return {
    id: 'ss-' + Math.random(),
    user_id: 'u',
    subject_id: 's',
    completed_at: new Date().toISOString(),
    correct_count: correct,
    total_questions: total,
  }
}

describe('computeXp — sesiones de estudio', () => {
  it('da 0 sin sesiones', () => {
    expect(computeXp([], [], [])).toBe(0)
  })

  it('sesión normal suma XP.STUDY_SESSION', () => {
    expect(computeXp([], [], [session(3, 5)])).toBe(XP.STUDY_SESSION)
  })

  it('sesión perfecta suma STUDY_SESSION + STUDY_SESSION_PERFECT', () => {
    expect(computeXp([], [], [session(5, 5)])).toBe(XP.STUDY_SESSION + XP.STUDY_SESSION_PERFECT)
  })

  it('varias sesiones acumulan correctamente', () => {
    const xp = computeXp([], [], [session(5, 5), session(3, 5), session(5, 5)])
    const expected =
      XP.STUDY_SESSION + XP.STUDY_SESSION_PERFECT +
      XP.STUDY_SESSION +
      XP.STUDY_SESSION + XP.STUDY_SESSION_PERFECT
    expect(xp).toBe(expected)
  })

  it('sesión con 0 correctas igual suma la base', () => {
    expect(computeXp([], [], [session(0, 5)])).toBe(XP.STUDY_SESSION)
  })

  it('combina materias + eventos + sesiones', () => {
    const xp = computeXp(
      [userSubject('aprobada')],
      [event(true)],
      [session(5, 5)]
    )
    expect(xp).toBe(
      XP.APROBADA + XP.AGENDA_EVENT_COMPLETED + XP.STUDY_SESSION + XP.STUDY_SESSION_PERFECT
    )
  })
})
