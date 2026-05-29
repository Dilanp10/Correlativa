import type { StreakState } from '@/shared/types'

// ── Helpers de fecha (puros) ─────────────────────────────────────────────────

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/** 'YYYY-MM-DD' del día actual en zona horaria local. */
export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** 'YYYY-MM' de un 'YYYY-MM-DD'. */
export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7)
}

/** Diferencia en días calendario entre dos 'YYYY-MM-DD' (b - a). */
export function daysBetween(a: string, b: string): number {
  // Construimos en local TZ para que dos fechas YYYY-MM-DD den días exactos.
  const da = new Date(`${a}T00:00:00`)
  const db = new Date(`${b}T00:00:00`)
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}

// ── Display ──────────────────────────────────────────────────────────────────

/**
 * Devuelve el número que se debe mostrar al usuario hoy, aplicando reglas de gracia.
 * No muta el estado.
 */
export function computeDisplayStreak(state: StreakState, today: string): number {
  if (state.lastActiveDate === null) return 0
  const d = daysBetween(state.lastActiveDate, today)
  if (d === 0) return state.currentStreak
  if (d === 1) return state.currentStreak
  if (d === 2 && state.freezeUsedMonth !== monthOf(today)) return state.currentStreak
  return 0
}

// ── Transición ───────────────────────────────────────────────────────────────

/**
 * Aplica una acción del usuario "hoy" al estado.
 * - null si ya estaba activo hoy (no hay cambio que persistir).
 * - El nuevo estado si hay que persistir.
 */
export function applyActivity(state: StreakState, today: string): StreakState | null {
  // Caso 1: nunca tuvo actividad → racha = 1.
  if (state.lastActiveDate === null) {
    return { lastActiveDate: today, currentStreak: 1, freezeUsedMonth: state.freezeUsedMonth }
  }

  const d = daysBetween(state.lastActiveDate, today)

  // Caso 2: ya activo hoy → idempotente, no cambia nada.
  if (d === 0) return null

  // Caso 3: ayer → extensión normal sin congelador.
  if (d === 1) {
    return {
      lastActiveDate: today,
      currentStreak: state.currentStreak + 1,
      freezeUsedMonth: state.freezeUsedMonth,
    }
  }

  // Caso 4: anteayer con congelador disponible → extensión usando congelador.
  if (d === 2 && state.freezeUsedMonth !== monthOf(today)) {
    return {
      lastActiveDate: today,
      currentStreak: state.currentStreak + 1,
      freezeUsedMonth: monthOf(today),
    }
  }

  // Caso 5: cualquier otro caso (gap mayor, o anteayer sin congelador) → nueva racha.
  return { lastActiveDate: today, currentStreak: 1, freezeUsedMonth: state.freezeUsedMonth }
}
