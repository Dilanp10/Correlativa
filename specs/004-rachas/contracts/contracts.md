# Streaks-API-Contracts.md — Correlativa
## Paso 5 (SDD) — Contratos: Rachas

> Estado: **borrador, pendiente de aprobación.**
> Depende de: `Streaks-Architecture.md` y `Streaks-Database-Spec.md` (aprobados).

---

## 1. Alcance

Esta feature **sí** persiste en Supabase (3 campos en `users`). Los contratos cubren:
1. Tipos compartidos.
2. La lib pura (funciones de transición y display).
3. El store de Zustand.
4. El hook (carga + `recordActivity`).
5. El event bus compartido.
6. Los reads/writes a Supabase.

---

## 2. Tipos compartidos

```ts
// src/shared/types/index.ts (extensión)

export interface StreakState {
  /** 'YYYY-MM-DD' en zona local del usuario. null = nunca tuvo actividad. */
  lastActiveDate: string | null
  /** Días consecutivos contados al cierre de lastActiveDate. */
  currentStreak: number
  /** 'YYYY-MM' del mes en que se gastó el congelador. null = sin usar este mes. */
  freezeUsedMonth: string | null
}
```

> Nota: en la base de datos los nombres son snake_case (`last_active_date`, `current_streak`, `freeze_used_month`); en TypeScript usamos camelCase y mapeamos en el hook.

---

## 3. Lib pura — `features/streaks/lib/streak.ts`

### 3.1 Helpers de fecha

```ts
/** 'YYYY-MM-DD' del día actual en zona horaria local. */
export function todayLocal(now?: Date): string

/** 'YYYY-MM' del mes de la fecha (formato 'YYYY-MM-DD'). */
export function monthOf(dateStr: string): string

/** Diferencia en días calendario entre dos 'YYYY-MM-DD' (b - a). */
export function daysBetween(a: string, b: string): number
```

- Implementación con `Date` nativo y comparación por componentes locales.
- 100% puras y testeables.

### 3.2 Display

```ts
/** Devuelve el número que se debe mostrar al usuario hoy. */
export function computeDisplayStreak(state: StreakState, today: string): number
```

**Reglas:**
- Si `lastActiveDate === null` → `0`.
- Sea `d = daysBetween(lastActiveDate, today)`:
  - `d === 0` → `currentStreak`.
  - `d === 1` → `currentStreak` (todavía intacta, puede extenderse hoy).
  - `d === 2` y `freezeUsedMonth !== monthOf(today)` → `currentStreak` (congelador disponible la salvaría).
  - Cualquier otro caso → `0`.

### 3.3 Transición

```ts
/**
 * Aplica una "acción del usuario hoy" al estado.
 * - Devuelve null si ya estaba activo hoy (no hay cambio que persistir).
 * - Devuelve el nuevo estado a persistir en caso contrario.
 */
export function applyActivity(state: StreakState, today: string): StreakState | null
```

**Reglas:**
- Si `lastActiveDate === today` → `null` (idempotente para el mismo día).
- Si `lastActiveDate === null` o `d > 2` o (`d === 2` y congelador ya usado este mes) → **racha nueva**:
  - `{ lastActiveDate: today, currentStreak: 1, freezeUsedMonth: state.freezeUsedMonth }`
- Si `d === 1` → **extender sin congelador**:
  - `{ lastActiveDate: today, currentStreak: currentStreak + 1, freezeUsedMonth: state.freezeUsedMonth }`
- Si `d === 2` y congelador disponible → **extender con congelador**:
  - `{ lastActiveDate: today, currentStreak: currentStreak + 1, freezeUsedMonth: monthOf(today) }`

**Invariantes garantizados:**
- `currentStreak ≥ 1` en todos los retornos no-null (la única vía a 0 es vía `computeDisplayStreak`).
- `lastActiveDate` siempre se setea a `today` cuando devuelve no-null.

---

## 4. Store — `features/streaks/store/streakStore.ts`

```ts
interface StreakStore {
  state: StreakState
  isLoading: boolean
  loaded: boolean

  setState(s: StreakState): void
  setLoading(loading: boolean): void
  reset(): void
}
```

- Estado inicial: `{ lastActiveDate: null, currentStreak: 0, freezeUsedMonth: null }`, `isLoading: false`, `loaded: false`.
- `reset()` vuelve al estado inicial (usado en logout).

---

## 5. Hook — `features/streaks/hooks/useStreak.ts`

