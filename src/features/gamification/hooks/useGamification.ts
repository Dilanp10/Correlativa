import { useMemo } from 'react'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import { useAgendaStore } from '@/features/agenda/store/agendaStore'
import { useSessionsStore } from '@/features/study/store/sessionsStore'
import { computeGamification, type GamificationState } from '@/features/gamification/lib/gamification'

export interface UseGamificationResult {
  state: GamificationState | null
  loaded: boolean
}

/**
 * Devuelve el estado de gamificación derivado de los stores ya existentes.
 * No hace fetch: confía en que useSubjects / useAgenda / useStudySessions
 * ya cargaron los datos desde sus páginas.
 */
export function useGamification(): UseGamificationResult {
  const userSubjects = useSubjectsStore(s => s.userSubjects)
  const subjectsLoaded = useSubjectsStore(s => s.loaded)
  const events = useAgendaStore(s => s.events)
  const agendaLoaded = useAgendaStore(s => s.loaded)
  const sessions = useSessionsStore(s => s.sessions)

  // sessions puede no estar cargado todavía — lo incluimos igual
  // (si está vacío, el XP de sesiones simplemente es 0, que es correcto).
  const loaded = subjectsLoaded && agendaLoaded

  const state = useMemo<GamificationState | null>(() => {
    if (!loaded) return null
    return computeGamification(userSubjects, events, sessions)
  }, [loaded, userSubjects, events, sessions])

  return { state, loaded }
}
