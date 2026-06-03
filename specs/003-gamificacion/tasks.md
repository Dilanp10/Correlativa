# Gamification-Implementation-Plan.md — Correlativa
## Paso 6 (SDD) — Plan de Implementación: Gamificación

> Estado: **borrador, pendiente de aprobación.**
> Depende de: todos los pasos previos aprobados (PRD, Architecture, Database-Spec, UX-Spec, API-Contracts).

---

## 1. Orden de desarrollo y dependencias

Las tareas se hacen **en este orden** porque cada una depende de la anterior:

```
T1 Lib pura (gamification.ts)
       │
       ├──► T2 Hook useGamification
       │           │
       │           ├──► T5 Watcher (necesita el hook)
       │           │
       │           └──► T6 Integración en DashboardPage (LevelCard recibe state del hook)
       │
       ├──► T3 LevelCard (usa tipos de la lib)
       │
       └──► T4 LevelUpOverlay (usa tipos de la lib)

T5 Watcher + T6 Dashboard → T7 Montaje en App
                                       │
                                       └──► T8 Build + deploy + verificación
```

Tests del lib (opcional pero recomendado) → T1.5 después de T1, antes de T2.

---

## 2. Tareas detalladas

### T1 — Lib pura `features/gamification/lib/gamification.ts`
Lo definido en API-Contracts §3: `XP` (constantes), `computeXp`, `xpToAdvance`, `computeLevel`, `computeGamification`, tipo `GamificationState`.

- **Done cuando:**
  - Las 4 funciones existen con las firmas exactas del API-Contracts.
  - `computeLevel(0)` devuelve `{ level: 1, xpIntoLevel: 0, xpForLevel: 100, progress: 0, totalXp: 0 }`.
  - `tsc` pasa sin errores.

### T1.5 — Tests de la lib (recomendado, opcional)
Vitest ya está en el stack del proyecto. Tests para:
- XP por status (`promocionada`, `aprobada`, `cursando`, otros → 0).
- XP por evento `completed`.
- `computeLevel`: 0 XP → L1; 100 XP → L2 (umbral exacto); 99 XP → L1, progress ~0.99; 250 XP → L3.
- Invariantes: `progress ∈ [0,1)`, `level ≥ 1`.

- **Done cuando:** todos los tests pasan localmente (`npm test` o `npx vitest run`).
- Si lo dejamos para después, no bloquea: la lib es chica y se puede revisar manualmente. **Decisión a confirmar con vos** (ver §5).

### T2 — Hook `features/gamification/hooks/useGamification.ts`
Lee `useSubjectsStore` y `useAgendaStore`, devuelve `{ state, loaded }` con `useMemo`.

- **Done cuando:**
  - Devuelve `state: null, loaded: false` si alguno de los stores no está listo.
  - Devuelve `state` calculado cuando ambos están listos.
  - No hace fetch ni `useEffect` para cargar.
  - `tsc` pasa.

### T3 — Componente `LevelCard`
`features/gamification/components/LevelCard.tsx`. Props: `{ state: GamificationState | null }`. Anatomía exacta de UX-Spec §3.1. Skeleton cuando `state === null`. Barra con Framer Motion.

- **Done cuando:** se ve igual al wireframe del UX-Spec, mobile-first, con loading state y estado XP=0.

### T4 — Componente `LevelUpOverlay`
`features/gamification/components/LevelUpOverlay.tsx`. Props: `{ level, onClose, autoDismissMs? }`. Anatomía de UX-Spec §3.2: backdrop modal, card centrada, animación de entrada con Framer Motion, auto-dismiss 2.5s, cierre con `Esc` y al tocar backdrop, ARIA (`role="dialog"`, `aria-modal`).

- **Done cuando:** se abre/cierra con todas las vías de cierre (botón, backdrop, Esc, auto-dismiss); animación se ve smooth; no bloquea navegación post-cierre.

### T5 — `LevelUpWatcher`
`features/gamification/components/LevelUpWatcher.tsx`. Lógica de API-Contracts §5:
- `prevLevelRef` para baseline silencioso.
- Cola FIFO si hay múltiples subidas.
- Re-baseline al cambiar `activeCareer.id` (lee `useCareerStore`).
- Renderiza `<LevelUpOverlay>` con el primero de la cola o `null`.

- **Done cuando:**
  - Primer render no celebra (E1).
  - Subir un nivel desde una acción real → overlay.
  - Recargar la página → no aparece overlay.
  - Cambiar de carrera → no aparece overlay aunque el nivel cambie.
  - Revertir una materia para bajar de nivel → no aparece overlay (E4).

### T6 — Integrar `LevelCard` en `DashboardPage`
Insertar `<LevelCard state={gam.state} />` como **primer card** del Dashboard, **arriba del card de progreso académico**. `gam` viene de `useGamification()`.

- **Done cuando:** Dashboard muestra LevelCard arriba de "Progreso de carrera", sin romper el resto.

### T7 — Montar `LevelUpWatcher` en `App`
Renderizar `<LevelUpWatcher />` una vez dentro del área autenticada (después de `BrowserRouter`, alongside `Routes`). El watcher se monta solo cuando hay sesión (puede chequearlo con `useAuthStore`).

- **Done cuando:** el watcher está montado globalmente; subir de nivel desde el árbol o la agenda dispara el overlay sin importar la pantalla.

### T8 — Build, commit, push, verificación
- `npx tsc --noEmit` y `npm run build` sin errores.
- Commit con mensaje claro siguiendo el estilo del repo.
- Push a `main` → Vercel redeploya.
- **Done cuando:** en `correlativa.vercel.app` se ve la LevelCard en Dashboard y subir un nivel dispara el overlay festivo.

---

## 3. Estimación rápida

Sin contar tests, el código nuevo son ~6 archivos chicos (lib + hook + 3 componentes + edits a Dashboard/App). Sin migración SQL, sin cambios de tipos compartidos más allá de los locales. **Riesgo bajo.**

---

## 4. Qué NO tocar en esta iteración (mantengo el scope cerrado)
- Tablas / RLS / SQL (Database-Spec lo confirmó).
- Otras features (subjects, agenda, career, auth) — solo se **leen** stores, nada de mutaciones ni cambios.
- Sistema de progreso académico actual (`computeCareerProgress`) sigue igual; gamificación es una capa aparte.
- Logros, rachas, ranking, ledger, notificaciones — quedan para tandas siguientes.
- Confeti en el overlay (decisión cerrada en UX-Spec).

---

## 5. Decisiones a confirmar antes de codear

1. **T1.5 (tests):** ¿los incluyo en esta tanda o los dejo para después? Mi recomendación: **incluirlos** — el lib es la pieza más importante (todo deriva de ahí) y tests cortos blindan la lógica.
2. ¿Confirmás que el orden T1 → … → T8 está OK y arranco?
