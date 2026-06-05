import { create } from 'zustand'
import type {
  SubjectWithCorrelatives,
  UserSubject,
  TreeNodeState,
  SubjectStatus,
  CareerProgress,
} from '@/shared/types'
import { UNBLOCKING_STATUSES, CURSAR_UNBLOCKING_STATUSES } from '@/shared/constants'

type UnblockingStatus = typeof UNBLOCKING_STATUSES[number]
type CursarUnblockingStatus = typeof CURSAR_UNBLOCKING_STATUSES[number]

export function computeTreeStates(
  subjects: SubjectWithCorrelatives[],
  userSubjects: UserSubject[]
): Record<string, TreeNodeState> {
  // Materias regularizadas o mejor (para correlativas "para cursar").
  const regularizedIds = new Set(
    userSubjects
      .filter(us => CURSAR_UNBLOCKING_STATUSES.includes(us.status as CursarUnblockingStatus))
      .map(us => us.subject_id)
  )

  const userSubjectMap = new Map(userSubjects.map(us => [us.subject_id, us]))
  const result: Record<string, TreeNodeState> = {}

  for (const subject of subjects) {
    const userSubject = userSubjectMap.get(subject.id)
    const userStatus = userSubject?.status ?? 'no_cursada'

    let treeState: TreeNodeState

    if (UNBLOCKING_STATUSES.includes(userStatus as UnblockingStatus)) {
      // Aprobada o promocionada → completada.
      treeState = 'completada'
    } else if (userStatus === 'cursando') {
      treeState = 'cursando'
    } else if (userStatus === 'regular' || userStatus === 'final_pendiente') {
      // Ya regularizó la cursada → el próximo paso es rendir el final.
      treeState = 'disponible_rendir'
    } else if (subject.requiresCursar.every(reqId => regularizedIds.has(reqId))) {
      // Cumple las correlativas para cursar → puede inscribirse.
      treeState = 'disponible_cursar'
    } else {
      treeState = 'bloqueada'
    }

    result[subject.id] = treeState
  }

  return result
}

export function computeCareerProgress(
  subjects: SubjectWithCorrelatives[],
  userSubjects: UserSubject[],
  treeStates: Record<string, TreeNodeState>
): CareerProgress {
  const total = subjects.length
  const approved = userSubjects.filter(us =>
    UNBLOCKING_STATUSES.includes(us.status as UnblockingStatus)
  ).length
  const inProgress = userSubjects.filter(us => us.status === 'cursando').length
  const available = Object.values(treeStates).filter(s => s === 'disponible_cursar').length
  const blocked = Object.values(treeStates).filter(s => s === 'bloqueada').length
  const gradesWithValue = userSubjects.filter(us => us.grade !== null)
  const averageGrade =
    gradesWithValue.length > 0
      ? gradesWithValue.reduce((sum, us) => sum + (us.grade ?? 0), 0) / gradesWithValue.length
      : null

  return {
    total,
    approved,
    inProgress,
    available,
    blocked,
    percentComplete: total > 0 ? Math.round((approved / total) * 100) : 0,
    averageGrade: averageGrade !== null ? Math.round(averageGrade * 100) / 100 : null,
  }
}

interface SubjectsStore {
  subjects: SubjectWithCorrelatives[]
  userSubjects: UserSubject[]
  treeStates: Record<string, TreeNodeState>
  isLoading: boolean
  loaded: boolean

  setSubjects(subjects: SubjectWithCorrelatives[]): void
  setUserSubjects(userSubjects: UserSubject[]): void
  setLoading(loading: boolean): void
  optimisticUpdate(subjectId: string, status: SubjectStatus, grade: number | null): void
  rollbackUpdate(subjectId: string, prev: UserSubject | undefined): void
  getUserSubject(subjectId: string): UserSubject | undefined
  getProgress(): CareerProgress
  setCorrelativeType(
    subjectId: string,
    requiresSubjectId: string,
    newType: 'para_cursar' | 'para_rendir'
  ): void
  reset(): void
}

export const useSubjectsStore = create<SubjectsStore>((set, get) => ({
  subjects: [],
  userSubjects: [],
  treeStates: {},
  isLoading: false,
  loaded: false,

  setSubjects(subjects) {
    const treeStates = computeTreeStates(subjects, get().userSubjects)
    set({ subjects, treeStates, loaded: true })
  },

  setUserSubjects(userSubjects) {
    const treeStates = computeTreeStates(get().subjects, userSubjects)
    set({ userSubjects, treeStates })
  },

  setLoading(loading) {
    set({ isLoading: loading })
  },

  optimisticUpdate(subjectId, status, grade) {
    const state = get()
    const existing = state.userSubjects.find(us => us.subject_id === subjectId)
    const now = new Date().toISOString()

    const updated: UserSubject = existing
      ? { ...existing, status, grade, updated_at: now }
      : {
          id: `optimistic-${subjectId}`,
          user_id: '',
          subject_id: subjectId,
          status,
          grade,
          notes: null,
          updated_at: now,
          created_at: now,
        }

    const updatedList = existing
      ? state.userSubjects.map(us => (us.subject_id === subjectId ? updated : us))
      : [...state.userSubjects, updated]

    set({
      userSubjects: updatedList,
      treeStates: computeTreeStates(state.subjects, updatedList),
    })
  },

  rollbackUpdate(subjectId, prev) {
    const state = get()
    const updatedList = prev
      ? state.userSubjects.map(us => (us.subject_id === subjectId ? prev : us))
      : state.userSubjects.filter(us => us.subject_id !== subjectId)

    set({
      userSubjects: updatedList,
      treeStates: computeTreeStates(state.subjects, updatedList),
    })
  },

  getUserSubject(subjectId) {
    return get().userSubjects.find(us => us.subject_id === subjectId)
  },

  getProgress() {
    const { subjects, userSubjects, treeStates } = get()
    return computeCareerProgress(subjects, userSubjects, treeStates)
  },

  setCorrelativeType(subjectId, requiresSubjectId, newType) {
    const state = get()
    const subjects = state.subjects.map(s => {
      if (s.id !== subjectId) return s
      // Sacamos la correlativa de ambos arrays y la metemos en el que corresponde.
      const requiresCursar = s.requiresCursar.filter(id => id !== requiresSubjectId)
      const requiresRendir = s.requiresRendir.filter(id => id !== requiresSubjectId)
      if (newType === 'para_cursar') requiresCursar.push(requiresSubjectId)
      else requiresRendir.push(requiresSubjectId)
      return { ...s, requiresCursar, requiresRendir }
    })

    set({ subjects, treeStates: computeTreeStates(subjects, state.userSubjects) })
  },

  reset() {
    set({ subjects: [], userSubjects: [], treeStates: {}, isLoading: false, loaded: false })
  },
}))
