# Architecture.md — Correlativa v2

**Fecha:** 2026-06-05  
**Estado:** Borrador — pendiente aprobación  
**Basado en:** Architecture.md v1 (specs/002-mvp-core/plan.md)

---

## 1. Vista General del Sistema (v2)

```
┌──────────────────────────────────────────────────────────────────┐
│                           CLIENTE                                │
│                                                                  │
│   React + Vite + TypeScript                                      │
│                                                                  │
│  Features existentes        Features nuevas v2                   │
│  ┌──────────┐ ┌────────┐   ┌────────────┐ ┌──────────────────┐  │
│  │subjects/ │ │ tree/  │   │study-ai/   │ │  correlatives/   │  │
│  │          │ │        │   │ quiz       │ │  (tipo cursar/   │  │
│  │          │ │        │   │ resumen    │ │   rendir)        │  │
│  │          │ │        │   │ flashcards │ │                  │  │
│  └────┬─────┘ └───┬────┘   └─────┬──────┘ └────────┬─────────┘  │
│       │           │              │                  │            │
│  ┌────┴───────────┴──────────────┴──────────────────┴────────┐   │
│  │                        shared/                            │   │
│  │        components · hooks · lib/supabase · types          │   │
│  └────────────────────────────┬───────────────────────────────┘   │
└───────────────────────────────┼──────────────────────────────────┘
                                │ HTTPS
┌───────────────────────────────┼──────────────────────────────────┐
│                          SUPABASE                                │
│                                                                  │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────────────┐    │
│  │  Auth    │  │  PostgREST  │  │     Edge Functions       │    │
│  │  (JWT)   │  │  (REST API) │  │  ┌────────────────────┐  │    │
│  └──────────┘  └──────┬──────┘  │  │ generate-quiz      │  │    │
│                       │         │  │ parse-study-plan   │  │    │
│  ┌────────────────────┴──────┐  │  │ generate-summary   │  │    │
│  │       PostgreSQL          │  │  │ generate-flashcards│  │    │
│  │                           │  │  └────────┬───────────┘  │    │
│  │  [v1] users               │  └───────────┼──────────────┘    │
│  │  [v1] universities        │              │ HTTPS              │
│  │  [v1] careers             │  ┌───────────┴──────────────┐    │
│  │  [v1] subjects            │  │    GitHub Models API     │    │
│  │  [v1] user_subjects       │  │    (gpt-4o-mini, gratis) │    │
│  │  [v2] subject_correlatives│  └──────────────────────────┘    │
│  │       + columna type      │                                   │
│  │  [v2] quiz_sessions       │                                   │
│  │  [v2] flashcard_sets      │                                   │
│  │  [v2] flashcards          │                                   │
│  │  [v2] study_notes         │                                   │
│  └───────────────────────────┘                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Cambios al Stack

El stack de v1 **no cambia**. v2 solo agrega:

| Qué | Dónde | Por qué |
|---|---|---|
| 2 nuevas Edge Functions | Supabase | `generate-summary` y `generate-flashcards` |
| 1 nueva feature: `study-ai/` | `src/features/` | Encapsula quiz, resumen y flashcards |
| 1 nueva feature: `correlatives/` | `src/features/` | Lógica de tipo cursar/rendir |
| 4 nuevas tablas | PostgreSQL | Persistencia de IA de estudio |
| 1 nueva columna | `subject_correlatives` | Campo `type` |

---

## 3. Feature: Correlativas con tipo

### Cómo funciona

```
subject_correlatives
  subject_id          → la materia que tiene el requisito
  requires_subject_id → la materia que se necesita tener cumplida
  type                → 'para_cursar' | 'para_rendir'
```

**Reglas de desbloqueo del árbol:**

```
Estado del nodo = f(userSubject.status, correlativas)

disponible_cursar  → todas las correlativas para_cursar están en
                     status: regular | promocionada | aprobada

disponible_rendir  → todas las correlativas para_rendir están en
                     status: aprobada

cursando           → userSubject.status = 'cursando'
completada         → userSubject.status = 'aprobada' | 'promocionada'
bloqueada          → ninguna de las anteriores
```

**TreeNodeState extendido (v2):**
```
bloqueada | disponible_cursar | disponible_rendir | cursando | completada
```

### Flujo de datos

```
SubjectsStore (Zustand)
  └── treeStates: Record<subjectId, TreeNodeState>
        └── calculado en useSubjectsStore con la nueva lógica v2
              └── usa subject.requires[] con su tipo
```

### Impacto en componentes existentes

- `useSubjectsStore` → actualizar cálculo de `treeStates`
- `SubjectNode` → nuevo color/icono para `disponible_rendir`
- `TreePage` → actualizar leyenda
- `SubjectDetailSheet` → mostrar qué tipo de correlativa falta

---

## 4. Feature: IA de estudio

### Arquitectura de las Edge Functions

Todas las funciones de IA siguen el **mismo patrón** que `generate-quiz`:

```
Cliente
  → POST /functions/v1/generate-{summary|flashcards}
      headers: Authorization: Bearer <jwt>
      body: { subjectName, topic, text? }
  
  Edge Function (Deno)
      1. Validar JWT
      2. Construir prompt
      3. POST → GitHub Models API (gpt-4o-mini)
      4. Parsear y validar respuesta
      5. Retornar JSON tipado