```ts
export interface UseStreakResult {
  /** Número a mostrar (ya pasado por computeDisplayStreak). */
  display: number
  /** Estado crudo (por si se necesita en algún lado). */
  raw: StreakState
  loaded: boolean
  /** Registra actividad. Idempotente para el mismo día. */
  recordActivity: () => Promise<void>
}

export function useStreak(): UseStreakResult
```

**Comportamiento de carga:**
- Lee del store. Si `loaded === false` y hay sesión, dispara una carga inicial: `select last_active_date, current_streak, freeze_used_month from users where id = userId`.
- Mapea snake_case → camelCase, setea en el store, marca `loaded = true`.
- Usa el patrón `useRef` para evitar doble carga en Strict Mode (mismo patrón que `useSubjects` y `useAgenda`).

**Comportamiento de `recordActivity`:**
1. Calcula `next = applyActivity(state, todayLocal())`.
2. Si `next === null` → no hace nada.
3. Si cambió:
   - **Optimistic:** setea el nuevo estado en el store.
   - Persiste en Supabase: `update users set last_active_date, current_streak, freeze_used_month where id = userId`.
   - Si falla → rollback al estado previo (`console.error`, sin toast en esta iteración).

**Importante:** `recordActivity` NO se llama directamente desde los componentes de UI. Se llama desde el consumer del event bus (ver §6).

---

## 6. Event bus — `src/shared/lib/userActivityBus.ts`

```ts
type ActivityListener = () => void

const listeners = new Set<ActivityListener>()

/** Notifica que el usuario hizo una acción válida para racha. */
export function emitActivity(): void

/** Suscribe un listener. Devuelve unsubscribe. */
export function onActivity(cb: ActivityListener): () => void
```

- ~15 líneas de código.
- Sin dependencias.
- Vive en `shared/lib` (todas las features pueden importarlo sin violar la regla cross-feature).

**Productores (emiten):**
- `useUserSubjects.updateStatus` → al final del try (después de upsert exitoso).
- `useAgenda.toggleComplete` (y/o `updateEvent` cuando se marca completed) → ídem.
- Futuro: hook de "sesión de estudio" que sumemos en otra tanda.

**Consumer (escucha):**
- Un componente `StreakActivityConsumer` montado una vez en `App` (similar al `LevelUpWatcher`):

```tsx
function StreakActivityConsumer(): null {
  const { recordActivity } = useStreak()
  useEffect(() => onActivity(recordActivity), [recordActivity])
  return null
}
```

---

## 7. Componente — `features/streaks/components/StreakChip.tsx`

```ts
interface StreakChipProps {
  display: number          // resultado de computeDisplayStreak
  loaded: boolean          // si false → renderiza skeleton
}
```

- Sin estado propio.
- Aplica la micro-animación (fade + bump) cuando `display` cambia a un valor mayor: `useEffect([display])` que dispara una key de animación.

---

## 8. Reads/Writes a Supabase

### 8.1 Read (al cargar streak)
```ts
const { data, error } = await supabase
  .from('users')
  .select('last_active_date, current_streak, freeze_used_month')
  .eq('id', userId)
  .single()
```
- Esperado: 1 fila (el trigger `handle_new_user` garantiza que existe).
- Si falla con RLS o error de red: se loggea, `loaded` no se marca y el chip queda en skeleton hasta el próximo intento.

### 8.2 Write (en cada actividad real)
```ts
const { error } = await supabase
  .from('users')
  .update({
    last_active_date: next.lastActiveDate,
    current_streak: next.currentStreak,
    freeze_used_month: next.freezeUsedMonth,
  })
  .eq('id', userId)
```
- RLS `users_update_own` ya lo permite.
- En error → rollback en el store, log a consola.

---

## 9. Errores y casos límite

| Caso | Comportamiento |
|---|---|
| Usuario sin sesión | El hook no carga ni emite escrituras. El bus puede ser llamado, pero `recordActivity` early-returns si no hay user. |
| Carga inicial falla | `loaded = false`, chip en skeleton, sin reintento automático (próxima carga al refrescar/relogin). |
| Write falla | Rollback en el store, `console.error`. El usuario sigue viendo el chip viejo. |
| Click rápido en varias acciones el mismo día | `applyActivity` devuelve `null` desde el segundo en adelante → no se persiste nada. |
| Día cambia mientras la app está abierta | El próximo `recordActivity` recalcula con el nuevo `todayLocal()`. Caso aceptado: edge case raro. |

---

## 10. Lo que NO se expone
- No se expone un setter manual de racha (solo `recordActivity`).
- No hay endpoint/función para forzar reset.
- No hay query de historial (no hay datos para responder eso en esta iteración).
