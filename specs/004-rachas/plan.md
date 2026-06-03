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

---

## UX Specification

# Streaks-UX-Spec.md — Correlativa
## Paso 4 (SDD) — Especificación de Experiencia: Rachas

> Estado: **borrador, pendiente de aprobación.**
> Depende de: `Streaks-Architecture.md` (aprobado).

---

## 1. Mood y principios

- **Discreto pero visible.** La racha es un *acompañamiento*, no la estrella. No debe robarle pantalla a la `LevelCard` ni al progreso académico.
- **Mobile-first.** Tap target generoso aunque el chip sea chico (al menos 32×32 reales).
- **Coherencia visual:** mismos tokens que el resto. 🔥 vive en la paleta de "warning" (amarillo/naranja) sin colores nuevos.

---

## 2. Pantalla principal y ubicación

Vive en el **Dashboard**, en la **fila del header**, alineado a la derecha del título de la carrera.

```
┌────────────────────────────────────────────────────────┐
│  UNCA                                       [🔥 5]     │
│  Ingeniería en Informática                             │
│                                                        │
│  ┌──────────── LevelCard ─────────────┐               │
│  │ ✦ TU NIVEL                          │               │
│  │ Nivel 7                  320/500 XP │               │
│  ...                                                   │
```

Por qué ahí:
- Se ve apenas se entra a la app (motivación inmediata).
- No le quita protagonismo a la `LevelCard`.
- En mobile, no agrega una fila extra: aprovecha el espacio en blanco del header.

En otras pantallas (Árbol, Agenda, Perfil) **no aparece** en esta iteración: el lugar canónico es Dashboard. (Considerable mejora futura.)

---

## 3. Anatomía del StreakChip

```
┌───────────┐
│ 🔥 5      │
└───────────┘
```

- Forma de **pill** (rounded-full).
- Padding: `px-3 py-1.5`.
- Fondo: `bg-bg-surface` con borde sutil `border-warning/30`.
- Tipografía: número en bold tamaño `text-sm` color `text-text-primary`. 🔥 emoji al frente.
- Si la racha es `0`, el chip se **atenúa**: `opacity-60` y borde gris (`border-muted/40`).

Estados:
| Estado | Render |
|---|---|
| Cargando | Skeleton: pill `bg-muted/30 animate-pulse` con el ancho aproximado. |
| Racha = 0 | `🔥 0` atenuado, sin texto extra (no agrego copy para mantener limpio). |
| Racha ≥ 1 | `🔥 N` con `días` opcional según ancho — ver §3.1. |

### 3.1 Texto del chip
- Hasta 1 día: `🔥 1` (cortito).
- 2+ días: `🔥 N`.
- *No incluyo la palabra "días"* en el chip para mantenerlo corto en mobile. El número con la llama es universalmente legible.

### 3.2 Tooltip / aria-label
- Hover (desktop) y `aria-label` (siempre): `"Racha actual de N días"` (o `"Sin racha activa"` cuando es 0).

---

## 4. Flujos de usuario

### Flujo principal: extender la racha
1. Usuario entra al Dashboard. Ve `🔥 5` en el header.
2. Va al Árbol, aprueba una materia (o completa un evento en la Agenda).
3. La acción dispara `emitActivity()` → `recordActivity()` → la racha se actualiza.
4. Al volver al Dashboard ve `🔥 6` (si era el primer act del día).

### Flujo de gracia (congelador)
1. Usuario tenía `🔥 10` con última actividad **anteayer** y nunca usó el congelador este mes.
2. Entra hoy, hace una acción.
3. La racha **sigue intacta** y sube a `🔥 11`. El congelador queda consumido (sin aviso visible: el PRD pidió simple).
4. Si fallara otro día este mes sin haber hecho nada, vuelve a `🔥 0`.

### Flujo de racha rota
1. Usuario tenía `🔥 10`. Faltó 3 días seguidos.
2. Al entrar al Dashboard ve `🔥 0` (atenuado).
3. Si hace una acción hoy, el chip pasa a `🔥 1`.

---

## 5. Estados de UI

| Estado | Dashboard |
|---|---|
| Cargando | Skeleton del chip + skeletons existentes. |
| Sin racha | Chip atenuado `🔥 0`. |
| Racha activa | Chip prendido `🔥 N`. |
| Recién extendida | El número cambia con una micro-animación: fade + bump (scale 1 → 1.15 → 1) breve (~200ms) cuando el valor sube. |

La micro-animación es **lo único "festivo"** de esta iteración. Sin overlays, sin confeti, sin alertas (PRD pidió simple).

---

## 6. Edge cases de UX

### E1 — Primera vez del usuario
`lastActiveDate = NULL` → chip muestra `🔥 0` atenuado.
Cuando hace la primera acción → `🔥 1` (con micro-animación).

### E2 — Mismo día, varias acciones
La racha no sube dos veces en el mismo día. El chip queda en `N`. Comportamiento correcto y silencioso.

### E3 — Última actividad fue ayer, todavía no hizo nada hoy
La racha **se muestra intacta** (la lógica considera que ayer y hoy están en ventana). Si hoy no hace nada, mañana ya verá `0` (o si todavía tiene congelador este mes, una vez más, intacta).

> Decisión deliberada: **no mostramos un indicador de "en riesgo"** ("¡marcá algo hoy o la perdés!") porque el PRD pidió la versión simple. Es un buen candidato para una iteración futura.

### E4 — Congelador usado este mes
Si la última actividad fue anteayer y el congelador ya se gastó, la racha es 0. El chip muestra `🔥 0` sin distinguir si fue por "ya gasté el congelador" — coherente con la decisión de no mostrar info del congelador.

### E5 — Cambio de zona horaria
Si el usuario viaja, "hoy" cambia y la lógica puede tener saltos raros (caso aceptado en Architecture D5). Sin tratamiento especial.

### E6 — Storage no cargado
Mientras el streak store no esté `loaded`, el chip muestra skeleton. No calculamos contra estado vacío.

---

## 7. Copy
- **Tooltip / aria-label (N ≥ 1):** `Racha actual de {N} días`
- **Tooltip / aria-label (N = 0):** `Sin racha activa`

No se necesita más copy en pantalla en esta iteración.

---

## 8. Accesibilidad y mobile
- El chip es un `<div>` con `role="status"` y `aria-live="polite"` para que un lector de pantalla anuncie cambios.
- Contraste del 🔥 + número cumple WCAG AA sobre `bg-bg-surface`.
- Aunque visualmente sea chico, la zona táctil cubre al menos 32×32 px (con padding).

---

## 9. Decisiones cerradas (de pasos previos)
- Solo racha actual (sin mejor histórico, sin heatmap).
- Sin notificaciones push.
- Sin indicador visible de congelador o "en riesgo".

---

## 10. Punto a confirmar antes de cerrar UX-Spec
La **micro-animación al subir** (fade + bump) es lo único "festivo" que metí. ¿Te parece bien, o preferís cambio silencioso sin animación?

Mi recomendación: **dejar la micro-animación** — es discreta, da feedback inmediato de que la acción del usuario produjo algo, y no roba pantalla.
