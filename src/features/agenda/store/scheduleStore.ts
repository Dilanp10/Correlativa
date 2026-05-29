import { create } from 'zustand'
import type { ClassSchedule } from '@/shared/types'

interface ScheduleStore {
  slots: ClassSchedule[]
  isLoading: boolean
  loaded: boolean

  setSlots(slots: ClassSchedule[]): void
  setLoading(loading: boolean): void
  upsertLocal(slot: ClassSchedule): void
  replaceLocal(oldId: string, slot: ClassSchedule): void
  removeLocal(id: string): void
  getById(id: string): ClassSchedule | undefined
  reset(): void
}

function sortSlots(slots: ClassSchedule[]): ClassSchedule[] {
  return [...slots].sort(
    (a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)
  )
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  slots: [],
  isLoading: false,
  loaded: false,

  setSlots(slots) {
    set({ slots: sortSlots(slots), loaded: true })
  },

  setLoading(loading) {
    set({ isLoading: loading })
  },

  upsertLocal(slot) {
    const exists = get().slots.some(s => s.id === slot.id)
    const next = exists
      ? get().slots.map(s => (s.id === slot.id ? slot : s))
      : [...get().slots, slot]
    set({ slots: sortSlots(next) })
  },

  replaceLocal(oldId, slot) {
    set({ slots: sortSlots(get().slots.map(s => (s.id === oldId ? slot : s))) })
  },

  removeLocal(id) {
    set({ slots: get().slots.filter(s => s.id !== id) })
  },

  getById(id) {
    return get().slots.find(s => s.id === id)
  },

  reset() {
    set({ slots: [], isLoading: false, loaded: false })
  },
}))
