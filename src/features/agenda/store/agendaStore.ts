import { create } from 'zustand'
import type { AgendaEvent } from '@/shared/types'

interface AgendaStore {
  events: AgendaEvent[]
  isLoading: boolean
  loaded: boolean

  setEvents(events: AgendaEvent[]): void
  setLoading(loading: boolean): void
  /** Inserta o reemplaza un evento por id (para optimistic UI). */
  upsertLocal(event: AgendaEvent): void
  /** Reemplaza un evento identificado por un id viejo (ej: cambiar temp id por real). */
  replaceLocal(oldId: string, event: AgendaEvent): void
  removeLocal(id: string): void
  getById(id: string): AgendaEvent | undefined
  getBySubject(subjectId: string): AgendaEvent[]
  reset(): void
}

function sortByDue(events: AgendaEvent[]): AgendaEvent[] {
  return [...events].sort((a, b) => a.due_at.localeCompare(b.due_at))
}

export const useAgendaStore = create<AgendaStore>((set, get) => ({
  events: [],
  isLoading: false,
  loaded: false,

  setEvents(events) {
    set({ events: sortByDue(events), loaded: true })
  },

  setLoading(loading) {
    set({ isLoading: loading })
  },

  upsertLocal(event) {
    const exists = get().events.some(e => e.id === event.id)
    const next = exists
      ? get().events.map(e => (e.id === event.id ? event : e))
      : [...get().events, event]
    set({ events: sortByDue(next) })
  },

  replaceLocal(oldId, event) {
    set({ events: sortByDue(get().events.map(e => (e.id === oldId ? event : e))) })
  },

  removeLocal(id) {
    set({ events: get().events.filter(e => e.id !== id) })
  },

  getById(id) {
    return get().events.find(e => e.id === id)
  },

  getBySubject(subjectId) {
    return get().events.filter(e => e.subject_id === subjectId)
  },

  reset() {
    set({ events: [], isLoading: false, loaded: false })
  },
}))
