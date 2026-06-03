# Data Model: Logros y Medallas

> **Importante**: Ninguna entidad se persiste. Todo se deriva en memoria del
> estado existente. No hay tablas nuevas, ni columnas, ni migraciones, ni RLS.

## Entidades (en memoria)

### Achievement (definición de catálogo)

Define un logro. Es **data estática** del código, no del usuario.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | Identificador único y estable (ej. `first-subject-approved`). |
| `name` | `string` | Nombre visible (ej. "Primer paso"). |
| `description` | `string` | Qué representa el logro. |
| `hint` | `string` | Pista de cómo conseguirlo (mostrada cuando está bloqueado). |
| `icon` | `string` | Emoji/medalla que representa el logro. |
| `category` | `'materias' \| 'progreso' \| 'estudio' \| 'racha' \| 'nivel'` | Agrupación para la galería. |
| `isUnlocked` | `(ctx: AchievementContext) => boolean` | Predicado puro que evalúa el estado. |

### AchievementContext (entrada del evaluador)

Snapshot plano del estado del usuario, armado por el hook desde los stores.
Es lo único que la lógica pura necesita (testeable sin React/Supabase).

| Campo | Tipo | Origen |
|---|---|---|
| `approvedCount` | `number` | Materias en estado `aprobada`/`promocionada`. |
| `promotedCount` | `number` | Materias en estado `promocionada`. |
| `totalSubjects` | `number` | Total de materias de la carrera activa. |
| `progressPercent` | `number` | `approvedCount / totalSubjects * 100` (0 si no hay materias). |
| `approvedByYear` | `Record<number, { approved: number; total: number }>` | Aprobadas vs total por año. |
| `studySessionCount` | `number` | Cantidad de sesiones de estudio completadas. |
| `perfectSessionCount` | `number` | Sesiones con todas las respuestas correctas. |
| `currentStreak` | `number` | Racha actual (días). |
| `level` | `number` | Nivel de gamificación actual. |

### AchievementStatus (salida del evaluador, derivada)

Para cada logro del catálogo, su estado actual.

| Campo | Tipo | Descripción |
|---|---|---|
| `achievement` | `Achievement` | La definición. |
| `unlocked` | `boolean` | Resultado de `isUnlocked(ctx)`. |

### AchievementsSummary (agregado para la galería)

| Campo | Tipo | Descripción |
|---|---|---|
| `statuses` | `AchievementStatus[]` | Todos los logros con su estado. |
| `unlockedCount` | `number` | Cuántos conseguidos. |
| `totalCount` | `number` | Total del catálogo. |

## Reglas / invariantes

- **Idempotencia**: para un mismo `AchievementContext`, el resultado es
  siempre idéntico.
- **Reversibilidad**: si el estado deja de cumplir el predicado, `unlocked`
  vuelve a `false`. No hay "una vez conseguido, para siempre" (consecuencia de
  no persistir).
- **Separación**: ningún campo de salida alimenta `computeCareerProgress`. Los
  logros son solo lectura del estado, nunca lo modifican.
- **Sin sesión cargada**: si los stores no terminaron de cargar, el hook
  reporta "no cargado" y la galería muestra skeleton (no evalúa con datos
  parciales).
