import { useMemo } from 'react'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import { useAgendaStore } from '@/features/agenda/store/agendaStore'
import { computeGamification, type GamificationState } from '@/features/gamification/lib/gamification'

export interface UseGamificationResult {
  state: GamificationState | null
  loaded: boolean
}

/**
 * Devuelve el estado de gamificación derivado de los stores ya existentes.
 * No hace fetch: confía en que useSubjects / useAgenda ya cargaron los datos
 * desde sus páginas (Dashboard, Tree, Agenda).
 */
export function useGamification(): UseGamificationResult {
  const userSubjects = useSubjectsStore(s => s.userSubjects)
  const subjectsLoaded = useSubjectsStore(s => s.loaded)
  const events = useAgendaStore(s => s.events)
  const agendaLoaded = useAgendaStore(s => s.loaded)

  const loaded = subjectsLoaded && agendaLoaded

  const state = useMemo<GamificationState | null>(() => {
    if (!loaded) return null
    return computeGamification(userSubjects, events)
  }, [loaded, userSubjects, events])

  return { state, loaded }
}
