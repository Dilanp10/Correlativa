// Lógica pura de logros. Sin React, sin Supabase: recibe un contexto plano y
// evalúa el catálogo. Idempotente y reversible (deriva del estado).

export type AchievementCategory =
  | 'materias'
  | 'progreso'
  | 'estudio'
  | 'racha'
  | 'nivel'

export interface AchievementContext {
  approvedCount: number
  promotedCount: number
  totalSubjects: number
  progressPercent: number
  approvedByYear: Record<number, { approved: number; total: number }>
  studySessionCount: number
  perfectSessionCount: number
  currentStreak: number
  level: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  hint: string
  icon: string
  category: AchievementCategory
  isUnlocked: (ctx: AchievementContext) => boolean
  /** Progreso parcial [0..1] hacia el logro, cuando aplica (umbral). Opcional. */
  progress?: (ctx: AchievementContext) => { current: number; target: number }
}

export interface AchievementStatus {
  achievement: Achievement
  unlocked: boolean
}

export interface AchievementsSummary {
  statuses: AchievementStatus[]
  unlockedCount: number
  totalCount: number
}

/** ¿Todas las materias de un año están aprobadas/promocionadas? (y el año existe) */
function yearComplete(ctx: AchievementContext, year: number): boolean {
  const y = ctx.approvedByYear[year]
  return !!y && y.total > 0 && y.approved >= y.total
}

// ── Catálogo ──────────────────────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  // Materias
  {
    id: 'first-subject-approved',
    name: 'Primer paso',
    description: 'Aprobaste tu primera materia.',
    hint: 'Aprobá tu primera materia.',
    icon: '🎓',
    category: 'materias',
    isUnlocked: c => c.approvedCount >= 1,
  },
  {
    id: 'first-promoted',
    name: 'Sin final',
    description: 'Promocionaste una materia por primera vez.',
    hint: 'Promocioná una materia.',
    icon: '⭐',
    category: 'materias',
    isUnlocked: c => c.promotedCount >= 1,
  },
  {
    id: 'five-approved',
    name: 'En ritmo',
    description: 'Aprobaste 5 materias.',
    hint: 'Aprobá 5 materias.',
    icon: '📚',
    category: 'materias',
    isUnlocked: c => c.approvedCount >= 5,
    progress: c => ({ current: Math.min(c.approvedCount, 5), target: 5 }),
  },
  {
    id: 'ten-approved',
    name: 'Imparable',
    description: 'Aprobaste 10 materias.',
    hint: 'Aprobá 10 materias.',
    icon: '🔥',
    category: 'materias',
    isUnlocked: c => c.approvedCount >= 10,
    progress: c => ({ current: Math.min(c.approvedCount, 10), target: 10 }),
  },
  {
    id: 'first-year-complete',
    name: 'Primer año',
    description: 'Aprobaste todas las materias de primer año.',
    hint: 'Aprobá todas las materias de 1er año.',
    icon: '🥇',
    category: 'materias',
    isUnlocked: c => yearComplete(c, 1),
  },
  {
    id: 'career-complete',
    name: '¡Recibido!',
    description: 'Aprobaste todas las materias de tu carrera.',
    hint: 'Aprobá el 100% de la carrera.',
    icon: '🏆',
    category: 'materias',
    isUnlocked: c => c.totalSubjects > 0 && c.approvedCount >= c.totalSubjects,
  },

  // Progreso
  {
    id: 'progress-25',
    name: 'Arrancando',
    description: 'Llegaste al 25% de tu carrera.',
    hint: 'Completá el 25% de la carrera.',
    icon: '🌱',
    category: 'progreso',
    isUnlocked: c => c.progressPercent >= 25,
    progress: c => ({ current: Math.min(Math.round(c.progressPercent), 25), target: 25 }),
  },
  {
    id: 'progress-50',
    name: 'Mitad de camino',
    description: 'Llegaste al 50% de tu carrera.',
    hint: 'Completá el 50% de la carrera.',
    icon: '⛰️',
    category: 'progreso',
    isUnlocked: c => c.progressPercent >= 50,
    progress: c => ({ current: Math.min(Math.round(c.progressPercent), 50), target: 50 }),
  },
  {
    id: 'progress-75',
    name: 'Recta final',
    description: 'Llegaste al 75% de tu carrera.',
    hint: 'Completá el 75% de la carrera.',
    icon: '🚀',
    category: 'progreso',
    isUnlocked: c => c.progressPercent >= 75,
    progress: c => ({ current: Math.min(Math.round(c.progressPercent), 75), target: 75 }),
  },

  // Estudio
  {
    id: 'first-study-session',
    name: 'A estudiar',
    description: 'Completaste tu primera sesión de estudio.',
    hint: 'Completá una sesión en Estudiar.',
    icon: '🧠',
    category: 'estudio',
    isUnlocked: c => c.studySessionCount >= 1,
  },
  {
    id: 'ten-study-sessions',
    name: 'Constante',
    description: 'Completaste 10 sesiones de estudio.',
    hint: 'Completá 10 sesiones de estudio.',
    icon: '📖',
    category: 'estudio',
    isUnlocked: c => c.studySessionCount >= 10,
    progress: c => ({ current: Math.min(c.studySessionCount, 10), target: 10 }),
  },
  {
    id: 'first-perfect',
    name: 'Perfecto',
    description: 'Hiciste una sesión de estudio sin errores.',
    hint: 'Completá una sesión con todas las respuestas correctas.',
    icon: '💯',
    category: 'estudio',
    isUnlocked: c => c.perfectSessionCount >= 1,
  },

  // Racha
  {
    id: 'streak-7',
    name: 'Semana en llamas',
    description: 'Mantuviste una racha de 7 días.',
    hint: 'Hacé algo en la app 7 días seguidos.',
    icon: '🔥',
    category: 'racha',
    isUnlocked: c => c.currentStreak >= 7,
    progress: c => ({ current: Math.min(c.currentStreak, 7), target: 7 }),
  },

  // Nivel
  {
    id: 'level-5',
    name: 'Nivel 5',
    description: 'Alcanzaste el nivel 5.',
    hint: 'Llegá al nivel 5 sumando XP.',
    icon: '🎖️',
    category: 'nivel',
    isUnlocked: c => c.level >= 5,
    progress: c => ({ current: Math.min(c.level, 5), target: 5 }),
  },
  {
    id: 'level-10',
    name: 'Nivel 10',
    description: 'Alcanzaste el nivel 10.',
    hint: 'Llegá al nivel 10 sumando XP.',
    icon: '👑',
    category: 'nivel',
    isUnlocked: c => c.level >= 10,
    progress: c => ({ current: Math.min(c.level, 10), target: 10 }),
  },
]

// ── Evaluación (pura) ──────────────────────────────────────────────────────────

export function evaluateAchievements(ctx: AchievementContext): AchievementsSummary {
  const statuses = ACHIEVEMENTS.map(achievement => ({
    achievement,
    unlocked: achievement.isUnlocked(ctx),
  }))
  return {
    statuses,
    unlockedCount: statuses.filter(s => s.unlocked).length,
    totalCount: statuses.length,
  }
}

export function unlockedIds(ctx: AchievementContext): Set<string> {
  const ids = new Set<string>()
  for (const a of ACHIEVEMENTS) {
    if (a.isUnlocked(ctx)) ids.add(a.id)
  }
  return ids
}
