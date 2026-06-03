import { useMemo } from 'react'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import { useSessionsStore } from '@/features/study/store/sessionsStore'
import { useStreakStore } from '@/features/streaks/store/streakStore'
import { computeDisplayStreak, todayLocal } from '@/features/streaks/lib/streak'
import { useGamification } from '@/features/gamification/hooks/useGamification'
import { UNBLOCKING_STATUSES } from '@/shared/constants'
import {
  evaluateAchievements,
  type AchievementContext,
  type AchievementsSummary,
} from '@/features/achievements/lib/achievements'

export interface UseAchievementsResult {
  summary: AchievementsSummary | null
  loaded: boolean
}

type UnblockingStatus = typeof UNBLOCKING_STATUSES[number]

/**
 * Combina los stores existentes (materias, sesiones, racha, gamificación) en un
 * AchievementContext plano y devuelve el resumen de logros evaluado.
 * No hace fetch: reusa datos ya cargados por las páginas.
 */
export function useAchievements(): UseAchievementsResult {
  const subjects = useSubjectsStore(s => s.subjects)
  const userSubjects = useSubjectsStore(s => s.userSubjects)
  const subjectsLoaded = useSubjectsStore(s => s.loaded)

  const sessions = useSessionsStore(s => s.sessions)
  const streakState = useStreakStore(s => s.state)
  const { state: gamification } = useGamification()

  const loaded = subjectsLoaded

  const summary = useMemo<AchievementsSummary | null>(() => {
    if (!loaded) return null

    const approvedIds = new Set(
      userSubjects
        .filter(us => UNBLOCKING_STATUSES.includes(us.status as UnblockingStatus))
        .map(us => us.subject_id)
    )
    const promotedCount = userSubjects.filter(us => us.status === 'promocionada').length
    const approvedCount = approvedIds.size
    const totalSubjects = subjects.length
    const progressPercent =
      totalSubjects > 0 ? (approvedCount / totalSubjects) * 100 : 0

    // Aprobadas vs total por año (para logros de "año completo").
    const approvedByYear: Record<number, { approved: number; total: number }> = {}
    for (const subject of subjects) {
      const year = subject.year
      if (!approvedByYear[year]) approvedByYear[year] = { approved: 0, total: 0 }
      approvedByYear[year].total += 1
      if (approvedIds.has(subject.id)) approvedByYear[year].approved += 1
    }

    const ctx: AchievementContext = {
      approvedCount,
      promotedCount,
      totalSubjects,
      progressPercent,
      approvedByYear,
      studySessionCount: sessions.length,
      perfectSessionCount: sessions.filter(s => s.correct_count === s.total_questions).length,
      currentStreak: computeDisplayStreak(streakState, todayLocal()),
      level: gamification?.level ?? 1,
    }

    return evaluateAchievements(ctx)
  }, [loaded, subjects, userSubjects, sessions, streakState, gamification])

  return { summary, loaded }
}
