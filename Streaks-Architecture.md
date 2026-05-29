# Streaks-Architecture.md — Correlativa
## Paso 2 (SDD) — Arquitectura Técnica: Rachas

> Estado: **borrador, pendiente de aprobación.** No se avanza a Database-Spec hasta que esté aprobado.
> Depende de: `Streaks-PRD.md` (aprobado).

---

## 1. Principio rector

La racha **sí** se persiste (a diferencia de XP/niveles), porque depende de fechas pasadas que ya no podríamos reconstruir sin un registro. Pero **se persiste lo mínimo**: 3 valores en la fila del usuario, y toda la lógica de transición es una **función pura** sobre ese estado + la fecha de hoy.

```
DB (users)  ──►  carga inicial  ──►  store (zustand)
                                            │
                          ┌─────────────────┴──────────────────┐
                          ▼                                    ▼
              applyActivity(state, today)              computeDisplayStreak(state, today)
              (al disparar una acción)                 (para mostrar)
                          │
                          ▼
              update DB + store (optimistic)
```

---

## 2. Diagrama de módulos

```
src/features/streaks/
├── lib/
│   └── streak.ts                # FUNCIONES PURAS: applyActivity, computeDisplayStreak, helpers de fecha
├── store/
│   └── streakStore.ts           # Zustand: lastActiveDate, currentStreak, freezeUsedMonth, loaded
├── hooks/
│   └── useStreak.ts             # Carga inicial + expone state + recordActivity()
└── components/
    └── StreakChip.tsx           # 🔥 N días (presentacional)

src/shared/lib/
└── userActivityBus.ts           # Event bus chico: emitActivity() / onActivity(cb)
                                  # Pertenece a shared porque varias features lo usan.
```

**Composición:**
- **App** monta una vez al inicio el "consumer" del bus (suscribe `recordActivity` a `onActivity`).
- **DashboardPage** renderiza `<StreakChip>` cerca de la `LevelCard`.
- **Subjects** (en `useUserSubjects.updateStatus`) y **Agenda** (en `useAgenda.toggleComplete`) llaman `emitActivity()` después de un cambio exitoso.

---

## 3. Modelo de datos (anticipo del Database-Spec)

Tres columnas nuevas en la tabla **`users`** existente:

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `last_active_date` | `date` | sí | Última fecha (en zona local del usuario) en que disparó una acción. `NULL` = nunca. |
| `current_streak` | `int` | no, default `0` | Días consecutivos contados al cierre del último `last_active_date`. |
| `freeze_used_month` | `text` | sí | `'YYYY-MM'` del mes en que se gastó el congelador. `NULL` = no usado este mes. |

RLS: **no se agrega nada** — el `users_update_own` existente ya permite que el usuario actualice estos campos.

---

## 4. Flujo de datos

### 4.1 Carga inicial
1. Después del login, junto con `loadUserCareer`, se carga el bloque de streak: `select last_active_date, current_streak, freeze_used_month from users where id = userId`.
2. Se setea en `streakStore` con `loaded = true`.

### 4.2 Mostrar la racha
- `useStreak()` lee del store. Calcula `displayStreak = computeDisplayStreak(stored, today)`:
  - Si `lastActiveDate` está en la ventana de gracia (hoy / ayer / anteayer con congelador disponible) → devuelve `currentStreak`.
  - Si está fuera → devuelve `0`.
- `StreakChip` recibe el número.

### 4.3 Registrar actividad
1. Subjects/Agenda completan exitosamente una acción del usuario → llaman `emitActivity()`.
2. El consumer (montado en App) recibe el evento y llama `recordActivity()`.
3. `recordActivity()`:
   - Lee el estado actual del store.
   - Calcula `next = applyActivity(stored, today)`.
   - Si `next === null` (ya activo hoy) → no hace nada.
   - Si cambió → update optimista en el store + persistencia en Supabase (`update users set last_active_date, current_streak, freeze_used_month`).
   - En error → rollback al estado previo.

### 4.4 Logout
- `streakStore.reset()` se agrega a `ProfilePage.handleSignOut` (consistente con los demás stores).

---

## 5. Lógica pura (resumen — se detalla en API-Contracts)

```ts
// Devuelve null si no hay cambio. Si hay, devuelve el nuevo estado a persistir.
function applyActivity(
  stored: StreakState,           // { lastActiveDate, currentStreak, freezeUsedMonth }
  today: string                  // 'YYYY-MM-DD' local
): StreakState | null

// Devuelve el número que mostrar (no muta nada).
function computeDisplayStreak(stored: StreakState, today: string): number
```

