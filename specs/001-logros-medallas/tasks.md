# Tasks: Logros y Medallas

**Feature**: specs/001-logros-medallas
**Input**: spec.md, plan.md, research.md, data-model.md, contracts/achievements.contract.md

Formato: `- [ ] [TaskID] [P?] [Story?] Descripción con ruta de archivo`
`[P]` = paralelizable (archivo distinto, sin dependencias pendientes).

---

## Phase 1: Setup

- [ ] T001 Crear la estructura de carpetas de la feature: `src/features/achievements/{lib,hooks,components}/` (vacías, listas para los archivos siguientes)

---

## Phase 2: Foundational (lógica pura — BLOQUEA todas las historias)

Esta capa es prerequisito de las 3 historias. Se hace primero y con tests,
igual que en gamification/streaks/study.

- [ ] T002 [P] Definir los tipos en `src/features/achievements/lib/achievements.ts` (`AchievementCategory`, `AchievementContext`, `Achievement`, `AchievementStatus`, `AchievementsSummary`) según `contracts/achievements.contract.md`
- [ ] T003 Definir el catálogo `ACHIEVEMENTS` (~12-15 logros con `id`, `name`, `description`, `hint`, `icon`, `category` y predicado `isUnlocked`) en `src/features/achievements/lib/achievements.ts`, cubriendo: materias (primera aprobada, primera promocionada, 5 aprobadas, 10 aprobadas, 1er año completo, carrera completa), progreso (25/50/75%), estudio (primera sesión, 10 sesiones, primer perfecto), racha (7 días), nivel (5 y 10)
- [ ] T004 Implementar las funciones puras `evaluateAchievements(ctx)` y `unlockedIds(ctx)` en `src/features/achievements/lib/achievements.ts`
- [ ] T005 [P] Escribir tests en `src/features/achievements/lib/achievements.test.ts`: cada categoría de logro, umbrales exactos (25/50/75/100%, año completo, N sesiones, racha, nivel), idempotencia y reversibilidad

**Checkpoint**: `npx vitest run src/features/achievements/lib/achievements.test.ts` verde.

---

## Phase 3: User Story 1 — Ver mi colección de logros (P1) 🎯 MVP

**Goal**: El usuario abre el Perfil y ve todos los logros, distinguiendo
conseguidos de bloqueados, con un contador de progreso.

**Independent Test**: Con un usuario que tiene materias aprobadas y sesiones,
la galería muestra los logros correctos como conseguidos y el resto bloqueados.

- [ ] T006 [US1] Implementar el hook `useAchievements()` en `src/features/achievements/hooks/useAchievements.ts`: lee `subjectsStore`, `sessionsStore`, `streakStore` y la gamificación; arma el `AchievementContext` (incl. `approvedByYear` y `progressPercent`) y devuelve `{ summary, loaded }` con `useMemo`
- [ ] T007 [P] [US1] Crear `AchievementBadge.tsx` en `src/features/achievements/components/`: medalla a color si `unlocked`, silueta/atenuada con `hint` si bloqueada
- [ ] T008 [US1] Crear `AchievementsGallery.tsx` en `src/features/achievements/components/`: grid de `AchievementBadge` + contador "X de Y logros"; skeleton cuando `summary` es null
- [ ] T009 [US1] Integrar la galería en `src/pages/ProfilePage.tsx` (sección "Logros"), llamando a `useAchievements()`

**Checkpoint**: Galería visible y correcta en el Perfil (mobile-first).

---

## Phase 4: User Story 2 — Celebrar al desbloquear (P2)

**Goal**: Al cumplir un hito durante el uso, aparece una celebración festiva
del logro nuevo; no se recelebran los viejos.

**Independent Test**: Marcar la primera materia como aprobada dispara la
celebración; recargar la app no la vuelve a disparar.

- [ ] T010 [P] [US2] Crear `AchievementUnlockOverlay.tsx` en `src/features/achievements/components/`: overlay festivo (estilo `LevelUpOverlay`), auto-dismiss 2.5s, cierre por botón/Esc/backdrop, ARIA dialog
- [ ] T011 [US2] Crear `AchievementWatcher.tsx` en `src/features/achievements/components/`: usa `useAchievements`, mantiene baseline de IDs desbloqueados en sesión, detecta nuevos, los encola (FIFO) y muestra el overlay uno por uno; re-baseline al cambiar de carrera
- [ ] T012 [US2] Montar `<AchievementWatcher />` en `src/App.tsx` junto al `LevelUpWatcher` (dentro del área autenticada)

**Checkpoint**: Desbloqueo celebra una vez; múltiples desbloqueos se encolan; recargar no recelebra.

---

## Phase 5: User Story 3 — Pistas de cómo conseguir (P3)

**Goal**: Cada logro bloqueado comunica qué falta; con progreso parcial cuando
aplica.

**Independent Test**: Abrir la galería y verificar que cada logro bloqueado
tiene una pista entendible.

- [ ] T013 [US3] Enriquecer `AchievementBadge.tsx` para mostrar la `hint` de forma clara en bloqueados y, donde el logro sea de umbral (ej. N sesiones, % progreso), mostrar progreso parcial ("6/10") calculado desde el `AchievementContext`

**Checkpoint**: Logros bloqueados muestran pista y, cuando aplica, progreso.

---

## Phase 6: Polish & Verificación

- [ ] T014 Correr `npx tsc --noEmit`, `npx vitest run` y `npm run build`; corregir lo que falle
- [ ] T015 Commit y push (el front se auto-deploya en Vercel; no hay Edge Function ni SQL en esta feature)

---

## Dependencias y orden

```
Phase 1 (T001)
   └─> Phase 2 (T002 → T003 → T004, T005 [P])   ← bloquea todo
          ├─> Phase 3 / US1 (T006 → T007[P],T008 → T009)   ← MVP
          ├─> Phase 4 / US2 (T010[P] → T011 → T012)        ← depende de T006
          └─> Phase 5 / US3 (T013)                         ← depende de T007/T008
                 └─> Phase 6 (T014 → T015)
```

- **US1** depende solo de la fundación (Phase 2).
- **US2** depende de `useAchievements` (T006) para detectar desbloqueos.
- **US3** depende del badge/galería (T007/T008).

## Oportunidades de paralelización

- T002 y (preparar) T005 pueden empezar juntas (tipos vs. esqueleto de tests).
- T007 (`AchievementBadge`) es `[P]` respecto a T006 (hook) — archivos distintos.
- T010 (`AchievementUnlockOverlay`) es `[P]`: presentacional puro, sin depender del watcher.

## MVP sugerido

**Phase 1 + Phase 2 + Phase 3 (US1)** = galería funcional con logros derivados
del estado. Entregable independiente y testeable. US2 (celebración) y US3
(pistas/progreso) son incrementos encima.

## Validación de formato

Todas las tareas siguen `- [ ] [TaskID] [P?] [Story?] descripción + ruta`.
Total: **15 tareas** — Setup 1, Foundational 4, US1 4, US2 3, US3 1, Polish 2.
