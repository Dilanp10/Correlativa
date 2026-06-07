# Data Model: Rediseño UI/UX + Árbol Mejorado

**Feature**: `009-competitive-ui-redesign` | **Date**: 2026-06-07

---

## Cambios al schema de DB

**Esta feature NO modifica ninguna tabla de Supabase.** Todos los cambios son en capa de estado del cliente (Zustand) y en la presentación visual.

---

## Cambios al estado del cliente

### 1. `useSubjectsStore` — agregar `pendingUnlocks`

```typescript
// Nuevo campo en SubjectsStore
interface SubjectsStore {
  // ... campos existentes ...
  pendingUnlocks: string[]  // IDs de materias recién desbloqueadas (pendiente de animar)
  clearUnlock(subjectId: string): void
  setPendingUnlocks(ids: string[]): void
}
```

**Lógica de `setPendingUnlocks`**: Se calcula dentro de `setUserSubjects` y `optimisticUpdate` comparando los estados anteriores con los nuevos. Si un nodo pasa de `bloqueada` → `disponible_cursar`, su id se agrega a `pendingUnlocks`.

### 2. Nuevo store: `useCareerThemeStore` (Zustand, no persistido en DB)

```typescript
// src/features/tree/store/careerThemeStore.ts
interface CareerThemeStore {
  accentColor: string           // hex, default '#6C63FF'
  setAccentColor(hex: string): void
  applyTheme(): void            // inyecta CSS custom property en :root
}
```

**Paleta pre-aprobada** (contraste garantizado sobre `#0A0A0F`):
| Nombre | Hex | Contraste |
|--------|-----|-----------|
| Violeta (default) | `#6C63FF` | 5.1:1 ✅ |
| Cyan | `#22D3EE` | 10.2:1 ✅ |
| Naranja | `#F97316` | 6.8:1 ✅ |
| Verde esmeralda | `#10B981` | 5.6:1 ✅ |
| Rosa | `#EC4899` | 4.9:1 ✅ |
| Amarillo | `#EAB308` | 9.1:1 ✅ |

### 3. Nuevo store: `useMilestoneStore` (Zustand + localStorage)

```typescript
// src/features/dashboard/store/milestoneStore.ts
interface MilestoneStore {
  shownMilestones: number[]          // porcentajes ya mostrados [25, 50, 75, 100]
  pendingMilestone: number | null    // milestone listo para mostrar
  checkMilestone(percent: number): void
  dismissMilestone(): void
}
```

**Persistencia**: `shownMilestones` persiste en localStorage con key `correlativa:milestones`.
**Lógica**: `checkMilestone` recibe el porcentaje actual, compara con `shownMilestones`, si hay un umbral nuevo (25/50/75/100) lo pone en `pendingMilestone`.

---

## Entidades visuales nuevas / modificadas

### `CareerTheme` (solo cliente, no DB)
```typescript
interface CareerTheme {
  careerId: string
  accentColor: string  // de la paleta pre-aprobada
}
```
En v1 se define en código para las carreras del catálogo. Futuro: columna `accent_color` en tabla `careers`.

### `SubjectNodeData` — extendido
```typescript
// Agregar campo existente isPendingUnlock para animación
export interface SubjectNodeData {
  subject: SubjectWithCorrelatives
  treeState: TreeNodeState
  userStatus: SubjectStatus
  grade: number | null
  isPendingUnlock: boolean   // NUEVO: dispara animación de activación
}
```

---

## Estructura de archivos afectados / creados

```
src/
├── features/
│   ├── tree/
│   │   ├── components/
│   │   │   ├── SubjectNode.tsx          ← MODIFICAR: glassmorphism, tamaño, animación
│   │   │   ├── YearColumnNodes.tsx      ← MODIFICAR: panel mejorado, label sticky
│   │   │   └── GradientEdge.tsx         ← CREAR: edge con gradiente fuente→destino
│   │   ├── hooks/
│   │   │   └── useTreeLayout.ts         ← MODIFICAR: isPendingUnlock, nodo 200px
│   │   └── store/
│   │       └── careerThemeStore.ts      ← CREAR
│   ├── subjects/
│   │   └── store/
│   │       └── subjectsStore.ts         ← MODIFICAR: pendingUnlocks + setPendingUnlocks
│   └── dashboard/
│       ├── store/
│       │   └── milestoneStore.ts        ← CREAR
│       └── components/
│           └── MilestoneCelebration.tsx ← CREAR
├── pages/
│   ├── TreePage.tsx                     ← MODIFICAR: leyenda, GradientEdge registration
│   └── DashboardPage.tsx                ← MODIFICAR: "para cursar ahora" arriba, milestone
└── shared/
    └── constants/
        └── index.ts                     ← MODIFICAR: paleta de colores de acento
```
