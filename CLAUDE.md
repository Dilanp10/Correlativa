# CLAUDE.md — Correlativa
## App Universitaria Inteligente

---

## ⚠️ REGLA ABSOLUTA — LEER ANTES DE HACER CUALQUIER COSA

**NO escribas código hasta que todas las specs del paso actual estén completas y aprobadas.**

El flujo es SDD (Spec-Driven Development). Cada paso debe completarse en orden.
Si el usuario no aprobó la spec anterior, no avanzás al siguiente paso.
Si tenés dudas sobre algo, preguntás. No asumís.

---

## Contexto del Proyecto

**Nombre:** Correlativa  
**Tipo:** App universitaria para estudiantes argentinos  
**Problema que resuelve:** Estudiantes desorganizados que no entienden su carrera, no saben qué pueden cursar, no visualizan su progreso y se desmotivan.  
**Inspiración del creador:** Ex estudiante de Ingeniería en Informática (UNCA). La app que hubiera querido tener.  
**Estado actual:** Proyecto desde cero. Sin código. Sin base de datos. Sin infraestructura.

---

## Visión del Producto

La app debe sentirse como un **sistema operativo universitario**, no una agenda.

Debe generar en el usuario:
- "Entiendo mi carrera."
- "Sé qué puedo cursar ahora."
- "Estoy avanzando."
- "Estudiar se siente más llevadero."

Referentes de experiencia: Duolingo (gamificación), Linear (velocidad y UI), Steam (progreso visual), Notion (organización), Arc Browser (personalidad).

---

## Stack Tecnológico Definido

### Frontend
- **React + Vite + TypeScript**
- **TailwindCSS** — utilidades CSS
- **Framer Motion** — animaciones
- **Zustand** — estado global
- **React Router v6** — navegación

### Backend / BaaS
- **Supabase** — base de datos, auth, storage, realtime
- PostgreSQL vía Supabase
- Supabase Auth (email/password + OAuth Google)
- Supabase Storage (materiales de estudio, fase 2)

### Hosting (gratuito en v1)
- **Vercel** — frontend
- **Supabase free tier** — backend y base de datos

### IA (fase 2 — no implementar en MVP)
- Arquitectura preparada para OpenAI / Gemini / Claude API + RAG
- No implementar en v1

### Herramientas de desarrollo
- ESLint + Prettier
- Husky (pre-commit hooks)
- Vitest (testing unitario)

---

## MVP — Alcance v1

El MVP tiene un foco claro: **Sistema de Carrera + Árbol de Correlativas.**

Sin esto, el resto no existe. Es el núcleo diferencial de la app.

### Features del MVP

1. **Auth** — registro, login, logout (Supabase Auth)
2. **Perfil de usuario** — nombre, universidad, carrera seleccionada
3. **Catálogo de carreras** — carreras pre-cargadas + opción de carga manual
4. **Gestión de materias** — estados, notas, correlativas
5. **Árbol de correlativas interactivo** — visualización tipo skill tree
6. **Progreso de carrera** — porcentaje, materias desbloqueadas, estadísticas básicas

### Fuera del MVP (fase 2)
- Agenda inteligente
- IA de estudio (RAG, flashcards, quiz)
- Gamificación completa (XP, niveles, achievements)
- Sistema motivacional / anti-estrés
- Modo final
- Notificaciones

---

## Modelo de Datos Simplificado (MVP)

### Decisiones de diseño tomadas:
- Las correlativas en v1 son **simples** (una sola relación, sin distinción cursar/rendir)
- La distinción correlativa-para-cursar vs correlativa-para-rendir se modela en v2
- Las carreras pueden ser **pre-cargadas** (por el equipo) o **creadas manualmente** por el usuario

### Entidades principales:
- `users` — perfil, universidad, carrera activa
- `universities` — catálogo de universidades argentinas
- `careers` — carreras por universidad (pre-cargadas + custom)
- `subjects` — materias de una carrera (pre-cargadas + custom)
- `subject_correlatives` — relación entre materias (tabla de unión)
- `user_subjects` — estado del usuario en cada materia (cursando, aprobada, etc.)

### Estados de materia (user_subjects.status):
```
no_cursada | cursando | regular | promocionada | aprobada | final_pendiente | libre
```

### Estados visuales del árbol:
```
bloqueada | disponible | cursando | completada
```

---

## Arquitectura de Carpetas (feature-first)

```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   └── types/
│   ├── career/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   └── types/
│   ├── subjects/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   └── types/
│   └── tree/
│       ├── components/
│       ├── hooks/
│       ├── store/
│       └── types/
├── shared/
│   ├── components/    — UI reutilizable (Button, Modal, Card, etc.)
│   ├── hooks/         — hooks genéricos
│   ├── lib/           — supabase client, utils
│   ├── types/         — tipos globales
│   └── constants/
├── App.tsx
└── main.tsx
```

**Reglas de arquitectura:**
- UI nunca llama directo a Supabase. Siempre pasa por hooks o servicios.
- Cada feature es independiente. No importa entre features directamente.
- `shared/` es el único lugar de código compartido entre features.
- No hardcodear strings, IDs ni lógica de negocio en componentes.

