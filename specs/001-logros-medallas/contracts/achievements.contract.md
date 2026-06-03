# Contrato: Logros y Medallas

Interfaz interna (TypeScript) que expone la feature. No hay API HTTP nueva
(todo es client-side derivado del estado).

## Tipos — `features/achievements/lib/achievements.ts`

```ts
export type AchievementCategory =
  | 'materias' | 'progreso' | 'estudio' | 'racha' | 'nivel'

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
```

## Funciones puras

```ts
/** Catálogo fijo de logros (data del código). */
export const ACHIEVEMENTS: Achievement[]

/** Evalúa todo el catálogo contra el contexto. Pura, idempotente. */
export function evaluateAchievements(ctx: AchievementContext): AchievementsSummary

/** IDs de logros desbloqueados (helper para el watcher). */
export function unlockedIds(ctx: AchievementContext): Set<string>
```

## Hook — `features/achievements/hooks/useAchievements.ts`

```ts
export interface UseAchievementsResult {
  summary: AchievementsSummary | null  // null mientras no cargó
  loaded: boolean
}

/**
 * Combina subjectsStore + sessionsStore + streakStore + gamificación en un
 * AchievementContext y devuelve el resumen evaluado (con useMemo).
 * No hace fetch; reusa datos ya cargados por las páginas.
 */
export function useAchievements(): UseAchievementsResult
```

## Componentes

```ts
// AchievementBadge.tsx — una medalla
interface AchievementBadgeProps {
  status: AchievementStatus   // unlocked → color; bloqueado → silueta + hint
}

// AchievementsGallery.tsx — grid de medallas + contador
interface AchievementsGalleryProps {
  summary: AchievementsSummary | null   // null → skeleton
}

// AchievementUnlockOverlay.tsx — celebración festiva (estilo LevelUpOverlay)
interface AchievementUnlockOverlayProps {
  achievement: Achievement
  onClose: () => void
  autoDismissMs?: number   // default 2500
}

// AchievementWatcher.tsx — sin props; montado en App.
// Detecta logros nuevos (baseline en sesión, cola FIFO, re-baseline al
// cambiar de carrera) y renderiza AchievementUnlockOverlay uno por uno.
```

## Garantías del contrato

- `evaluateAchievements` y `unlockedIds` son puras (sin red, sin storage).
- El watcher nunca celebra un logro que ya estaba en el baseline (FR-008).
- Múltiples desbloqueos simultáneos se muestran todos vía cola (FR-009).
- Ningún símbolo de esta feature modifica el progreso académico (FR-010).
