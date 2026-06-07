# Implementation Plan: Investigación Competitiva + Rediseño UI/UX v3

**Branch**: `009-competitive-ui-redesign` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

---

## Summary

Elevar visualmente Correlativa a nivel de productos premium (Linear, Arc Browser) partiendo de la investigación competitiva que demuestra que el árbol de correlativas es el único diferencial irrenunciable que ningún competidor tiene bien implementado. El plan cubre:

1. **Árbol mejorado**: nodos con glassmorphism, edges con gradiente, paneles de año refactorizados, animación de unlock, nodos más anchos.
2. **Dashboard reordenado**: "¿Qué puedo cursar ahora?" como primer elemento visual.
3. **Color de acento por carrera**: CSS custom properties en runtime, paleta pre-aprobada.
4. **Milestones de celebración**: modal al 25/50/75/100% de carrera completada.

**Sin cambios al schema de Supabase.** Todo es presentación y estado del cliente.

---

## Technical Context

**Language/Version**: TypeScript 5.x + React 18.x (existente)
**Primary Dependencies**: React Flow (@xyflow/react), Framer Motion, Zustand, TailwindCSS (todos existentes)
**Storage**: localStorage (milestones), Zustand in-memory (pending unlocks, career theme)
**Testing**: Vitest (existente) — lógica de milestone y unlock store se cubre con tests unitarios
**Target Platform**: Mobile web (375px first) + desktop
**Project Type**: Web app (SPA con Vite)
**Performance Goals**: Árbol con 120 materias renderiza en <2s; animaciones a 60fps
**Constraints**: Sin dependencias nuevas; sin cambios al schema de DB; backwards compatible
**Scale/Scope**: Refactoring visual de ~5 archivos core + 6 archivos nuevos

---

## Constitution Check

- ✅ **SDD**: Spec y plan completos antes de implementar.
- ✅ **Mobile-First**: Nodos 180px verificados en 375px; glassmorphism con fallback prefers-reduced-motion.
- ✅ **Feature-First**: cambios en `features/tree/` y `features/dashboard/`. Sin mezclar.
- ✅ **TypeScript Estricto**: Todos los tipos definidos en data-model.md. Sin `any`.
- ✅ **Estado Derivado**: `pendingUnlocks` y `pendingMilestone` derivados de cambios de estado existentes.
- ✅ **Sin dependencias nuevas**: Framer Motion, Zustand y React Flow ya están en el stack.

---

## Project Structure

### Documentation (this feature)

```text
specs/009-competitive-ui-redesign/
├── plan.md              ← este archivo
├── research.md          ← decisiones técnicas y competitivas
├── data-model.md        ← cambios al estado del cliente
├── contracts/
│   └── ui-contracts.md  ← contratos visuales de cada componente
└── tasks.md             ← próximo paso: /speckit-tasks
```

### Source Code

```text
src/
├── features/
│   ├── tree/
│   │   ├── components/
│   │   │   ├── SubjectNode.tsx          ← MODIFICAR
│   │   │   ├── YearColumnNodes.tsx      ← MODIFICAR
│   │   │   └── GradientEdge.tsx         ← CREAR
│   │   ├── hooks/
│   │   │   └── useTreeLayout.ts         ← MODIFICAR
│   │   └── store/
│   │       └── careerThemeStore.ts      ← CREAR
│   ├── subjects/
│   │   └── store/
│   │       └── subjectsStore.ts         ← MODIFICAR (pendingUnlocks)
│   └── dashboard/
│       ├── store/
│       │   └── milestoneStore.ts        ← CREAR
│       └── components/
│           ├── AvailableNowCard.tsx     ← CREAR
│           └── MilestoneCelebration.tsx ← CREAR
├── pages/
│   ├── TreePage.tsx                     ← MODIFICAR
│   └── DashboardPage.tsx                ← MODIFICAR
└── shared/
    └── constants/
        └── careerThemes.ts              ← CREAR
```

---

## Implementation Phases

### Fase 1 — Colores de acento por carrera (fundación)

**Dependencias**: ninguna — puede hacerse primero sin tocar el árbol.

**Tareas**:
1. `src/shared/constants/careerThemes.ts` — paleta de 6 colores + mapeo por nombre de carrera (lowercase)
2. `src/features/tree/store/careerThemeStore.ts` — Zustand store con `applyTheme()` que inyecta `--accent` y `--accent-rgb` en `:root`
3. `tailwind.config.ts` — hacer `accent` consumir `var(--accent)` dinámicamente
4. Llamar a `applyTheme()` cuando cambia la carrera activa (en `CareerRequiredRoute` o `useCareer`)

**Criterio de done**: El color de los botones y nodos del árbol cambia en <100ms al cambiar carrera.

---

### Fase 2 — Árbol: nodos con glassmorphism + animación de unlock

**Dependencias**: Fase 1 (necesita `var(--accent-rgb)` para glassmorphism).

