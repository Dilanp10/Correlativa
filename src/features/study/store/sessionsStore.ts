import { create } from 'zustand'
import type { UserStudySession } from '@/shared/types'

interface SessionsStore {
  sessions: UserStudySession[]
  isLoading: boolean
  loaded: boolean

  setSessions(s: UserStudySession[]): void
  setLoading(loading: boolean): void
  upsertLocal(s: UserStudySession): void
  reset(): void
}

export const useSessionsStore = create<SessionsStore>((set, get) => ({
  sessions: [],
  isLoading: false,
  loaded: false,

  setSessions(s) {
    set({ sessions: s, loaded: true })
  },

  setLoading(loading) {
    set({ isLoading: loading })
  },

  upsertLocal(s) {
    const exists = get().sessions.some(existing => existing.id === s.id)
    set({
      sessions: exists
        ? get().sessions.map(existing => (existing.id === s.id ? s : existing))
        : [s, ...get().sessions],
    })
  },

  reset() {
    set({ sessions: [], isLoading: false, loaded: false })
  },
}))
