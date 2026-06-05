import { describe, it, expect } from 'vitest'
import { computeTreeStates } from './subjectsStore'
import type { SubjectWithCorrelatives, UserSubject, SubjectStatus } from '@/shared/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function subj(
  id: string,
  opts: Partial<Pick<SubjectWithCorrelatives, 'requiresCursar' | 'requiresRendir'>> = {}
): SubjectWithCorrelatives {
  const requiresCursar = opts.requiresCursar ?? []
  const requiresRendir = opts.requiresRendir ?? []
  return {
    id,
    career_id: 'c1',
    name: `Materia ${id}`,
    short_name: null,
    code: null,
    year: 1,
    semester: 1,
    is_elective: false,
    credits: null,
    created_at: '',
    requires: Array.from(new Set([...requiresCursar, ...requiresRendir])),
    requiresCursar,
    requiresRendir,
    unlocks: [],
  }
}

function us(subjectId: string, status: SubjectStatus): UserSubject {
  return {
    id: `us-${subjectId}`,
    user_id: 'u1',
    subject_id: subjectId,
    status,
    grade: null,
    notes: null,
    updated_at: '',
    created_at: '',
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('computeTreeStates (v2)', () => {
  it('materia sin correlativas y no cursada → disponible_cursar', () => {
    const states = computeTreeStates([subj('a')], [])
    expect(states.a).toBe('disponible_cursar')
  })

  it('correlativa para cursar NO cumplida → bloqueada', () => {
    const subjects = [subj('a'), subj('b', { requiresCursar: ['a'] })]
    const states = computeTreeStates(subjects, [])
    expect(states.b).toBe('bloqueada')
  })

  it('correlativa para cursar se satisface con la correlativa REGULAR (no hace falta aprobarla)', () => {
    const subjects = [subj('a'), subj('b', { requiresCursar: ['a'] })]
    const states = computeTreeStates(subjects, [us('a', 'regular')])
    expect(states.b).toBe('disponible_cursar')
  })

  it('correlativa para cursar también se satisface con aprobada/promocionada', () => {
    const subjects = [subj('a'), subj('b', { requiresCursar: ['a'] })]
    expect(computeTreeStates(subjects, [us('a', 'aprobada')]).b).toBe('disponible_cursar')
    expect(computeTreeStates(subjects, [us('a', 'promocionada')]).b).toBe('disponible_cursar')
  })

  it('correlativa para cursar NO se satisface si la correlativa está solo cursando', () => {
    const subjects = [subj('a'), subj('b', { requiresCursar: ['a'] })]
    const states = computeTreeStates(subjects, [us('a', 'cursando')])
    expect(states.b).toBe('bloqueada')
  })

  it('materia cursando → cursando', () => {
    const states = computeTreeStates([subj('a')], [us('a', 'cursando')])
    expect(states.a).toBe('cursando')
  })

  it('materia regular → disponible_rendir (fase de final)', () => {
    const states = computeTreeStates([subj('a')], [us('a', 'regular')])
    expect(states.a).toBe('disponible_rendir')
  })

  it('materia final_pendiente → disponible_rendir', () => {
    const states = computeTreeStates([subj('a')], [us('a', 'final_pendiente')])
    expect(states.a).toBe('disponible_rendir')
  })

  it('materia aprobada o promocionada → completada', () => {
    expect(computeTreeStates([subj('a')], [us('a', 'aprobada')]).a).toBe('completada')
    expect(computeTreeStates([subj('a')], [us('a', 'promocionada')]).a).toBe('completada')
  })

  it('cadena realista: a aprobada desbloquea b para cursar', () => {
    const subjects = [
      subj('a'),
      subj('b', { requiresCursar: ['a'], requiresRendir: ['a'] }),
    ]
    // a sin estado → b bloqueada
    expect(computeTreeStates(subjects, []).b).toBe('bloqueada')
    // a regular → b disponible para cursar
    expect(computeTreeStates(subjects, [us('a', 'regular')]).b).toBe('disponible_cursar')
  })
})
