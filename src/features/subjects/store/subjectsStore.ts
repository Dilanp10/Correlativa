import { create } from 'zustand'
import type {
  SubjectWithCorrelatives,
  UserSubject,
  TreeNodeState,
  SubjectStatus,
  CareerProgress,
} from '@/shared/types'
import { UNBLOCKING_STATUSES } from '@/shared/constants'

type UnblockingStatus = typeof UNBLOCKING_STATUSES[number]

export function computeTreeStates(
  subjects: SubjectWithCorrelatives[],
  userSubjects: UserSubject[]
): Record<string, TreeNodeState> {
  const unlockedIds = new Set(
    userSubjects
      .filter(us => UNBLOCKING_STATUSES.includes(us.status as UnblockingStatus))
      .map(us => us.subject_id)
  )

  const userSubjectMap = new Map(userSubjects.map(us => [us.subject_id, us]))
  const result: Record<string, TreeNodeState> = {}

  for (const subject of subjects) {
    const userSubject = userSubjectMap.get(subject.id)
    const userStatus = userSubject?.status ?? 'no_cursada'

    let treeState: TreeNodeState

    if (UNBLOCKING_STATUSES.includes(userStatus as UnblockingStatus)) {
      treeState = 'completada'
    } else if (userStatus === 'cursando') {
      treeState = 'cursando'
    } else if (subject.requires.every(reqId => unlockedIds.has(reqId))) {
      treeState = 'disponible'
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
  const available = Object.values(treeStates).filter(s => s === 'disponible').length
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

  reset() {
    set({ subjects: [], userSubjects: [], treeStates: {}, isLoading: false, loaded: false })
  },
}))