Reglas (alineadas con PRD §4):
- `lastActiveDate === today` → no cambia (ya cuenta).
- `lastActiveDate === today - 1` → `currentStreak += 1`, congelador intacto.
- `lastActiveDate === today - 2` y congelador no usado este mes → `currentStreak += 1`, `freezeUsedMonth = mes(today)`.
- En cualquier otro caso → racha nueva: `currentStreak = 1` (y se mantiene `freezeUsedMonth`).
- `lastActiveDate` siempre se setea a `today` en cualquier cambio.

---

## 6. Decisiones técnicas y por qué

### D1 — Persistir lo mínimo (3 campos en `users`)
Alternativa descartada: tabla `user_activity_days` con un row por día. Es más flexible (permite heatmap futuro) pero hoy es overkill: el PRD dice "solo racha actual" y un heatmap está explícitamente fuera de scope. Reducir a 3 campos evita una tabla, una migración con RLS, y queries extra. Cuando se necesite heatmap, se agrega esa tabla sin romper esto.

### D2 — Lógica pura, separada del IO
Mismo patrón que gamificación: `applyActivity` y `computeDisplayStreak` no tocan red ni storage. Reciben estado + fecha, devuelven nuevo estado / número. Testeable con Vitest.

### D3 — Event bus para evitar acoplamiento cross-feature
El acto de "registrar actividad" se dispara desde **subjects** y **agenda** (y, en el futuro, **estudio Duolingo-style**). Hacer que esas features importen el hook de `streaks` rompe la regla de "features no se importan entre sí".

Solución: un bus minimal en `src/shared/lib/userActivityBus.ts` (~30 líneas).
- `emitActivity()` lo invocan los productores (subjects, agenda, futuro estudio).
- `onActivity(cb)` lo suscribe el consumer del feature streaks.
- Es **pull-based para nuevos productores**: sumar otra fuente (sesión de estudio) es agregar `emitActivity()` ahí, sin tocar streaks.

### D4 — Optimistic UI con rollback
Igual que `useUserSubjects` y `useAgenda`. El chip se actualiza al instante; si falla la persistencia, se rollbackea silenciosamente al estado previo. (El hallazgo M3 del QA sobre toasts de error sigue fuera de scope; cuando se resuelva, esto también se beneficia.)

### D5 — Zona horaria local
"Hoy" se calcula en el **TZ local del navegador** del usuario (vía `Date` nativo). Razón: un día es lo que el estudiante vive como un día, no UTC. Trade-off conocido: viajar entre TZs puede dar saltos raros (edge case aceptado).

### D6 — Consumer del bus a nivel App
El `consumer` (que escucha `onActivity` y llama `recordActivity`) se monta una vez en `App` para garantizar que la actualización pase sin importar en qué pantalla esté el usuario.

### D7 — Carga inicial junto a `loadUserCareer`
En vez de un fetch separado en cada página, los 3 campos se leen junto con la carga inicial del perfil/carrera al login. Razones: ya estamos haciendo un round-trip a `users` ahí; sumar 3 columnas no cuesta nada; el chip se ve al instante en Dashboard.

---

## 7. Performance
- `applyActivity` y `computeDisplayStreak` son O(1).
- Update a Supabase por acción: 1 query (`update`) cuando corresponde; `null` si ya está al día → ni siquiera se llama.
- El bus tiene 0 dependencias y memoria despreciable.

---

## 8. Qué NO cambia
- El esquema fuera de las 3 columnas nuevas en `users`.
- Las RLS existentes.
- El comportamiento de `useUserSubjects`, `useAgenda`, ni de la UI actual — solo agregan **una línea**: `emitActivity()` al final del path feliz.
- Gamificación: convive sin tocar nada. XP y nivel siguen como están.

---

## 9. Punto a aprobar (D3)
El **event bus en `shared/lib`** es la decisión menos obvia. ¿Te parece bien, o preferís que subjects/agenda llamen directamente al hook/store de streaks (acepto cross-feature como ya hacemos con gamificación leyendo stores)?

**Mi recomendación:** ir con el bus (D3). Es más prolijo, baja el acoplamiento a casi 0, y prepara el terreno para la futura feature de "estudiar materia X" que también va a emitir actividad.
