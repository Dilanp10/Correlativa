import { describe, it, expect, beforeEach } from 'vitest'
import { computeTreeStates, diffNewlyAvailable, useSubjectsStore } from './subjectsStore'
import type { SubjectWithCorrelatives, UserSubject, SubjectStatus, TreeNodeState } from '@/shared/types'

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

// ── diffNewlyAvailable: pura ─────────────────────────────────────────────────

describe('diffNewlyAvailable', () => {
  it('detecta materia que pasó de bloqueada a disponible_cursar', () => {
    const prev: Record<string, TreeNodeState> = { a: 'completada', b: 'bloqueada' }
    const next: Record<string, TreeNodeState> = { a: 'completada', b: 'disponible_cursar' }
    expect(diffNewlyAvailable(prev, next)).toEqual(['b'])
  })

  it('no detecta materias que pasaron a otros estados', () => {
    const prev: Record<string, TreeNodeState> = { a: 'bloqueada', b: 'disponible_cursar' }
    const next: Record<string, TreeNodeState> = { a: 'cursando', b: 'disponible_rendir' }
    expect(diffNewlyAvailable(prev, next)).toEqual([])
  })

  it('no detecta nada si ya estaba disponible (transición ya consumida)', () => {
    const prev: Record<string, TreeNodeState> = { a: 'disponible_cursar' }
    const next: Record<string, TreeNodeState> = { a: 'disponible_cursar' }
    expect(diffNewlyAvailable(prev, next)).toEqual([])
  })

  it('detecta varias unlocks simultáneas', () => {
    const prev: Record<string, TreeNodeState> = { a: 'bloqueada', b: 'bloqueada', c: 'cursando' }
    const next: Record<string, TreeNodeState> = { a: 'disponible_cursar', b: 'disponible_cursar', c: 'cursando' }
    expect(diffNewlyAvailable(prev, next).sort()).toEqual(['a', 'b'])
  })

  it('snapshot prev vacío (carga inicial) → no detecta nada', () => {
    const prev: Record<string, TreeNodeState> = {}
    const next: Record<string, TreeNodeState> = { a: 'disponible_cursar' }
    // prev[a] === undefined, no es 'bloqueada' → no se cuenta como unlock
    expect(diffNewlyAvailable(prev, next)).toEqual([])
  })
})

// ── store: pendingUnlocks ────────────────────────────────────────────────────

describe('useSubjectsStore.pendingUnlocks', () => {
  beforeEach(() => {
    useSubjectsStore.getState().reset()
  })

  it('setSubjects (carga inicial) NO popula pendingUnlocks', () => {
    const store = useSubjectsStore.getState()
    store.setSubjects([subj('a'), subj('b', { requiresCursar: ['a'] })])
    expect(useSubjectsStore.getState().pendingUnlocks).toEqual([])
  })

  it('optimisticUpdate: aprobar correlativa desbloquea hijo → pendingUnlocks contiene el hijo', () => {
    const store = useSubjectsStore.getState()
    store.setSubjects([subj('a'), subj('b', { requiresCursar: ['a'] })])
    // Estado inicial: a sin user_subject (disponible_cursar), b bloqueada
    expect(useSubjectsStore.getState().treeStates.b).toBe('bloqueada')

    store.optimisticUpdate('a', 'aprobada', 10)
    // Ahora b debería estar disponible_cursar
    const afterState = useSubjectsStore.getState()
    expect(afterState.treeStates.b).toBe('disponible_cursar')
    expect(afterState.pendingUnlocks).toContain('b')
  })

  it('clearUnlock remueve el id de pendingUnlocks', () => {
    const store = useSubjectsStore.getState()
    store.setSubjects([subj('a'), subj('b', { requiresCursar: ['a'] })])
    store.optimisticUpdate('a', 'aprobada', null)
    expect(useSubjectsStore.getState().pendingUnlocks).toContain('b')
    useSubjectsStore.getState().clearUnlock('b')
    expect(useSubjectsStore.getState().pendingUnlocks).not.toContain('b')
  })

  it('clearUnlock con id que no está en la lista es no-op', () => {
    const store = useSubjectsStore.getState()
    store.setSubjects([subj('a')])
    expect(() => store.clearUnlock('inexistente')).not.toThrow()
    expect(useSubjectsStore.getState().pendingUnlocks).toEqual([])
  })

  it('rollbackUpdate limpia los unlocks que ya no aplican', () => {
    const store = useSubjectsStore.getState()
    store.setSubjects([subj('a'), subj('b', { requiresCursar: ['a'] })])
    store.optimisticUpdate('a', 'aprobada', null)
    expect(useSubjectsStore.getState().pendingUnlocks).toContain('b')
    // Rollback: a vuelve a no_cursada → b vuelve a bloqueada
    store.rollbackUpdate('a', undefined)
    expect(useSubjectsStore.getState().treeStates.b).toBe('bloqueada')
    expect(useSubjectsStore.getState().pendingUnlocks).not.toContain('b')
  })

  it('reset limpia pendingUnlocks', () => {
    const store = useSubjectsStore.getState()
    store.setSubjects([subj('a'), subj('b', { requiresCursar: ['a'] })])
    store.optimisticUpdate('a', 'aprobada', null)
    expect(useSubjectsStore.getState().pendingUnlocks.length).toBeGreaterThan(0)
    store.reset()
    expect(useSubjectsStore.getState().pendingUnlocks).toEqual([])
  })
})
