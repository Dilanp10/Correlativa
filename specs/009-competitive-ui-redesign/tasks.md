# Tasks: Investigación Competitiva + Rediseño UI/UX v3

**Input**: Design documents from `specs/009-competitive-ui-redesign/`
**Prerequisites**: plan.md, spec.md (5 user stories), research.md, data-model.md, contracts/ui-contracts.md

**Tests**: solo tests unitarios de la lógica pura nueva (stores). UI no se testea con vitest (no hay infra de RTL en el repo).

**Organization**: Tareas agrupadas por user story de la spec. Cada story es independientemente entregable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin deps incompletas)
- **[Story]**: User story al que pertenece (US1-US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: branch ya creado en el flujo de specify. No hay setup adicional necesario.

- [ ] T001 Verificar que branch `009-competitive-ui-redesign` está activa (`git branch --show-current`)
- [ ] T002 Verificar que el build pasa antes de empezar: `npm run build` y `npx vitest run`

---

## Phase 2: Foundational — Color de acento dinámico (BLOQUEANTE para US1, US2, US5)

**Purpose**: Las mejoras visuales del árbol (US1, US2) y el sistema de color por carrera (US5) requieren `--accent` y `--accent-rgb` como CSS custom properties. Sin esto, glassmorphism y gradientes no funcionan.

**⚠️ CRITICAL**: Ninguna tarea del árbol o dashboard arranca hasta completar esta fase.

- [ ] T003 [P] Crear `src/shared/constants/careerThemes.ts` con paleta de 6 colores (violeta, cyan, naranja, verde esmeralda, rosa, amarillo) y mapeo `CAREER_ACCENT_COLORS` por nombre de carrera (lowercase). Incluir helper `hexToRgb(hex: string): string` para convertir a "r, g, b".

- [ ] T004 [P] Crear `src/features/tree/store/careerThemeStore.ts` con Zustand:
  - State: `accentColor: string` (default `#6C63FF`)
  - `setAccentColor(hex: string): void`
  - `applyTheme(): void` — inyecta `--accent` y `--accent-rgb` en `document.documentElement.style`

- [ ] T005 Actualizar `tailwind.config.ts` — cambiar `accent: '#6C63FF'` por `accent: 'rgb(var(--accent-rgb) / <alpha-value>)'` para soporte de opacidades de Tailwind. Verificar fallback en `:root` con `--accent-rgb: 108 99 255;`.

- [ ] T006 Actualizar `src/index.css` agregando `:root { --accent: #6C63FF; --accent-rgb: 108 99 255; }` para que exista valor default antes de que el store se monte.

- [ ] T007 Integrar `applyTheme()` en el flujo de carrera activa:
  - En `src/features/career/store/careerStore.ts` o en el `useCareer` hook, cuando se setea `activeCareer`, lookup en `CAREER_ACCENT_COLORS` por `activeCareer.name.toLowerCase()`, llamar `useCareerThemeStore.getState().setAccentColor(color)` + `.applyTheme()`.

- [ ] T008 Test unitario en `src/features/tree/store/careerThemeStore.test.ts`:
  - `setAccentColor` actualiza el state
  - `applyTheme` inyecta las CSS vars en el DOM (usar `document.documentElement.style.getPropertyValue`)

**Checkpoint**: El color de acento se aplica dinámicamente al cambiar de carrera. Verificable en DevTools con `getComputedStyle(document.documentElement).getPropertyValue('--accent')`.

---

## Phase 3: User Story 1 — Onboarding "¿Qué puedo cursar ahora?" (Priority: P1) 🎯 MVP

**Goal**: Que un usuario nuevo identifique las materias disponibles en <30 segundos al abrir el árbol o el dashboard.

**Independent Test**: Mostrar el dashboard y el árbol a usuario nuevo, pedir que identifique materias disponibles sin explicación. ≥80% lo logran en ≤30s.

### Implementation US1

- [ ] T009 [P] [US1] Crear `src/features/dashboard/components/AvailableNowCard.tsx`:
  - Lee `progress.available` desde `useSubjectsStore.getProgress()`
  - Muestra número grande (`text-3xl font-bold text-accent`)
  - CTA "Ver en el árbol →" navega a `/tree`
  - Variante para `available === 0`: "Aprobá más materias para desbloquear las siguientes"
  - Estilo: `bg-accent/10 border border-accent/25 rounded-2xl p-5`

- [ ] T010 [US1] Modificar `src/pages/DashboardPage.tsx` — reordenar secciones para que `AvailableNowCard` sea el primer elemento después de `PdfImportBanner`. Bajar `LevelCard` al final. El orden nuevo: PdfImportBanner → AvailableNowCard → Barra de progreso → StatCards → LevelCard.

- [ ] T011 [US1] En `src/pages/TreePage.tsx`, agregar `fitViewOptions` mejorado: cuando se monta el árbol por primera vez con materias disponibles, hacer focus en los nodos `disponible_cursar` (zoom inicial que los muestre prominentes). Usar el callback `onInit` de React Flow.

**Checkpoint**: Dashboard muestra "X materias disponibles" como primer elemento. Árbol arranca con foco en los nodos disponibles.

---

## Phase 4: User Story 2 — Árbol skill-tree con glassmorphism + unlock (Priority: P1) 🎯 CORE

**Goal**: El árbol se siente como un skill tree de RPG; los estados son legibles en <1s; desbloquear una materia es un momento celebrado.

**Independent Test**: Mostrar nodos del árbol a usuarios sin contexto. Deben leer cada estado en <1s y sentir que "quieren tocar" los disponibles. Al marcar una correlativa como aprobada, el nodo desbloqueado pulsa.

### Implementation US2

- [ ] T012 [US2] Modificar `src/features/subjects/store/subjectsStore.ts`:
  - Agregar al state: `pendingUnlocks: string[]` (inicializa `[]`)
  - Agregar acciones: `setPendingUnlocks(ids: string[])` y `clearUnlock(subjectId: string)` (filtra del array)
  - En `setUserSubjects`: comparar `prevTreeStates` (calcular antes de actualizar) con los nuevos `treeStates`. Para cada id que pase de `bloqueada` → `disponible_cursar`, agregar a `pendingUnlocks`.
  - Misma lógica en `optimisticUpdate`.

- [ ] T013 [US2] Test unitario en `src/features/subjects/store/subjectsStore.test.ts`:
  - Agregar bloque `describe('pendingUnlocks')` con casos:
    - `setUserSubjects` que aprueba la correlativa A de B → `pendingUnlocks` contiene `B`
    - `clearUnlock(B)` lo remueve
    - `setUserSubjects` sin cambios de estado → `pendingUnlocks` se mantiene vacío

- [ ] T014 [US2] Refactorizar `src/features/tree/components/SubjectNode.tsx`:
  - Cambiar todos los colores hardcodeados de accent a usar `var(--accent)` y `rgb(var(--accent-rgb) / 0.08)` para glassmorphism
  - Agregar `backdrop-filter: blur(8px)` para `disponible_cursar` y `disponible_rendir`
  - Agregar `box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.15)` en disponibles
  - Cambiar ancho de `160` a `180`
  - Cambiar text clamp de 2 a 3 líneas
  - Cambiar color de nota: `#8080A0` → `#9090B0`
  - Agregar `isPendingUnlock: boolean` a `SubjectNodeData`
  - Usar `useAnimate` de Framer Motion: si `isPendingUnlock`, animar `scale: [1, 1.08, 0.98, 1]` con `boxShadow` glow (24px spread) en 600ms; al finalizar llamar `useSubjectsStore.getState().clearUnlock(d.subject.id)`

- [ ] T015 [US2] Actualizar `src/features/tree/hooks/useTreeLayout.ts`:
  - `NODE_WIDTH` de `160` a `180`
  - Recalcular `PANEL_WIDTH` (= 180 + 32 = 212)
  - Recalcular `COL_SPACING` (= 212 + 56 = 268)
  - Leer `pendingUnlocks` desde `useSubjectsStore`
  - Incluir `isPendingUnlock: pendingUnlocks.includes(subject.id)` en `data` de cada nodo

- [ ] T016 [US2] Agregar `@media (prefers-reduced-motion: reduce)` en `src/index.css` para desactivar `backdrop-filter` (fallback de performance). Cambia a `background: rgba(var(--accent-rgb), 0.15)` sin blur.

**Checkpoint**: Al aprobar una correlativa, el nodo desbloqueado hace pulse de 600ms. Nodos disponibles tienen glassmorphism. Nodos legibles en mobile 375px.

---

## Phase 5: User Story 2 (continuación) — Edges con gradiente + paneles mejorados

**Goal**: Las líneas entre materias muestran de dónde viene la correlativa (gradiente de color); los paneles de año tienen el color de la carrera.

### Implementation US2 (continuación)

- [ ] T017 [P] [US2] Crear `src/features/tree/components/GradientEdge.tsx`:
  - Custom edge para React Flow (recibe `EdgeProps`)
  - Render `<defs><linearGradient id={'grad-'+id}>` con dos stops: color del `sourceState` y color del `targetState`
  - `<path>` con `stroke="url(#grad-...)"`, `strokeWidth` 2 (si `completada`) o 1.5
  - `opacity` 0.7 si target `completada`, 0.35 resto
  - Constante `EDGE_COLOR: Record<TreeNodeState, string>` para mapear

- [ ] T018 [US2] Modificar `src/features/tree/hooks/useTreeLayout.ts` para que los edges incluyan en `data`: `{ sourceState, targetState }`. Cambiar `type: 'smoothstep'` por `type: 'gradient'`.

- [ ] T019 [US2] Modificar `src/pages/TreePage.tsx`:
  - Importar `GradientEdge`
  - Definir `const edgeTypes = { gradient: GradientEdge }` fuera del componente
  - Pasar `edgeTypes` al `<ReactFlow>`

- [ ] T020 [US2] Refactorizar `src/features/tree/components/YearColumnNodes.tsx`:
  - `YearPanelNode`: cambiar `rgba(108,99,255,...)` por `rgba(var(--accent-rgb), ...)`. Gradiente nuevo según ui-contracts.md.
  - `YearPanelNode` label: color `rgba(var(--accent-rgb), 0.8)`, `letter-spacing: 1.5px`
  - Aumentar `HEADER_H` de 40 a 48 en `useTreeLayout.ts` (relacionado pero modificar acá también)

- [ ] T021 [US2] En `src/pages/TreePage.tsx` actualizar la leyenda: cambiar "Para cursar" de `text-accent` a `style={{ color: 'var(--accent)' }}` para que use el color de la carrera.

**Checkpoint**: Los edges del árbol tienen gradiente de color. Los paneles de año reflejan el color de la carrera activa.

---

## Phase 6: User Story 3 — Progreso celebrado como logro (Priority: P2)

**Goal**: Aprobar una materia o cruzar un milestone (25/50/75/100%) genera celebración visual.

**Independent Test**: Marcar materia como aprobada en sesión observada → usuario expresa emoción positiva. Cruzar 25% → aparece modal de celebración (solo una vez).

### Implementation US3

- [ ] T022 [P] [US3] Crear `src/features/dashboard/store/milestoneStore.ts`:
  - State: `shownMilestones: number[]` (persistido en localStorage key `correlativa:milestones`), `pendingMilestone: number | null`
  - Init: leer `localStorage.getItem('correlativa:milestones')`, parse JSON, default `[]`
  - `checkMilestone(percent: number): void` — para cada umbral [25, 50, 75, 100], si `percent >= umbral && !shownMilestones.includes(umbral)`, setear `pendingMilestone = umbral` (el más alto que aplique)
  - `dismissMilestone(): void` — agrega el `pendingMilestone` a `shownMilestones`, persiste en localStorage, setea `pendingMilestone = null`

- [ ] T023 [P] [US3] Test unitario en `src/features/dashboard/store/milestoneStore.test.ts`:
  - `checkMilestone(20)` no setea pending
  - `checkMilestone(25)` setea pending = 25
  - `dismissMilestone()` agrega a shown y limpia pending
  - `checkMilestone(25)` después de dismiss no vuelve a setear
  - `checkMilestone(60)` setea pending = 50 (el más alto no mostrado)
  - localStorage persiste entre instancias del store (mock con `vi.spyOn(Storage.prototype, 'getItem')`)

- [ ] T024 [US3] Crear `src/features/dashboard/components/MilestoneCelebration.tsx`:
  - Lee `pendingMilestone` y `dismissMilestone` del store
  - Si `pendingMilestone === null`, no renderiza nada
  - Modal con overlay `bg-black/70 z-[100]`
  - Animación Framer Motion: scale(0.8) → scale(1), opacity 0→1, 400ms spring
  - Contenido por milestone: emoji + título "¡N% completada!" + frase motivadora (definir map de frases)
  - Botón "¡Seguí así!" → llama `dismissMilestone()`

- [ ] T025 [US3] Integrar en `src/pages/DashboardPage.tsx`:
  - Llamar `checkMilestone(progress.percentComplete)` con `useEffect` cuando `!isLoading` y `progress.percentComplete` cambia
  - Montar `<MilestoneCelebration />` al final del JSX

**Checkpoint**: Al cruzar 25% (o cualquier umbral) por primera vez aparece el modal. La siguiente vez que entrás al dashboard no vuelve a salir.

---

## Phase 7: User Story 4 — Interfaz visualmente superior (Priority: P2)

**Goal**: Pulir contraste, áreas táctiles y transiciones globales para que toda la app pase WCAG AA y se sienta premium.

**Independent Test**: Audit de contraste con herramienta externa. Test táctil en móvil. ≥7/10 estudiantes prefieren Correlativa sobre SIU/Plande en blind test visual.

### Implementation US4

- [ ] T026 [US4] Audit de contraste en `src/features/tree/components/SubjectNode.tsx` y `YearColumnNodes.tsx`. Verificar con WebAIM contrast checker. Documentar cualquier color que no pase AA y corregir.

- [ ] T027 [US4] Revisar leyenda del árbol en `src/pages/TreePage.tsx`: cada item de la leyenda debe ser un elemento con padding suficiente para que el área táctil sea ≥44×44px (aunque sea decorativa, mejora UX). Agregar `py-2 px-2` y `min-h-[44px]`.

- [ ] T028 [US4] Audit de transiciones globales: verificar que ninguna animación de página/sheet dura más de 250ms. Reducir si hay alguna fuera de rango. Buscar `transition-` o `duration` en el código que pasen 250ms.

- [ ] T029 [US4] En `src/index.css`, agregar smoothing y mejoras tipográficas globales:
  - `-webkit-font-smoothing: antialiased`
  - `text-rendering: optimizeLegibility`
  - `font-feature-settings: 'cv11', 'ss01'` (si la fuente lo soporta)

**Checkpoint**: 100% de textos pasan WCAG AA. Áreas táctiles ≥44px. Transiciones ≤250ms.

---

## Phase 8: User Story 5 — Color de acento personalizable por carrera (Priority: P3)

**Goal**: Cada carrera tiene su color. La identidad visual cambia según la carrera activa del usuario.

**Independent Test**: Cambiar de Arquitectura a Ingeniería en perfil → color del árbol/dashboard cambia sin reload.

### Implementation US5

> **NOTA**: La fundación de esta US ya está cubierta en Fase 2 (T003-T008). Estas tareas son la integración fina.

- [ ] T030 [US5] Verificar que `applyTheme()` se llama en estos puntos del flujo:
  - Cuando el usuario hace login y carga su carrera (en `useCareer` o `careerStore.setActiveCareer`)
  - Cuando cambia de carrera desde Perfil (`handleChangeCareer` en `ProfilePage`)
  - Cuando completa el onboarding y elige carrera

- [ ] T031 [US5] En `src/pages/ProfilePage.tsx` y `DashboardPage.tsx`: verificar que los botones primarios usen `bg-accent` (Tailwind) en vez de colores fijos. Si hay alguno con color fijo (violeta), reemplazar.

- [ ] T032 [US5] Agregar 2-3 carreras más al mapping `CAREER_ACCENT_COLORS` si el catálogo de DB tiene más nombres comunes que no están cubiertos. Consultar con `SELECT name FROM careers` los 10 más usados.

**Checkpoint**: Cambiar de carrera en Perfil → todos los elementos accent cambian de color instantáneamente.

---

## Phase 9: Polish, QA y Deploy

**Purpose**: Cross-cutting concerns finales antes de mergear a main.

- [ ] T033 [P] Performance: cargar el árbol con una carrera de 100+ materias. Medir tiempo de render con Chrome DevTools (Performance tab). Si supera 2s, revisar si `useMemo` en `useTreeLayout` está bien cacheado.

- [ ] T034 [P] Performance mobile: en Chrome DevTools mobile emulation (iPhone SE), verificar que `backdrop-filter` no causa jank. Si lo causa, refinar el `@media (prefers-reduced-motion)` para que se active más amplio (devices low-end).

- [ ] T035 Ejecutar `npm run build` — debe pasar limpio sin warnings de TypeScript.

- [ ] T036 Ejecutar `npx vitest run` — todos los tests (existentes + nuevos de pendingUnlocks, milestoneStore, careerThemeStore) deben pasar.

- [ ] T037 Smoke test manual: levantar `npm run dev`, login real, recorrer flujo completo:
  - Dashboard muestra AvailableNowCard arriba ✓
  - Árbol tiene nodos con glassmorphism ✓
  - Marcar materia como aprobada → nodo desbloqueado pulsa ✓
  - Cambiar carrera → color cambia ✓
  - Si tu carrera tiene ≥25% completado, modal milestone aparece ✓

- [ ] T038 Commit + push a `feature/009-competitive-ui-redesign`, abrir PR a `main` con descripción detallada del rediseño.

- [ ] T039 Merge a `main` → Vercel deploya automáticamente.

---

## Dependencies

```
Fase 1 (Setup) — sin deps
  ↓
Fase 2 (Foundational: colores) — bloqueante para US1, US2, US5
  ├── Fase 3 (US1: AvailableNowCard) ────────────────┐
  ├── Fase 4 (US2: nodos glassmorphism + unlock) ──┐ │
  ├── Fase 5 (US2 cont: edges + paneles) ──────┐   │ │
  └── Fase 8 (US5: color por carrera)  ────────┤   │ │
                                               │   │ │
Fase 6 (US3: milestones) ── depende de Fase 3  │   │ │
                                               │   │ │
Fase 7 (US4: pulido global) ── puede paralelo  │   │ │
                                               ▼   ▼ ▼
                                  Fase 9 (QA + Deploy)
```

**Orden recomendado de ejecución**:
1. Fase 1 → Fase 2 (secuencial)
2. Fases 3, 4, 7 en paralelo si hay varias personas; secuencial 4→5 si una sola
3. Fase 6 después de Fase 3
4. Fase 8 después de Fase 2 (puede hacerse antes o después de 3-6)
5. Fase 9 al final

---

## Parallel Opportunities

Dentro de cada fase, las tareas marcadas `[P]` pueden correr en paralelo:

- **Fase 2**: T003 + T004 simultáneo (archivos distintos)
- **Fase 3-5 entre sí**: si trabajan dos personas, US1 (T009-T011) y US2 (T012-T021) son independientes después de Fase 2
- **Fase 6**: T022 + T023 simultáneo
- **Fase 9**: T033 + T034 simultáneo

---

## Independent Test Criteria por Story

| US | Criterio de test independiente |
|----|--------------------------------|
| US1 | Usuario nuevo identifica materias disponibles en ≤30s sin explicación (target ≥80%) |
| US2 | Aprobar una correlativa → nodo desbloqueado hace pulse visible. Estados legibles en <1s |
| US3 | Cruzar 50% de carrera → modal aparece. Volver a entrar → no vuelve a aparecer |
| US4 | Audit WCAG AA pasa 100%. Áreas táctiles ≥44px en viewport 375px |
| US5 | Cambiar carrera de Arquitectura a Ingeniería → color de árbol cambia sin reload |

---

## Implementation Strategy — MVP Scope

**MVP mínimo viable** (entregable en una sola sesión): **Fase 1 + Fase 2 + Fase 3 + Fase 4** (sin Fase 5).

Esto entrega:
- Color de acento dinámico funcionando (Fase 2)
- Dashboard con "X materias disponibles" arriba (US1)
- Árbol con nodos glassmorphism y animación de unlock (US2 primera parte)

**Iteración 2**: Fase 5 (edges con gradiente) + Fase 6 (milestones).

**Iteración 3**: Fase 7 (pulido) + Fase 8 (carreras adicionales) + Fase 9 (deploy).

---

## Notas de implementación

- **Sin tests UI**: el repo no tiene React Testing Library configurado. Los tests nuevos son solo de stores (lógica pura). La validación visual se hace por verificación manual en preview.
- **Sin cambios de DB**: no hay migración SQL en este feature.
- **Backwards compatible**: si `careerThemeStore` falla por cualquier razón, el fallback `--accent: #6C63FF` en `:root` garantiza que la app sigue funcionando.
- **Mobile-first**: cada tarea visual debe verificarse en viewport 375px antes de marcarse done.
