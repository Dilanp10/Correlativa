# Gamification-API-Contracts.md — Correlativa
## Paso 5 (SDD) — Contratos: Gamificación

> Estado: **borrador, pendiente de aprobación.**
> Depende de: `Gamification-Architecture.md` y `Gamification-Database-Spec.md` (aprobados).

---

## 1. Alcance

No hay queries ni mutations nuevas hacia Supabase (confirmado en el Database-Spec).
Esta feature consume **lo mismo que ya carga la app hoy**:
- `subjectsStore.userSubjects` (cargado por `useSubjects`).
- `agendaStore.events` (cargado por `useAgenda`).

Por lo tanto, los "contratos" relevantes son **internos** (lib pura + hook + watcher).

---

## 2. Tipos públicos (TypeScript)

### 2.1 Constantes de XP

```ts
// features/gamification/lib/gamification.ts

export const XP = {
  APROBADA: 100,
  PROMOCIONADA: 130,
  CURSANDO: 20,
  AGENDA_EVENT_COMPLETED: 15,
} as const
```

### 2.2 GamificationState

```ts
export interface GamificationState {
  totalXp: number       // XP total derivada del estado (≥ 0)
  level: number         // nivel actual (≥ 1)
  xpIntoLevel: number   // XP acumulada dentro del nivel actual (≥ 0)
  xpForLevel: number    // XP que cuesta el nivel actual (> 0)
  progress: number      // xpIntoLevel / xpForLevel, en [0, 1]
}
```

Invariantes:
- `0 ≤ xpIntoLevel < xpForLevel` (si `xpIntoLevel === xpForLevel` el nivel ya subió).
- `progress ∈ [0, 1)`.
- `level ≥ 1` siempre, incluso con `totalXp === 0` (Nivel 1).

---

## 3. Lib pura — `features/gamification/lib/gamification.ts`

### 3.1 `computeXp`

```ts
import type { UserSubject, AgendaEvent } from '@/shared/types'

export function computeXp(
  userSubjects: UserSubject[],
  events: AgendaEvent[]
): number
```

**Comportamiento:**
- Suma XP por materia según `userSubjects[i].status`:
  - `promocionada` → `XP.PROMOCIONADA` (130)
  - `aprobada`     → `XP.APROBADA` (100)
  - `cursando`     → `XP.CURSANDO` (20)
  - cualquier otro → 0
- Suma XP por evento con `events[i].completed === true` → `XP.AGENDA_EVENT_COMPLETED` (15).
- Es pura, determinista y O(n + m).

### 3.2 `xpToAdvance`

```ts
export function xpToAdvance(level: number): number
```

XP que cuesta avanzar **del** `level` al `level + 1`.
- `xpToAdvance(n) = 100 + (n - 1) * 50` para `n ≥ 1`.
- Precondición: `level ≥ 1`.

### 3.3 `computeLevel`

```ts
export function computeLevel(totalXp: number): GamificationState
```

**Comportamiento:**
- Loop incremental: parte de `level = 1`, `acumulado = 0`. Mientras `acumulado + xpToAdvance(level) ≤ totalXp`, suma y avanza al siguiente nivel.
- Devuelve `GamificationState` con `xpIntoLevel = totalXp - acumulado` y `xpForLevel = xpToAdvance(level)`.
- Para `totalXp === 0` → `{ totalXp: 0, level: 1, xpIntoLevel: 0, xpForLevel: 100, progress: 0 }`.

### 3.4 `computeGamification`

```ts
export function computeGamification(
  userSubjects: UserSubject[],
  events: AgendaEvent[]
): GamificationState
```

Helper que compone `computeLevel(computeXp(userSubjects, events))`. Es el entry point que usa la UI.

---

## 4. Hook — `features/gamification/hooks/useGamification.ts`

```ts
export interface UseGamificationResult {
  state: GamificationState | null   // null mientras no está listo
  loaded: boolean                    // true cuando subjects y agenda están cargados
}

export function useGamification(): UseGamificationResult
```

**Comportamiento:**
- Lee `useSubjectsStore` (selector `userSubjects` y `loaded`) y `useAgendaStore` (selector `events` y `loaded`).
- Si ambos stores tienen `loaded === true`:
  - Calcula `state = computeGamification(userSubjects, events)` con `useMemo([userSubjects, events])`.
  - Devuelve `{ state, loaded: true }`.
- Si alguno no está listo:
  - Devuelve `{ state: null, loaded: false }`.

**No hace fetch.** No usa `useEffect` para cargar datos: confía en que los stores ya están alimentados por `useSubjects` / `useAgenda` desde sus páginas (Dashboard, Tree, Agenda).

---

## 5. Watcher — `features/gamification/components/LevelUpWatcher.tsx`

Contrato como componente (no expone API pública, se monta una vez en `App`).

```tsx
export default function LevelUpWatcher(): JSX.Element | null
```

**Comportamiento:**
- Usa `useGamification()`.
- Mantiene `prevLevelRef = useRef<number | null>(null)`.
- En cada render con `loaded === true`:
  - Si `prevLevelRef.current === null` → setea el ref con `state.level` y **no celebra** (baseline silencioso, cubre E1).
  - Si `state.level > prevLevelRef.current` → encola los niveles `(prev+1 ... state.level)` y actualiza el ref.
  - Si `state.level < prevLevelRef.current` → actualiza el ref sin celebrar (cubre E4).
- Re-baseline al cambiar de carrera (cubre E2): el watcher observa `useCareerStore(s => s.activeCareer?.id)`; cuando cambia, resetea `prevLevelRef.current = null` para que el próximo cómputo sea baseline.
- Renderiza `<LevelUpOverlay level={frente_de_cola} onClose={pop} />` cuando hay cola; en otro caso `null`.

---

## 6. Componentes presentacionales

### 6.1 `LevelCard`

```ts
interface LevelCardProps {
  state: GamificationState | null   // null → renderiza skeleton
}
```

Renderiza la tarjeta especificada en UX-Spec §3.1. Sin estado interno relevante.

### 6.2 `LevelUpOverlay`

```ts
interface LevelUpOverlayProps {
  level: number             // nivel alcanzado a mostrar
  onClose: () => void       // cerrar manual o auto-dismiss
  autoDismissMs?: number    // default 2500
}
```

Renderiza el overlay descripto en UX-Spec §3.2. Internamente programa el auto-dismiss con `setTimeout`, limpiable en cleanup.

---

## 7. Errores y casos límite

| Caso | Resultado |
|---|---|
| `userSubjects` y `events` vacíos | `totalXp = 0`, `level = 1`, `progress = 0`. Sin error. |
| `totalXp` muy alto (ej: bug futuro) | El loop de `computeLevel` está acotado por el valor; igual conviene un `for` con guard `maxLevel = 100` y devolver el último nivel calculable (defensivo). |
| Status desconocido en `user_subjects` | Aporta 0 XP (default-fallthrough), no rompe. |
| Stores no cargados | `useGamification` devuelve `state: null`; UI muestra skeleton. |

Como no hay llamadas a red, **no se manejan errores de red ni de RLS** en esta capa. Cualquier falla de fetch pertenece a `useSubjects` / `useAgenda` y ya está manejada ahí (con sus propios `console.error` y rollback — ver hallazgo M3 del QA, fuera de scope acá).

---

## 8. Lo que NO se expone
- Setters de XP / mutadores: no existen (es derivado).
- Persistencia: no hay (Database-Spec lo confirmó).
- Hooks de fetch propios: no, se reusan los existentes.