**Tareas**:
1. **`subjectsStore.ts`** — agregar `pendingUnlocks: string[]` + `setPendingUnlocks()` + `clearUnlock()`. Detectar transiciones `bloqueada → disponible_cursar` en `setUserSubjects` y `optimisticUpdate`.
2. **`SubjectNode.tsx`** — refactorizar visual completa:
   - Ancho: 160px → 180px
   - Glassmorphism: `backdrop-filter: blur(8px)` + `rgba(var(--accent-rgb), 0.08)` para estados disponibles
   - Texto secundario: `#8080A0` → `#9090B0` (accesibilidad)
   - `isPendingUnlock`: animación pulse 600ms con `useAnimate` → `clearUnlock(id)` al terminar
   - Text clamp: 2 → 3 líneas
3. **`useTreeLayout.ts`** — `NODE_WIDTH` 160→180, recalcular `COL_SPACING`, pasar `isPendingUnlock`
4. Test unitario: `pendingUnlocks` se popula correctamente al transicionar estado

**Criterio de done**: Marcar correlativa como aprobada → nodo desbloqueado hace el pulse de activación.

---

### Fase 3 — Árbol: edges con gradiente + paneles mejorados

**Dependencias**: Fase 1 (colores).

**Tareas**:
1. **`GradientEdge.tsx`** — custom edge con `<linearGradient>` SVG fuente→destino. Registrar en `edgeTypes`.
2. **`YearColumnNodes.tsx`** — panel con `rgba(var(--accent-rgb), 0.06)`, label con `rgba(var(--accent-rgb), 0.8)` y letter-spacing 1.5px. `HEADER_H` → 48px.
3. **`useTreeLayout.ts`** — incluir `sourceState` y `targetState` en `data` de los edges para que `GradientEdge` los consuma.
4. **`TreePage.tsx`** — registrar `GradientEdge` en `edgeTypes`, leyenda actualizada.

**Criterio de done**: Las edges del árbol muestran gradiente de color entre el estado del origen y el destino.

---

### Fase 4 — Dashboard: reorden + AvailableNowCard

**Dependencias**: ninguna (independiente de las fases del árbol).

**Tareas**:
1. **`AvailableNowCard.tsx`** — número grande de `disponible_cursar`, CTA a `/tree`, variante "0 disponibles".
2. **`DashboardPage.tsx`** — nuevo orden: PdfImportBanner → AvailableNowCard → progreso → StatCards → LevelCard.

**Criterio de done**: El número de materias disponibles es el primer dato visible al abrir el dashboard sin scroll.

---

### Fase 5 — Dashboard: milestones de celebración

**Dependencias**: Fase 4 (DashboardPage ya reordenado).

**Tareas**:
1. **`milestoneStore.ts`** — Zustand con `shownMilestones` (localStorage `correlativa:milestones`), `checkMilestone()`, `pendingMilestone`, `dismissMilestone()`.
2. **`MilestoneCelebration.tsx`** — modal con overlay, animación Framer Motion, emoji + frase + botón por milestone.
3. **`DashboardPage.tsx`** — `checkMilestone(progress.percentComplete)` en render, montar `<MilestoneCelebration />`.

**Criterio de done**: Al cruzar el 50% de materias aprobadas aparece el modal de celebración (solo una vez por umbral).

---

### Fase 6 — QA, performance y deploy

**Tareas**:
1. Audit de contraste de todos los colores nuevos
2. Verificar árbol con 120+ materias: <2s render
3. backdrop-filter en mobile: Chrome DevTools perf trace. Si hay jank → `@media (prefers-reduced-motion)` deshabilita blur.
4. Áreas táctiles leyenda ≥44px
5. `npm run build` + `npx vitest run` → todos pasan
6. Commit + push → Vercel deploya

---

## Orden de dependencias

```
Fase 1 (colores dinámicos)
  ├── Fase 2 (nodos glassmorphism + unlock)
  └── Fase 3 (edges + paneles)

Fase 4 (dashboard reorden)       ← independiente
  └── Fase 5 (milestones)

Fase 6 (QA) ← después de todo
```

---

## Criterios de aceptación global

- [ ] Árbol con 120 materias renderiza en <2s
- [ ] Nodos `disponible_cursar` tienen glassmorphism visible (diferencia notoria vs nodos bloqueados)
- [ ] Al desbloquear una materia, el nodo hace el pulse de activación (600ms)
- [ ] Edges muestran gradiente de color fuente→destino
- [ ] Color de acento cambia según la carrera activa (sin reload)
- [ ] Dashboard muestra "X materias disponibles" como primer elemento visible
- [ ] Modal de milestone aparece al cruzar 25/50/75/100% (una sola vez por umbral)
- [ ] Todos los textos principales pasan WCAG AA (4.5:1)
- [ ] Build limpio + tests existentes pasan
