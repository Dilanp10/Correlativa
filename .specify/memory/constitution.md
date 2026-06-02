# Correlativa Constitution

Principios rectores del proyecto Correlativa — app universitaria inteligente
para estudiantes argentinos. Estos principios guían todas las fases de
spec-driven development (specify → plan → tasks → implement) y tienen
precedencia sobre cualquier práctica ad-hoc.

## Core Principles

### I. Spec-Driven Development (NO NEGOCIABLE)
No se escribe código hasta que las specs del paso actual estén completas y
aprobadas. El flujo es estricto y en orden: PRD/spec → arquitectura/plan →
modelo de datos → contratos → tareas → implementación. Si una spec previa no
fue aprobada, no se avanza al siguiente paso. Ante una duda de producto, se
pregunta; no se asume.

### II. Mobile-First
Cada componente y pantalla se diseña primero para celular y luego se adapta.
La experiencia en pantalla chica es la prioridad. El árbol de correlativas
—núcleo diferencial de la app— debe sentirse increíble y funcionar bien en
mobile.

### III. Arquitectura Feature-First Desacoplada
El código se organiza por feature (`src/features/<feature>/` con
components/hooks/store/types). Las features no se importan entre sí: todo
código compartido vive en `shared/`. La UI nunca llama a Supabase directo —
siempre pasa por hooks o servicios. Sin archivos de 500+ líneas, sin
arquitectura monolítica.

### IV. TypeScript Estricto y Lógica Pura Testeable
TypeScript estricto, sin `any`. Componentes funcionales para UI; hooks para
lógica. La lógica de negocio crítica (cálculo de XP, rachas, estados del
árbol, scoring de quizzes) vive en funciones puras testeables con Vitest,
separadas del IO. Toda operación con Supabase maneja errores explícitamente.

### V. Estado Derivado y Optimistic UI
Cuando es posible, el estado se deriva del estado existente en vez de
persistir contadores redundantes (ej: XP y progreso se calculan, no se
acumulan). Esto garantiza idempotencia y reversibilidad. Las mutaciones del
usuario usan optimistic UI con rollback ante error.

## Stack y Restricciones Técnicas

- **Frontend:** React + Vite + TypeScript, TailwindCSS (utility-first, sin
  CSS-in-JS), Framer Motion (animaciones con propósito), Zustand (estado
  global), React Router v6.
- **Backend / BaaS:** Supabase (PostgreSQL, Auth, RLS). Backend propio solo
  vía Supabase Edge Functions cuando una API key no puede vivir en el front.
- **Hosting:** Vercel (frontend) + Supabase free tier. El proyecto debe
  mantenerse dentro de los límites gratuitos; cualquier costo se comunica
  antes de incurrirlo.
- **Seguridad:** Las credenciales nunca se commitean ni se exponen en el
  bundle del front. RLS por dueño en todas las tablas de datos de usuario.
- **Idioma:** Toda la UI en español argentino (vos), no neutro ni inglés.

## Flujo de Desarrollo

- Cada feature pasa por las fases SDD en orden, con aprobación del usuario
  entre fases.
- La lógica pura se cubre con tests antes de integrarla.
- Antes de cada entrega: `tsc --noEmit`, `vitest run` y `build` deben pasar.
- Los cambios se commitean y pushean solo cuando el usuario lo pide; el deploy
  de frontend es automático (Vercel), el de Edge Functions es manual.
- La separación entre progreso académico (solo materias aprobadas) y métricas
  de engagement (XP, nivel, racha) es deliberada y debe mantenerse.

## Governance

Esta constitución tiene precedencia sobre prácticas ad-hoc. Cualquier
desviación debe justificarse explícitamente y acordarse con el usuario. La
complejidad debe estar justificada (YAGNI: empezar simple). El archivo
`CLAUDE.md` complementa esta constitución con el contexto operativo y las
directrices de producto en detalle.

**Version**: 1.0.0 | **Ratified**: 2026-06-02 | **Last Amended**: 2026-06-02