---

## UX/UI — Directrices

### Identidad visual
- **Mood:** Oscuro, moderno, con acentos vibrantes. No corporativo. No pastel.
- **NO hacer:** dashboards enterprise, tablas aburridas, tonos grises planos
- **SÍ hacer:** UI que se sienta como un videojuego de progreso académico

### Árbol de correlativas
- Visualización tipo **skill tree / RPG path system**
- Nodos con colores por estado, conexiones dinámicas, animaciones suaves
- Debe sentirse **satisfactorio** desbloquear una materia
- Mobile-first: el árbol debe funcionar bien en pantalla chica

### Performance UX
- Optimistic UI donde sea posible
- Transiciones suaves (Framer Motion)
- Sin pantallas en blanco: usar skeletons
- Mobile-first en todo

---

## Flujo SDD Obligatorio

Claude Code debe ejecutar este flujo **en orden estricto**:

### Paso 1 — PRD.md
Documento de producto. Define:
- problema, usuarios, propuesta de valor
- features del MVP con criterios de aceptación
- métricas de éxito
- lo que está fuera de scope

### Paso 2 — Architecture.md
Arquitectura técnica. Define:
- diagrama de componentes
- flujo de datos
- decisiones técnicas y por qué
- trade-offs del stack elegido

### Paso 3 — Database-Spec.md
Esquema de base de datos. Define:
- todas las tablas con columnas y tipos
- relaciones y foreign keys
- índices
- RLS policies de Supabase
- migraciones iniciales en SQL

### Paso 4 — UX-Spec.md
Especificación de experiencia. Define:
- flujos de usuario (onboarding, árbol, gestión de materias)
- estados de UI por pantalla
- edge cases de UX
- comportamiento del árbol interactivo

### Paso 5 — API-Contracts.md
Contratos de datos. Define:
- queries y mutations de Supabase (no REST genérico)
- tipos TypeScript de cada entidad
- responses esperados
- manejo de errores

### Paso 6 — Implementation-Plan.md
Plan de implementación. Define:
- orden de desarrollo por feature
- dependencias entre tareas
- criterios de "done" por tarea
- qué no tocar hasta v2

### Paso 7 — Implementación
Recién acá se escribe código.
Orden sugerido: setup → auth → db → career selector → subjects → tree.

---

## Reglas de Código

### Generales
- TypeScript estricto. Sin `any`.
- Componentes funcionales. Sin clases.
- Hooks para lógica. Componentes solo para UI.
- Nombres descriptivos. Sin abreviaciones crípticas.
- Comentarios solo cuando el "por qué" no es obvio. No comentar el "qué".

### Supabase
- Nunca llamar a Supabase directo desde un componente.
- Centralizar queries en `src/shared/lib/supabase/` o en hooks de feature.
- Siempre manejar errores de Supabase explícitamente.
- Usar tipos generados por Supabase CLI.

### Estado
- Zustand para estado global (user, career, subjects).
- Estado local (useState) para UI efímera.
- No duplicar estado entre Zustand y props.

### Estilo
- TailwindCSS utility-first.
- Sin CSS-in-JS ni styled-components.
- Variables de diseño en `tailwind.config.ts` (colores, fuentes, etc.).
- Framer Motion solo para animaciones con propósito. No animar por animar.

---

## Contexto Argentina

- Las carreras universitarias argentinas tienen correlativas complejas. En v1 simplificamos: una materia desbloquea a otra sin distinguir tipo de correlativa.
- El sistema de estados de materia refleja la realidad argentina: regular, libre, promocionado son conceptos locales relevantes.
- Las universidades pre-cargadas deben incluir al menos las nacionales principales (UBA, UTN, UNCA, UNC, UNLP, UNL, UNMDP, UNSAM).
- El lenguaje de la UI debe ser en español argentino. No español neutro. No inglés.

---

## Lo que Claude Code NO debe hacer

- Escribir código antes de terminar las specs del paso actual.
- Asumir decisiones de producto no documentadas. Preguntar primero.
- Mezclar lógica de negocio con componentes de UI.
- Usar `any` en TypeScript.
- Implementar features de v2 en v1 (agenda, IA, gamificación completa).
- Crear arquitectura monolítica o archivos de 500+ líneas.
- Hardcodear strings, rutas o IDs.
- Ignorar el manejo de errores.
- Hacer UI genérica, corporativa o aburrida.

---

## Lo que Claude Code SÍ debe hacer

- Seguir el flujo SDD sin saltear pasos.
- Preguntar cuando algo no está claro en vez de asumir.
- Documentar decisiones de diseño y el razonamiento detrás.
- Priorizar simplicidad sobre ingeniería prematura.
- Pensar en mobile-first en cada componente.
- Hacer que el árbol de correlativas se sienta increíble. Es el core.

---

## Primer Comando

Cuando el usuario diga "arrancá" o "empezá":

1. Confirmá que leíste este archivo y entendiste el proyecto.
2. Arrancá con el **Paso 1: PRD.md**.
3. No hagas nada más hasta que el PRD esté aprobado.
