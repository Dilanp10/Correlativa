import type { UserSubject, AgendaEvent } from '@/shared/types'

/** Valores de XP por acción/estado. Tunables sin romper nada. */
export const XP = {
  APROBADA: 100,
  PROMOCIONADA: 130,
  CURSANDO: 20,
  AGENDA_EVENT_COMPLETED: 15,
} as const

export interface GamificationState {
  totalXp: number
  level: number
  xpIntoLevel: number
  xpForLevel: number
  /** Progreso dentro del nivel actual, en [0, 1). */
  progress: number
}

/** Guard defensivo: si el XP crece muchísimo (bug futuro), no loopeamos para siempre. */
const MAX_LEVEL = 100

/**
 * XP total derivada del estado actual del usuario. Función pura.
 * O(n + m) en cantidad de materias y eventos.
 */
export function computeXp(userSubjects: UserSubject[], events: AgendaEvent[]): number {
  let xp = 0

  for (const us of userSubjects) {
    if (us.status === 'promocionada') xp += XP.PROMOCIONADA
    else if (us.status === 'aprobada') xp += XP.APROBADA
    else if (us.status === 'cursando') xp += XP.CURSANDO
    // El resto de estados aporta 0 XP en esta iteración.
  }

  for (const e of events) {
    if (e.completed) xp += XP.AGENDA_EVENT_COMPLETED
  }

  return xp
}

/**
 * XP que cuesta avanzar del `level` al `level + 1`.
 * Curva: 100 + (level - 1) * 50 → cada nivel cuesta 50 XP más que el anterior.
 */
export function xpToAdvance(level: number): number {
  return 100 + (Math.max(1, level) - 1) * 50
}

/**
 * Calcula el nivel actual a partir del XP total, con loop incremental.
 * Devuelve un GamificationState completo.
 */
export function computeLevel(totalXp: number): GamificationState {
  const xp = Math.max(0, totalXp)

  let level = 1
  let acumulado = 0
  let cost = xpToAdvance(level)

  while (level < MAX_LEVEL && acumulado + cost <= xp) {
    acumulado += cost
    level += 1
    cost = xpToAdvance(level)
  }

  const xpIntoLevel = xp - acumulado
  const xpForLevel = cost
  const progress = xpForLevel > 0 ? xpIntoLevel / xpForLevel : 0

  return { totalXp: xp, level, xpIntoLevel, xpForLevel, progress }
}

/** Entry point que combina cómputo de XP y de nivel. */
export function computeGamification(
  userSubjects: UserSubject[],
  events: AgendaEvent[]
): GamificationState {
  return computeLevel(computeXp(userSubjects, events))
}
