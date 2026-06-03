# Implementation Plan: Logros y Medallas

**Branch**: `001-logros-medallas` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-logros-medallas/spec.md`

## Summary

Capa de logros coleccionables derivada del estado existente del usuario
(materias, sesiones de estudio, racha, nivel). Sin tablas nuevas: una función
pura evalúa un catálogo fijo de logros contra el estado y devuelve cuáles están
desbloqueados. Una galería los muestra (conseguidos a color, bloqueados con
pista) y un watcher a nivel App celebra los desbloqueos nuevos, replicando el
patrón ya probado de `LevelUpWatcher` + `LevelUpOverlay`.

## Technical Context

**Language/Version**: TypeScript estricto (sin `any`), React 18 + Vite.

**Primary Dependencies**: TailwindCSS, Framer Motion, Zustand, React Router v6.

**Storage**: Ninguno nuevo. Lee de stores existentes (subjects, sessions,
streak) y de la lógica de gamificación. Sin tablas, sin migraciones, sin RLS.

**Testing**: Vitest sobre la lógica pura (catálogo + evaluador de logros).

**Target Platform**: Web mobile-first (se ve en celular y desktop centrado).

**Project Type**: Single-project SPA, arquitectura feature-first.

**Performance Goals**: Evaluación de logros O(n) sobre materias + sesiones;
imperceptible. Sin fetches nuevos (reusa datos ya cargados).

**Constraints**: Idempotente y reversible (derivado del estado). Capa de
engagement separada del progreso académico. Español argentino.

**Scale/Scope**: ~1 feature nueva (`src/features/achievements/`), ~12-15
logros en el catálogo, 1 pantalla/sección de galería, 1 watcher + 1 overlay.

## Constitution Check

*GATE: Debe pasar antes de Phase 0. Re-chequear tras Phase 1.*

| Principio (constitution) | Cumple | Notas |
|---|---|---|
| I. Spec-Driven Development | ✅ | Esta feature nace del flujo speckit (spec → plan → tasks → implement). |
| II. Mobile-first | ✅ | La galería se diseña para celular; overlay festivo full-screen. |
| III. Feature-first desacoplada | ✅ | Nueva `features/achievements/`; no importa otras features (lee stores vía hook, patrón ya usado por gamification). |
| IV. TypeScript estricto + lógica pura testeable | ✅ | Catálogo + evaluador en `lib/`, puros, con tests Vitest. |
| V. Estado derivado | ✅ | Logros 100% derivados del estado, sin persistencia. Idempotente y reversible. |
| Stack y restricciones | ✅ | Sin tablas/SQL/RLS. Solo front. |
| Separación engagement vs progreso | ✅ | Los logros no tocan `computeCareerProgress`. |

**Resultado**: PASA. Sin violaciones que justificar.

## Project Structure

### Documentation (this feature)

```text
specs/001-logros-medallas/
├── spec.md              # qué/por qué (ya creado)
├── plan.md              # este archivo
├── research.md          # decisiones técnicas
├── data-model.md        # entidades (derivadas, no persistidas)
├── quickstart.md        # cómo probar
├── contracts/
│   └── achievements.contract.md   # tipos + firma de la lógica pura
└── checklists/
    └── requirements.md  # checklist de calidad de la spec
```

### Source Code (repository root)

```text
src/
├── features/
│   └── achievements/                  # NUEVA feature
│       ├── lib/
│       │   ├── achievements.ts        # catálogo + evaluador puro
│       │   └── achievements.test.ts   # tests Vitest
│       ├── hooks/
│       │   └── useAchievements.ts      # combina stores → estado de logros
│       └── components/
│           ├── AchievementsGallery.tsx # galería (grid de medallas)
│           ├── AchievementBadge.tsx    # una medalla (conseguida/bloqueada)
│           ├── AchievementUnlockOverlay.tsx  # celebración festiva
│           └── AchievementWatcher.tsx  # detecta desbloqueos nuevos (App-level)
├── pages/
│   └── ProfilePage.tsx                # se integra la galería acá (ver research D2)
└── App.tsx                            # monta <AchievementWatcher /> (App-level)
```

**Structure Decision**: Feature nueva autocontenida en
`src/features/achievements/`, espejando la estructura de `gamification/` y
`streaks/`. La galería se integra en `ProfilePage` (no se agrega una 6ª tab al
BottomNav). El watcher se monta una vez en `App.tsx` junto al `LevelUpWatcher`.

## Complexity Tracking

> Sin violaciones de constitución. No aplica.
