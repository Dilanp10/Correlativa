import { create } from 'zustand'
import type { StreakState } from '@/shared/types'

const EMPTY: StreakState = {
  lastActiveDate: null,
  currentStreak: 0,
  freezeUsedMonth: null,
}

interface StreakStore {
  state: StreakState
  isLoading: boolean
  loaded: boolean

  setState(s: StreakState): void
  setLoading(loading: boolean): void
  reset(): void
}

export const useStreakStore = create<StreakStore>(set => ({
  state: EMPTY,
  isLoading: false,
  loaded: false,

  setState(s) {
    set({ state: s, loaded: true })
  },
  setLoading(loading) {
    set({ isLoading: loading })
  },
  reset() {
    set({ state: EMPTY, isLoading: false, loaded: false })
  },
}))
