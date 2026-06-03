# Streaks-Implementation-Plan.md — Correlativa
## Paso 6 (SDD) — Plan de Implementación: Rachas

> Estado: **borrador, pendiente de aprobación.** Es el último paso antes de codear.
> Depende de: todos los pasos previos aprobados.

---

## 1. Orden de desarrollo y dependencias

```
T1 Migración SQL (vos, en Supabase)
T2 Tipo StreakState en shared/types
       │
T3 Lib pura streak.ts  ───┐
       │                  │
T4 Tests de la lib  ──────┘  (en paralelo con T2/T3)
       │
T5 Event bus (shared/lib/userActivityBus.ts)
       │
T6 streakStore + useStreak  ──► T7 emitActivity en useUserSubjects + useAgenda
       │
T8 StreakChip + StreakActivityConsumer
       │
T9 Integración en Dashboard (chip) + App (consumer)  +  reset en logout
       │
T10 Build, deploy, verificación
```

Tests (T4) van **inmediatamente después** de la lib pura, antes de cualquier integración. Sin red de seguridad sobre las reglas de gracia, riesgo de bugs sutiles que la UI no expone fácilmente.

---

## 2. Tareas detalladas

### T1 — Migración SQL (la corrés vos)
SQL de Database-Spec §2 + asegurar columna `updated_at` ya existe (sí — fue creada con `users`).

- **Done cuando:** las 3 columnas existen en la tabla `users` y un `SELECT last_active_date, current_streak, freeze_used_month FROM users LIMIT 1` devuelve la fila vacía/default.

### T2 — Tipo `StreakState` en `shared/types`
Agregar la interface de API-Contracts §2.

- **Done cuando:** `tsc` pasa con el tipo declarado y exportado.

### T3 — Lib pura `features/streaks/lib/streak.ts`
Implementar `todayLocal`, `monthOf`, `daysBetween`, `computeDisplayStreak`, `applyActivity` con las firmas exactas de API-Contracts §3.

- **Done cuando:** las 5 funciones existen, son puras, sin imports externos a `@/shared/types`. `tsc` pasa.

### T4 — Tests de la lib `features/streaks/lib/streak.test.ts`
Cubrir las transiciones críticas:
- `applyActivity` con `lastActiveDate === null` → racha = 1.
- `lastActiveDate === today` → null (idempotente).
- `lastActiveDate = ayer` → +1 sin congelador.
- `lastActiveDate = anteayer` y congelador libre → +1 con congelador, `freezeUsedMonth` actualizado.
- `lastActiveDate = anteayer` y congelador ya usado este mes → reset a 1.
- `lastActiveDate = hace 3 días` → reset a 1.
- `computeDisplayStreak` en cada uno de los casos (cambio de mes incluido).
- Cambio de mes: si `freezeUsedMonth = '2026-04'` y `today = '2026-05-15'`, congelador disponible de nuevo.

- **Done cuando:** todos los tests pasan (`npx vitest run`).

### T5 — Event bus `src/shared/lib/userActivityBus.ts`
Implementar `emitActivity` y `onActivity` per API-Contracts §6. Tipo `ActivityListener = () => void`. Set interno de listeners.

- **Done cuando:** existe y compila. (Test no es estrictamente necesario por ser trivial, pero opcional.)

### T6 — Store + hook `useStreak`
- `streakStore.ts`: zustand con `state`, `isLoading`, `loaded`, `setState`, `setLoading`, `reset`.
- `useStreak.ts`: carga inicial con `useRef`, expone `display` (vía `computeDisplayStreak`), `raw`, `loaded`, `recordActivity`. Optimistic + rollback en `recordActivity`.

- **Done cuando:**
  - Llamar `useStreak()` en una página carga los datos del usuario.
  - Llamar `recordActivity()` actualiza el store y persiste; si `applyActivity` da null, no hace nada.
  - Doble llamada en mismo día no genera tráfico extra.

### T7 — `emitActivity()` en subjects y agenda
- `useUserSubjects.updateStatus`: agregar `emitActivity()` al final del bloque try (después del `upsert` exitoso, antes del `catch`).
- `useAgenda.toggleComplete`: agregar `emitActivity()` cuando se marca `completed = true` (cuando se desmarca **no** se cuenta como actividad nueva — decisión: marcar completar es activo, desmarcar es pasivo).

> **Decisión a confirmar con vos al final:** ¿`toggleComplete` emite siempre, o solo cuando pasa a `completed = true`? Mi recomendación: **solo al completar**.

- **Done cuando:** cualquiera de esas acciones dispara la actualización del store de streaks.

### T8 — `StreakChip` + `StreakActivityConsumer`
- `StreakChip.tsx`: presentacional, props `display` + `loaded`. Skeleton si no cargó. Micro-animación bump al subir.
- `StreakActivityConsumer.tsx`: monta `useStreak()` y `onActivity(recordActivity)`. Devuelve `null`.

- **Done cuando:** chip renderiza correctamente en cada estado y consumer dispara la actualización al recibir un evento del bus.

### T9 — Integración
- **DashboardPage**: agregar `<StreakChip display={...} loaded={...} />` en el header, alineado a la derecha del título. Llamar `useStreak()` ahí.
- **App.tsx**: montar `<StreakActivityConsumer />` una vez (junto al `LevelUpWatcher`).
- **ProfilePage.handleSignOut**: agregar `resetStreak()` para consistencia.

- **Done cuando:** chip visible en Dashboard, las acciones del usuario lo actualizan en tiempo real, logout lo resetea.

### T10 — Build, commit, push, verificación
- `npx tsc --noEmit` + `npx vitest run` + `npm run build` sin errores.
- Commit con mensaje siguiendo el estilo del repo.
- Push a `main` → Vercel redeploya.

- **Done cuando:** en `correlativa.vercel.app`, marcar una materia o completar un evento dispara `🔥 1` (o lo extiende si ya había racha).

---

## 3. Riesgo y mitigación

| Riesgo | Mitigación |
|---|---|
| Reglas de gracia mal implementadas (off-by-one, mes mal calculado) | Tests T4 cubren los 6 casos críticos antes de cualquier integración. |
| Acción del usuario muy seguida dispara muchas writes | `applyActivity` devuelve `null` el mismo día; no se hace ningún write. |
| Cross-feature acoplamiento | El event bus en `shared/lib` aísla totalmente streaks de subjects/agenda. |
| Edge case zona horaria | Aceptado en Architecture D5. No mitigamos. |

---

## 4. Estimación
~7 archivos nuevos (lib + test + bus + store + hook + chip + consumer) + ~3 edits (subjects hook, agenda hook, Dashboard, App, ProfilePage). Sin lógica compleja por archivo. **Riesgo bajo**, comparable a gamificación.

---

## 5. Qué NO tocar
- Otras tablas o RLS.
- Lógica existente de subjects/agenda/career/auth/gamificación (solo se agrega `emitActivity()`, una línea).
- Las decisiones explícitamente fuera de scope (heatmap, notificaciones push, mejor racha histórica, indicador "en riesgo").

---

## 6. Decisiones a confirmar antes de codear
1. **T7:** ¿`useAgenda.toggleComplete` emite actividad **solo al pasar a completed = true**, o también al desmarcar? Mi recomendación: solo al completar.
2. ¿Arrancamos con T1 (SQL) en paralelo con T2/T3, o querés ir 100% lineal? Mi recomendación: lo de siempre — te paso la SQL apenas apruebes, vos la corrés mientras yo codeo el resto.