```

**No se persiste el texto del usuario en el servidor.** Solo se persiste el resultado generado (resumen, flashcards).

### `generate-summary` (nueva)

**Input:**
```json
{ "subjectName": "Análisis Matemático I", "topic": "Integrales", "text": "..." }
```

**Output:**
```json
{
  "title": "Integrales — Resumen",
  "content": "...",
  "keyPoints": ["punto 1", "punto 2", "..."]
}
```

### `generate-flashcards` (nueva)

**Input:**
```json
{ "subjectName": "...", "topic": "...", "text": "...", "count": 10 }
```

**Output:**
```json
{
  "flashcards": [
    { "question": "...", "answer": "..." }
  ]
}
```

### `generate-quiz` (ya existe — se expande)

Actualmente existe pero puede no estar integrado en la UI. Se conecta al detalle de materia.

### Persistencia (Supabase)

```
quiz_sessions
  id, user_id, subject_id, topic, score, total, created_at

flashcard_sets
  id, user_id, subject_id, topic, created_at

flashcards
  id, set_id, question, answer, status ('nueva'|'aprendida'|'repasar'), reviewed_at

study_notes (resúmenes guardados)
  id, user_id, subject_id, topic, title, content, key_points[], created_at
```

### Nueva feature: `study-ai/`

```
src/features/study-ai/
├── components/
│   ├── StudyAISheet.tsx       — sheet que agrupa quiz, resumen, flashcards
│   ├── QuizSession.tsx        — flujo de pregunta → respuesta → feedback
│   ├── FlashcardDeck.tsx      — interfaz voltear carta (Framer Motion)
│   └── SummaryView.tsx        — muestra el resumen con key points
├── hooks/
│   ├── useQuiz.ts
│   ├── useFlashcards.ts
│   └── useSummary.ts
├── api/
│   ├── generateQuiz.ts
│   ├── generateFlashcards.ts
│   └── generateSummary.ts
└── types/
    └── index.ts
```

### Punto de entrada en la UI

Se abre desde `SubjectDetailSheet` (ya existe) con un botón "Estudiar con IA 🤖". Abre un segundo sheet o un tab dentro del mismo sheet.

---

## 5. Flujo de datos completo (IA de estudio)

```
Usuario toca "Estudiar con IA" en SubjectDetailSheet
  → StudyAISheet se abre
  → usuario elige: Quiz | Resumen | Flashcards
  → ingresa tema (texto libre, ej: "Integrales")
  → opcionalmente pega texto de un apunte
  
  → hook (useQuiz / useSummary / useFlashcards)
      → llama a api/ correspondiente
          → POST Edge Function
              → GitHub Models API
              → respuesta JSON validada
          → resultado en estado local
  
  → UI muestra resultado
  → usuario puede guardar (opcional) → INSERT en Supabase
```

---

## 6. Migración desde v1

### Compatible hacia atrás

- La columna `type` en `subject_correlatives` tiene **default `'para_cursar'`** → las correlativas existentes siguen funcionando sin cambios.
- Los `treeStates` existentes se recalculan con la nueva lógica pero el comportamiento visible es idéntico para quien no haya seteado `para_rendir`.
- No hay breaking changes en el schema ni en la API.

### Migración SQL necesaria

```sql
-- Solo una línea de cambio en schema
ALTER TABLE subject_correlatives
  ADD COLUMN type TEXT NOT NULL DEFAULT 'para_cursar'
  CHECK (type IN ('para_cursar', 'para_rendir'));
```

---

## 7. Decisiones técnicas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| GitHub Models (gratis) para IA | Claude API / OpenAI pagos | Sin costo hasta escalar a público |
| Edge Functions para IA | Llamada directa desde cliente | No exponer el token de GitHub Models en el cliente |
| `study-ai/` como feature separada | Meter en `study/` existente | `study/` ya maneja sesiones de estudio (Pomodoro/timer). La IA es un concepto diferente |
| `correlatives/` feature nueva | Meter en `subjects/` | Separación de responsabilidades; la lógica de tipo es compleja |
| Sheet sobre SubjectDetailSheet | Página nueva | Menos fricción; el usuario ya está en contexto de la materia |

---

## 8. Lo que NO cambia de v1

- Stack (React, Vite, TS, Tailwind, Framer Motion, Zustand, React Router)
- Supabase Auth (mismo sistema de JWT)
- Hosting (Vercel + Supabase free tier)
- Todas las features existentes (árbol, agenda, rachas, logros, sesiones, import PDF)
- Arquitectura feature-first
- Reglas de código (sin `any`, hooks para lógica, etc.)

---

*Pendiente aprobación antes de continuar con Database-Spec.md*
